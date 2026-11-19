# Tasks - portfolio

**Project:** daniel-osman-portfolio
**Source:** `tasks/plan.md` (milestones 1-2) + `docs/OPENCODE_TASK.md` acceptance criteria
**Plan:** `tasks/plan.md` - the milestones this ledger was cut from; it supersedes `docs/IMPLEMENTATION_PLAN.md`, kept in `docs/` as the dated source record.
**Project gate** (from `AGENTS.md` Commands and `NOW.md` Gates, not per feature): `npm ci` -> `npx tsc --noEmit` -> `npm run lint` -> `npm run build` -> `npm run format:check`, then a browser pass on `next start` at 1440 and 360.

**Migration exception (2026-11-15):** F-01-F-09 came from a JSON that named no per-feature command. They carry `Verify: -` and are unresolved against `shipwright/AGENTS.md` Gates until a command is recorded for each.

- [x] **F-01** - App shell: pinned Next.js, TypeScript, Tailwind, lint and format
    - Acceptance: package.json pins Next 16.4.3/React 19.3.0/Tailwind 4.3.3; tsconfig strict; eslint flat config; prettier with 4-space project habit; dev script uses port 3001.
    - Verify: -
    - Files: -
- [x] **F-02** - Self-hosted Geist Sans + Geist Mono
    - Acceptance: Fonts load from the geist npm package, never fonts.googleapis.com; dev HTML and network evidence show no Google Fonts request.
    - Verify: -
    - Files: -
- [x] **F-03** - Root layout, metadata and brand tokens
    - Acceptance: layout.tsx carries Daniel's title template, description and Open Graph base with no invented domain/email; globals.css defines #F5F3EE/#1B211F/#508478 tokens and focus-visible + reduced-motion rules.
    - Verify: -
    - Files: -
- [x] **F-04** - Home page
    - Acceptance: Eyebrow, heading, intro, supporting line, primary CTA to /projects, secondary to /about, and a restrained project teaser; no borrowed koi/art motifs.
    - Verify: -
    - Files: -
- [x] **F-05** - Desktop and mobile navigation
    - Acceptance: Home/Projects/About only; keyboard reachable in order, visible focus, aria-current, mobile menu aria-expanded/controls and Escape close; prefers-reduced-motion respected.
    - Verify: -
    - Files: -
- [x] **F-06** - Projects index at /projects
    - Acceptance: All seven projects from typed data; visible status label on desktop and mobile; no unlaunched demo buttons or missing links.
    - Verify: -
    - Files: -
- [x] **F-07** - Project detail at /projects/[slug]
    - Acceptance: Context, role, approach, artifacts, outcome and current status rendered from data; story paragraphs shown once; placeholder media explicitly labelled; no invented metrics, screenshots or links; 404 for unknown slug.
    - Verify: -
    - Files: -
- [x] **F-08** - About page
    - Acceptance: Three-paragraph brand-doc draft, capabilities from the brand doc, only verified links; no fabricated contact details.
    - Verify: -
    - Files: -
- [x] **F-09** - Quiet editorial polish
    - Acceptance: Inline link treatment, consistent hairline/status system, cheap page-enter transition disabled under reduced motion, responsive 360/1440 layouts.
    - Verify: -
    - Files: -
- [x] **F-10** - Quality gates and browser smoke test
    - Acceptance: npm ci, npm run lint, npx tsc --noEmit and npm run build exit 0 on the final tree; every route checked at 1440 and 360 with keyboard order and reduced motion; evidence recorded in NOW.md.
    - Verify: -
    - Files: -
