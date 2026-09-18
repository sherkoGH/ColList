---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality for ColList. Use this skill when building web components, pages, visual artifacts, or dashboards for the ColList university match platform. Generates creative, polished React/Tailwind code that strictly avoids generic AI aesthetics.
license: MIT
---

# Frontend Design Skill: ColList Aesthetic & System Directive

This skill guides the creation of distinctive, production-grade frontend interfaces for **ColList** — an AI-powered full-funding university navigator for 10th graders through gap-year reappliers.

---

## 1. Aesthetic Identity & Anti-"AI Slop" Directives

### The ColList Design Identity
- **Tone:** Academic Luxury meets Modern Tech Precision (Ivy-League editorial feel blended with dynamic SaaS responsiveness).
- **Dominant Visual Anchor:** High-contrast layout rooted in Deep Slate (`#0B0F17`), Academic Navy (`#1E293B`), Emerald Accent (`#10B981`), and Warm Amber (`#F59E0B`).
- **Hero & Canvas Mechanics:** Real photo integration (`public/enhanced_stanf.png`) with smooth dark gradient overlays, animated multi-phrase headlines over sky sections, and prominent CTAs anchored over lawn surfaces.
- **Micro-Interactions:** Custom glassmorphism cards (`backdrop-blur-xl bg-slate-900/80 border-slate-800`), smooth layout shifts via Framer Motion, and infinite continuous logo marquees.

### STRICT NEVER-LIST (Anti-AI Slop)
1. **NEVER** use generic system font fallbacks or overused fonts like *Inter*, *Roboto*, *Arial*, or *Space Grotesk*. Opt for refined pairings like *Cinzel* / *Playfair Display* for academic headings combined with *Plus Jakarta Sans* or *Outfit* for crisp UI body text.
2. **NEVER** default to generic bright purple/pink gradients on plain white backgrounds.
3. **NEVER** leave dead-end screens or empty card states without actionable, human-readable AI diagnostic feedback.
4. **NEVER** use plain text tables for multi-variable university comparisons; use interactive, badge-driven comparison cards and matrix columns.
5. **NEVER** generate placeholder "lorem ipsum" or dummy text without realistic full-funding university data (CDS stats, Need-Blind indicators, stipend details).

---

## 2. Spatial Composition & Component Guidelines

### Stanford Hero Backdrop (`components/Hero.tsx`)
- Implement responsive object-cover horizontal clipping over `enhanced_stanf.png`.
- Overlay gradient (`from-slate-950/85 via-slate-950/50 to-slate-950/90`) to guarantee contrast across desktop and mobile screens.
- Dynamic rotating text phrase: `"Get accepted into [Ivy League / T20 US Colleges / Asian Tech Hubs / NYU Abu Dhabi / Full-Ride LACs]"`.

### Integrated UI Components
- **Language Selector:** Integrate `components/ui/language-selector-dropdown.tsx` with English (`en`) and Russian (`ru`) support.
- **Theme Toggle:** Integrate `components/ui/sky-toggle.tsx` utilizing `styled-components` for smooth day/night mode transitions.
- **Logo Carousel:** Infinite horizontal continuous marquee (`@keyframes marquee`) rendering high-res university badges/logos inspired by *mychance.ai*.
- **ASCII Art Block:** Include a subtle, monochrome ASCII representation of a classical university archway in monospace font (`text-emerald-500/30`) above the footer.

---

## 3. Data & State Reactivity

- **Full-Funding Guarantee:** Every display card must emphasize financial aid status (*100% Need-Blind*, *Full-Tuition + Stipend*, *Merit Full-Ride*).
- **Dynamic Recalculation:** Changing any questionnaire response (e.g., GPA 3.8 → 4.0, SAT 1350 → 1520, 10th Grade → Gap Year) must trigger visible state changes across the **Starting Point Diagnostic**, **8-College Matrix**, and **Admission Roadmap**.
- **Source Transparency:** Include explicit verified tags (`CDS 2025/2026 Verified`) or `"Demo Data"` badges on all university admission metrics and deadlines.