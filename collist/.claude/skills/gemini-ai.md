---
name: gemini-ai
description: Guidelines for integrating the free Google Gemini API into ColList for dynamic campus sentiment checks, custom university evaluation, and real admission case benchmarking.
license: MIT
---

# Google Gemini API Integration Directive

## Target AI Features in ColList

1. **Campus Vibe Check (`/api/vibe-check`):**
   - **Input:** University Name.
   - **Prompt Target:** Parses public discussions/forums (e.g., Reddit consensus, student feedback) to return a structured JSON response with 3 fields: `campusCulture`, `internationalStudentSupport`, `stressLevelAndWorkload`.

2. **Custom Full-Funding Evaluator (`/api/evaluate-uni`):**
   - **Input:** User-submitted University Name + User Starting Profile (GPA, SAT, IELTS, Grade).
   - **Prompt Target:** Analyzes if the institution offers 100% full-ride/full-tuition aid to international/regional students and outputs a match rating (`Safety`, `Target`, or `Dream`) with a 2-sentence rationale based on CDS standards.

3. **Real Admission Cases Benchmark (`/api/admission-cases`):**
   - **Input:** Target University + Major.
   - **Prompt Target:** Generates 2 anonymized historical acceptance benchmarks (e.g., "Accepted applicant from CIS region: GPA 3.9, SAT 1510, Full Need-Met Aid granted").

## Structural Constraints
- Always use system instructions in Gemini API calls to demand strict JSON formatted outputs (`response_mime_type: "application/json"`).
- Include graceful fallback mock data inside `/data/mock-ai-responses.ts` in case the API key is missing or encounters quota limits during live demos.