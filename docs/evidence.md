# Evidence — portfolio

Recorded 2026-10-27 on the staged tree. Windows, Node v24.18.0, npm 11.16.0. `helm/reviewer` has not signed the current tree, so nothing below claims a PASS it did not issue. Each `Index:` is `git write-tree` at the moment of recording; later edits move the hash on, and the handoff hash is the one quoted in the review brief.

## M-01 — PASS (provisional, 2026-10-27)

**Acceptance** (`docs/IMPLEMENTATION_PLAN.md` M1 + `docs/OPENCODE_TASK.md`): Daniel's identity, positioning and navigation replace the reference author's; koi scene and borrowed motifs absent; nav is Home/Projects/About with no unfinished routes; no `daoho.dev`, `Dao-Ho`, original email/social handles or logos in public UI or metadata.

**Changed:** `src/app/{layout,page,not-found}.tsx`, `src/app/about/page.tsx`, `src/app/components/*`, `src/app/data/{profile,projects,status}.ts`, `src/app/globals.css`, `public/projects/*/preview.svg`, app shell (`package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc.json`), `README.md`, `docs/REFERENCE.md`, `docs/evidence/*.png`.

**Gates** (run on the staged tree, output seen):

- `npx tsc --noEmit` → exit 0, no diagnostics
- `npm run lint` → exit 0, `eslint .` clean
- `npm run build` → exit 0, 13/13 static pages; `/`, `/about`, `/projects`, `/icon.svg`, `/_not-found`, 7 SSG paths under `/projects/[slug]`
- `npm run format:check` → exit 0

**Behavior** (production `next start` on :3001, Chromium 1248, 1440×900 and 360×740, after the taste pass):

- 10 routes → 200 (`/`, `/projects`, seven `/projects/<slug>`, `/about`); `/projects/does-not-exist` → 404 with one `h1`
- Status labels measured visible (non-zero box, `visibility: visible`, `opacity: 1`): home 3/3, `/projects` 7/7, each detail page 2/2 (meta row + current status) — same at 360
- No horizontal overflow on any route at either width; one `h1` per route; zero dead links (`href` missing or `#`), zero external links
- Fonts: only `/_next/static/media/*.woff2` — Geist Sans, Geist Mono, Instrument Serif (normal + italic). **Zero** requests to `fonts.googleapis.com` or `gstatic`.
- Keyboard at 1440: skip link → wordmark → Home → Projects → About → Selected work → About me → All 7 → each project row; `outline: solid 2px` at every stop
- Mobile menu: `aria-expanded` false→true with 3 links, Escape closes and returns focus to the toggle
- `prefers-reduced-motion`: baseline `.page-enter` `animation-name: page-in`, with the preference forced `none` — both directions measured on the same build
- Console: no errors, no hydration mismatch in a clean Chromium profile. (A mismatch does appear in Daniel's own Chrome — `data-darkreader-*` on `<html>` and `clickup-chrome-ext_installed` on `<body>` are injected by browser extensions, not by app code.)

**Negative:** two real failures earlier in the build, not edited assertions. The build failed on `src/app/projects/[slug]/page.tsx:9` (`Cannot find module '@/app/lib/layout'` after the shell moved to `src/lib/layout.ts`, plus stale `.next/types`) — tsc exit 2 until both were fixed. `src/app/data/projects.ts` was also double-encoded (U+00E2 in all seven descriptions, BOM), so the shipped copy was mojibake; the rendered-text check was red on it and green after the rewrite.

**Review:** `helm/reviewer` pass 3 — **provisional PASS**, withheld only because that pass ran out of steps before finishing its browser sweep. Behaviour re-measured here on the post-taste tree.

**Open:** screen-reader announcement pass and JS-disabled rendering `UNVERIFIED`; deploy not attempted.

## M-02 — PASS (content scope), artwork still open

**Acceptance** (M2 + `OPENCODE_TASK`): the seven supplied projects from `docs/BRAND_AND_CONTENT.md`; status visible on both breakpoints and on detail pages; detail pages render context/role/approach/artifacts/outcome/status from data; placeholder media explicitly labelled; no unverified launches, metrics, demo links or invented screenshots.

**Changed:** `src/app/data/{projects,status}.ts`, `src/app/components/{project-row,project-preview,status-label,prose}.tsx`, `src/app/projects/page.tsx`, `src/app/projects/[slug]/page.tsx`.

**Corrective pass after review:**

- Invented specifics removed — Americorp's polymer grade list, "technical sales materials" and "LinkedIn" claims; StreamLnk's guessed `Next.js` stack and "packaging, customs, agent" scope; ISR's "Google Ads". Copy now traces to the brand doc's safe descriptions.
- Guessed years `2026` replaced with `Ongoing` (NFD, Helm, MyWiki); the other four stay `TBD`. No start year asserted anywhere.
- Authoring notes that had leaked into reader-facing prose ("Do not publish…", "Verify…", "Only include…", "Add the…", "What to document") rewritten as honest "Where it stands" copy.
- `Prose` / `StoryBlock` declarations rewritten as `TextRun` / `RichText` / `CaseStudyBlock`, so no type code is copied from the unlicensed reference.
- `README.md` replaced; footer year derived instead of hardcoded; "Seven projects" reads from `projects.length`.

**Behavior:** `Ongoing` on three rows and `TBD` on four; every preview carries a "Placeholder artwork — not a screenshot" caption, and the artwork itself says `PLACEHOLDER`; detail pages state that no real screenshots, diagrams or metrics are published; prev/next walks all seven; unknown slug 404s.

**Negative:** the rendered-text assertion was red against the pre-fix data (`HDPE, LDPE, LLDPE, PP and PVC`, `technical sales materials`, `LinkedIn marketing calendars`, `year: "2026"`) and green after. Real defect, not an edited test.

**Review:** `helm/reviewer` pass 3 — **UNPROVEN** at the time, because M2's "replace temporary SVGs with real evidence" clause depends on Daniel's artwork and dates, not on code. The code and copy scope is met; that clause stays open and cannot be closed here.

**Open:** real media, verified dates, live URLs, client permissions.

## Taste pass — 2026-10-27 (post-review redesign)

Daniel rejected the first build: "I told you to inspire by Dao-Ho/portfolio … it's elegant, it's simple, it's smart." This pass rebuilds the visual system around that read, without borrowing anything from the unlicensed reference.

**Changed:** `src/app/globals.css` (tokens `#f4f2ec` paper / `#161917` ink / `#4f7d71` accent / `#dcd6c9` rule, `.display`/`.display-italic`, `.annotation`, `.row-rule`, reduced-motion killswitch), `src/app/layout.tsx` (Instrument Serif via `next/font/local` from `@fontsource/instrument-serif`), `page.tsx` (two-column hero), `components/node-field.tsx` (new canvas), `site-header.tsx`, `site-footer.tsx`, `status-label.tsx`, `project-row.tsx`, `project-preview.tsx`, `projects/page.tsx`, `projects/[slug]/page.tsx`, `about/page.tsx`, `not-found.tsx`, all seven `public/projects/*/preview.svg`.

**Design decisions:** one committed idea per screen (a drifting node field on the hero, ink-only, accent lines to the pointer, static and animation-free under reduced motion); self-hosted Instrument Serif for display, Geist for body, Geist Mono for annotations; hairline rules as the only chrome; placeholders re-drawn as light plates so no fake artwork is the loudest thing on a page.

**Gates:** identical, on the post-taste tree — `npx tsc --noEmit` 0, `npm run lint` 0, `npm run build` 0, `npm run format:check` 0.

**Behavior:** the sweep above was run after this pass (routes, chips, overflow, keyboard, mobile menu, reduced motion, fonts). Screenshots in `docs/evidence/` are from this build at 1440 and 360.

**Open:** `helm/reviewer` has not seen the post-taste tree — its PASS covers the earlier layout.

## Test classes — honest accounting

No automated test suite exists in this repo. Proof is gate commands plus a scripted browser E2E over the production build (integration/E2E class). Config-only assertions are not counted as behaviour. Nothing outside the walked routes is covered.

## Review record (2026-10-27)

Three read-only `helm/reviewer` passes ran; two exhausted their step budget before the behavioural sweep, so their findings are recorded without a verdict.

- Pass 1 found the real content defects: invented ISR "Google Ads", Americorp polymer grades and "LinkedIn calendars", a guessed StreamLnk stack, three guessed `2026` years, and `Prose`/`StoryBlock` declarations copied verbatim from the unlicensed reference. All fixed.
- Pass 2 found authoring notes leaking into reader-facing copy and a hardcoded "Seven projects". All fixed.
- Pass 3 reached the browser: 11 routes × 2 widths, titles correct, one `h1` each, zero overflow, zero console errors, self-hosted fonts only, no authoring-voice strings, keyboard order and mobile-nav/Escape correct. Verdict: **M-01 provisional PASS**, **M-02 UNPROVEN** on the artwork clause.

Open and deliberately not closed: screen-reader announcement pass, JS-disabled rendering, real media, verified dates, domain and OG image.
