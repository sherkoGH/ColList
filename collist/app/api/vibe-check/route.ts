import { NextResponse } from "next/server";

import type { UserProfile } from "@/context/UserContext";
import universities from "@/data/universities.json";
import type { University } from "@/lib/matcher";
import {
  evaluateQualitativeFallback,
  getQualitativeRecord,
  isValidVibeCheck,
  type VibeCheck,
} from "@/lib/qualitativeEvaluator";

// Google retires model ids without notice, so this is overridable from the
// environment: a retirement becomes a .env.local edit, not a code change.
// Note the surface is v1, not v1beta — current models 404 on v1beta.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 12000;

const SYSTEM_INSTRUCTION = `You assess university campus culture for international students from Central Asia and the CIS who require 100% financial aid.
Return ONLY JSON matching this shape:
{
  "vibeMatchIndex": number 0-100,
  "dimensions": { "academicIntensity": number, "collaboration": number, "globalPrestige": number, "internationalInclusivity": number, "workLifeBalance": number },
  "stressIndex": number 0-100,
  "pulse": [{ "en": string, "ru": string }],
  "pros": [{ "en": string, "ru": string }],
  "tradeoffs": [{ "en": string, "ru": string }]
}
Exactly 3 pros and exactly 2 tradeoffs. Every string must be present in both English and Russian.
Be concrete and honest; name real trade-offs rather than softening them.`;

function buildPrompt(university: University, profile: UserProfile) {
  const record = getQualitativeRecord(university.id);
  return [
    `University: ${university.name} (${university.location}).`,
    `Funding model: ${university.fundingType}. Tags: ${university.tags.join(", ")}.`,
    `Student: grade ${profile.gradeLevel}, GPA ${profile.gpa.toFixed(2)}/4.0, strongest record tier ${profile.ecTier},`,
    `${profile.activities.length} activities and ${profile.honors.length} honors logged, field of interest: ${profile.majorInterest || "undecided"}.`,
    record
      ? `Reference baseline (adjust rather than ignore): ${JSON.stringify(record.dimensions)}.`
      : "",
    `Tailor the pros and tradeoffs to this student's field and record.`,
  ]
    .filter(Boolean)
    .join(" ");
}

async function askGemini(
  apiKey: string,
  university: University,
  profile: UserProfile,
): Promise<VibeCheck | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt(university, profile) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      }),
    });

    if (!response.ok) {
      // Surface the reason server-side. Silently swallowing this is what makes
      // a misconfigured model or an expired key look identical to "no key".
      const detail = await response.text().catch(() => "");
      console.warn(
        `[vibe-check] Gemini ${response.status} for model ${GEMINI_MODEL}: ${detail.slice(0, 200)}`,
      );
      return null;
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return null;

    const parsed = JSON.parse(text);
    // Model output is untrusted: only a shape-valid reply reaches the UI.
    if (!isValidVibeCheck(parsed)) {
      console.warn("[vibe-check] Gemini reply failed shape validation; using fallback.");
      return null;
    }

    return { ...parsed, universityId: university.id, source: "gemini" };
  } catch (error) {
    // Timeout, network failure, quota, malformed JSON — all fall through to
    // Mode B, but say why in the server log.
    console.warn(`[vibe-check] Gemini call failed: ${(error as Error)?.message ?? error}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  let body: { universityId?: string; profile?: UserProfile };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const university = (universities as University[]).find((u) => u.id === body.universityId);
  if (!university) {
    return NextResponse.json({ error: "Unknown university." }, { status: 404 });
  }
  if (!body.profile) {
    return NextResponse.json({ error: "Missing profile." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const live = await askGemini(apiKey, university, body.profile);
    if (live) return NextResponse.json(live);
  }

  // Mode B. Reached when no key is configured, or the call failed for any
  // reason — the feature never degrades to an error state.
  return NextResponse.json(evaluateQualitativeFallback(university, body.profile));
}
