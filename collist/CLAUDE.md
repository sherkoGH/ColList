# CLAUDE.md — ColList System Architecture & Developer Guidelines

Behavioral guidelines and technical guardrails for building **ColList** — the 100% full-funding university navigator for 10th-12th graders and gap-year reappliers.

---

## 1. Core Operating Principles

### Think Before Coding
- **State Assumptions First:** Before editing code, state assumptions explicitly in 1-2 bullet points.
- **Modular Sprints:** Build brick-by-brick. Do not dump multi-component implementations in a single file unless explicitly instructed.
- **Ask on Ambiguity:** If a state flow or component integration is ambiguous, stop and ask before generating code.

### Simplicity & Precision First
- **No Speculative Abstractions:** Implement only what is specified for the current build sprint.
- **Surgical Changes:** Edit only target files. Clean up imports/variables created during your current changes, but touch no pre-existing code unnecessary to the task.
- **Zero AI Slop:** Adhere strictly to `.claude/skills/frontend-design.md` for layout, color, typography, and UX polishing.

---

## 2. Technical Stack & Structure

- **Framework:** Next.js 14+ (App Router), React, TypeScript.
- **Styling & UI:** Tailwind CSS (v3/v4), Shadcn UI architecture (`/components/ui/`), Framer Motion, Lucide Icons, Styled-Components (for Sky Toggle).
- **AI Integration:** Google Gemini API (Free tier via `@google/genai` or direct API calls) for Campus Vibe Checks, Custom Uni Evaluation, and Real Admission Case Benchmarks.
- **Dataset:** Local structured JSON (`/data/universities.json`) containing 50–100 full-funding global/regional universities categorized into **Safety (2)**, **Target (3)**, and **Dream (3)** buckets based on Common Data Set (CDS) parameters.
- **Internationalization:** Dual Language (`en` / `ru`) UI support via custom dropdown state or i18n dictionary.

---

## 3. Mandatory Component Hierarchy