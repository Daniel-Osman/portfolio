# Implementation plan mapped to Dao-Ho/portfolio

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

## Milestone 1 — rebrand shell

- [ ] Secure reuse permission or implement original design independently.
- [ ] Replace intro, name, navigation, social links and OG metadata.
- [ ] Remove koi scene or replace it with an original, inexpensive visual system; avoid recreating author-identifying motifs.
- [ ] Navigation is Home, Projects, About; do not expose unfinished routes.
- [ ] Remove original author's images, company logos and employment citations from public content.
- [ ] Ensure no `daoho.dev`, `Dao-Ho`, original email/social handles or other original personal information remains in produced assets or metadata.

## Milestone 2 — project content

- [ ] Replace `projects.ts` with the supplied data.
- [ ] Confirm dates and public project names/roles before final publication.
- [ ] Make a status label visible **both** on desktop cards and mobile cards, and on the detail page. This requires small changes to the project route components (added `status` field).
- [ ] Replace temporary SVGs with **real evidence** (screens, diagrams, permitted campaign samples).
- [ ] Make project detail pages display the existing `page.story` paragraphs; allow projects with no `link` or deployed site.
- [ ] Remove any non-working demo buttons.

## Milestone 3 — quality, SEO and release

- [ ] Update `src/app/layout.js` metadataBase after domain confirmed; add canonical, OG image, robots and favicon.
- [ ] Add author/client-approved site links; never guess domain, GitHub username or email.
- [ ] Check reduced-motion and accessibility keyboard behavior, including project strip and lightbox.
- [ ] Check for any missing direct dependencies (the reference source imports `next-themes`, so audit the lockfile and package.json); check framework/dependency compatibility.
- [ ] Decide on analytics privacy and consent before collecting visitor data; audit PostHog/autocapture settings.
- [ ] Test mobile 360px, tablet 768px, desktop 1440px, keyboard, dark/light, and no JavaScript where practical.
- [ ] Run `npm ci`, `npm run lint`, `npm run build`. Validate each route and verify zero borrowed copy/assets remain.
- [ ] Deploy to preview; publish only after your approval.

## Optional Milestone 4 — personal differentiators

- `Lab`: diagrams and short explanations for AI agents, AEC workflows, product experiments; clear R&D labels.
- `Notes`: 3 strong technical essays, not an empty blog.
- Interactive project/system map with accessibility fallback and low-motion mode.
- Event tracking only for meaningful actions: project view, case-study depth, validated contact actions.

## Editorial release gate

For every project, check: **Permission, Role, Status, Evidence, Dates, Links, Confidentiality**. A portfolio with three substantiated case studies is stronger than seven generic claims.
