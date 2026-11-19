# OpenCode task — Daniel portfolio rebrand

You are implementing Daniel Osman's personal portfolio. Use the existing Addy Osmani engineering skills process. Follow the user's **Helm** workspace architecture: Helm is the sole user-facing captain/router; delegate implementation to Shipwright and independent verification to Reviewer; do not alter global AGENTS.md or workspace-level `.opencode/` except through Helm. The build worker must not approve its own work.

## Premise and rights

The original inspiration is `https://github.com/Dao-Ho/portfolio`. As of the inspection, no license was declared. **Do not clone and redistribute this source until the user confirms appropriate permission.** If not permitted, independently implement a similar minimal editorial Next.js portfolio using the original content in this starter, without copying protected source or assets.

## Mission

Build a credible, distinctive personal website for Daniel Osman: independent full-stack developer and AI systems builder, with experience in business operations and marketing. Treat the project's **status and evidence** as mandatory; never invent launch status, clients' performance figures, or demo URLs.

## Inputs

Read `README.md`, `docs/BRAND_AND_CONTENT.md`, `tasks/plan.md`, `src/app/data/profile.ts`, `src/app/data/projects.ts`, and SVG placeholders. These form the content source of truth.

## Scope

1. Apply original replacement components and profile copy; remove the existing owner's identity, artwork, links, tracking IDs and image assets from public pages.
2. Preserve or reproduce accessible large project visuals and detailed case-study storytelling.
3. Use Home / Projects / About for launch, with current-project status chips.
4. Load project data from a central typed source; avoid duplicated home copy per breakpoint.
5. Add real media only when user supplies it. Placeholder graphics must explicitly say they're placeholders.
6. Validate with unit/type/lint/build checks where available, and browser smoke-test desktop/mobile.
7. Separate privacy-sensitive PostHog configuration; do not transmit secrets or personal data to third parties.
8. Produce a before/after changeset and proof for each acceptance criterion. No commit, push, merge or deploy without explicit user approval.

## Acceptance criteria

- Home displays Daniel Osman and the new positioning, with CTA to `/projects` and `/about`.
- Projects list includes NFD Express, Helm, Americorp, StreamLnk, ISR, MyWiki, Tasteology. No unverified launches claimed.
- Each detail page includes role, situation, approach and current status or honest indication that evidence is pending.
- No navigational links to empty Gallery or Blog routes.
- No original owner's personal branding or data remain in public UI and metadata.
- All essential links work; missing personal URLs are omitted.
- Mobile and desktop layouts are functional; reduced-motion is respected.
- Lint/build pass; independent reviewer records PASS/FAIL/UNPROVEN, with observed command output.

## Exclusions

No unapproved deployments, purchases, client asset publication, analytics tracking, mass rewriting of unrelated projects, or fabricated visuals. Proceed stepwise, report blockers to Helm and request missing facts at the content approval gate.
