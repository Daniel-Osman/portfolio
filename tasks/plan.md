# Implementation Plan: Daniel Osman - portfolio

This supersedes `docs/IMPLEMENTATION_PLAN.md` on 2026-11-15, which stays in `docs/` as the
dated source record. The project keeps one ledger
(`tasks/todo.md`) and one plan (this file). The milestones' checkboxes became the ledger's
tasks: Milestone 1-2 shipped as F-01...F-10 there. Items with no task of their own are listed
under **Open release obligations** as plain bullets - they are untracked work for the next
planning pass, deliberately not checkboxes, so nothing competes with the ledger.

This describes changes in a permissioned copy of the repo, **not modifications to the author's repository**.

## Original repo observed structure (October 2026)

- `src/app/page.tsx`: full-screen hero plus koi pond canvas.
- `src/app/components/front-page.tsx`: desktop and mobile intro copy, cited employer cards, personal social accounts.
- `src/app/data/sources.ts`: author's workplaces / citation-card metadata.
- `src/app/data/projects.ts`: typed project entries, detail-page `story` and `Shot` media schema.
- `src/app/projects/page.tsx`: desktop horizontal strip; mobile vertical stack.
- `src/app/projects/[slug]/page.tsx` + `project-page.tsx`: detailed case-study routes.
- `src/app/gallery/page.tsx`: author's personal artwork and lightbox.
- `src/app/blog/page.tsx`: currently a coming-soon screen.
- `src/app/components/top-nav.tsx` + `mobile-nav.tsx`: navigation and original identity.
- `src/app/layout.js`: SEO metadata and analytics providers.
- `tailwind.config.ts`: warm light/dark palettes; `src/app/globals.css`: page transitions and link treatments.

## Milestone 1 - rebrand shell (shipped)

Delivered as F-01...F-05: pinned app shell, self-hosted fonts, root layout and brand tokens,
home page, navigation. Reuse permission was resolved by building an original design instead of
copying one, and `docs/REFERENCE.md` records the constraint. The koi scene and the author's
motifs, images, logos, citations, domain, email and handles are absent from the produced tree.

## Milestone 2 - project content (shipped)

Delivered as F-06...F-09: typed project data with a visible status label on cards and detail
pages, story paragraphs rendered once, no non-working demo buttons, placeholder media labelled
as placeholder. What the milestone also asked for - real evidence, confirmed dates, permissions

- is not engineering and remains open below.

## Milestone 3 - quality, SEO and release (partly shipped)

Delivered as F-09...F-10: reduced motion, keyboard order, 360 and 1440 passes, `npm ci`,
`npm run lint`, `npx tsc --noEmit`, `npm run build` green on the final tree, quoted in
`NOW.md` and `docs/evidence.md`. Domain, OG image, analytics and deploy remain open.

## Optional Milestone 4 - personal differentiators (not started)

- `Lab`: diagrams and short explanations for AI agents, AEC workflows, product experiments; clear R&D labels.
- `Notes`: 3 strong technical essays, not an empty blog.
- Interactive project/system map with accessibility fallback and low-motion mode.
- Event tracking only for meaningful actions: project view, case-study depth, validated contact actions.

## Open release obligations

Untracked. They need Daniel (facts, permission, money, deploy), not a build slice. Listed in
full so nothing from the original plan is lost.

- Secure written reuse permission, or keep the independent design and record that decision.
- Confirm dates and public project names/roles before final publication.
- Replace temporary SVGs and labelled placeholder plates with real evidence: screens, diagrams, permitted campaign samples.
- Confirm the domain, then set `metadataBase`; add canonical, OG image, robots and favicon.
- Add author- and client-approved site links; never guess domain, GitHub username or email.
- Audit the lockfile and `package.json` for missing direct dependencies (the reference source imports `next-themes`); check framework/dependency compatibility.
- Decide analytics privacy and consent before collecting visitor data; audit PostHog/autocapture settings.
- Prove tablet 768, dark/light and the no-JavaScript path; 360, 1440 and keyboard are already recorded.
- Deploy to preview; publish only after Daniel's approval.

## Editorial release gate

For every project, check: **Permission, Role, Status, Evidence, Dates, Links, Confidentiality**.
A portfolio with three substantiated case studies is stronger than seven generic claims.
