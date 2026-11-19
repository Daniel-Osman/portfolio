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

## Phase 0 launch — repo and Vercel (2026-11-19)

**Scope:** no feature work. The existing tree to a live site: ledger migration committed, `metadataBase` set, repo pushed, Vercel production deploy, live verification. Custom domain not attached (blocked, see below).

**Changed:** `src/app/layout.tsx` (`metadataBase: new URL("https://danielosman.com")`, the only source edit), `AGENTS.md` / `NOW.md` / `README.md` / `docs/OPENCODE_TASK.md` (ledger now `tasks/todo.md`), `feature_list.json` deleted, `tasks/plan.md` + `tasks/todo.md` added, `NOW.md` + `INDEX.md` refreshed. `npm run format` realigned the README table and both task files.

**Commits:** `080665f` ledger migration, `77cdb51` metadataBase. A push to `Daniel-Osman/portfolio` `main` created the repo (`gh repo create --public --source=. --remote=origin --push`).

**Gates** (this tree, output seen; Windows, Node 24.18.0):

- `npx tsc --noEmit` -> exit 0
- `npm run lint` -> exit 0
- `npm run build` -> exit 0, 13/13 static pages: `/`, `/_not-found`, `/about`, `/icon.svg`, `/projects`, 7 SSG paths under `/projects/[slug]`. The first invocation printed the same table then exited 1 with `SecurityFatalError` (Next 16.4.3 security advisory, retry prompt); the retry exited 0. Re-run on the `metadataBase` tree: exit 0.
- `npm run format:check` -> exit 0 (was exit 1 on three files before `npm run format`)

**Deploy:** Vercel CLI 59.9.1, account `daniel-osman`, team `daniel-osmans-projects`, project `portfolio` created from this directory and connected to the GitHub repo. `vercel deploy --prod` -> `readyState: READY`, `dpl_2hnEow6CMaCkT79E6MpPoydHvhXC`, production alias `https://portfolio-seven-orpin-35j0cxyw5s.vercel.app`.

**Live checks** (production alias, 2026-11-19):

- `/`, `/projects`, `/about`, `/projects/helm` -> 200; `/projects/does-not-exist`, `/nope` -> 404 with one `h1`
- TLS: `curl ssl_verify_result=0`, HSTS present
- Clean Chromium (Playwright, `channel=chrome`, no extensions), each of the five routes in its own context: request origins = the site only, no `fonts.googleapis.com` or `gstatic`; console empty, page errors empty, failed requests empty. The 404 route logs one network error, which is Chrome reporting the intentional 404 status.
- Daniel's own Chrome showed three `fonts.googleapis.com/css2` requests (Inter, Roboto, Roboto Mono) that are absent from the served HTML and from the clean profile — injected by a browser extension, as with the `data-darkreader` note above.

**Domain, blocked:** `vercel domains add danielosman.com portfolio` -> `domain_not_owned` (403); the CLI only adds domains already owned or proven by DNS. No Cloudflare credential exists on this machine, so no zone record was changed. Measured state: apex A/AAAA none, `www` none, MX `route1/2/3.mx.cloudflare.net`, apex TXT `v=spf1 include:_spf.mx.cloudflare.net ~all`, `mail.danielosman.com` none, no `_vercel` or `_dmarc`. The Vercel dashboard path could not be used either: `https://vercel.com/api/stream/internal` returns `ERR_BLOCKED_BY_CLIENT` in Daniel's Chrome, so the Domains page stays on its skeleton.

**Open:** the custom domain and its certificate, the real-domain re-check, contact URLs, OG image, real media, and a review of the current (pond) tree.

## Contact Phase 1 — page, form and send path (2026-11-20)

**Spec:** `docs/CONTACT_SPEC.md`. **Ledger:** F-13…F-15.

**Changed:** `src/lib/contact-rules.ts` (limits, `isEmail`, `validateContact`, `buildEmail`), `src/lib/contact-send.ts` (`sendWithResend`, injectable `fetch`), `src/app/api/contact/route.ts` (Node, JSON + form-encoded, honeypot, 2.5 s gate, per-IP throttle, 400/429/503/502/504), `src/app/contact/page.tsx` (server page, `force-dynamic`), `src/app/components/{site-nav,contact-form}.tsx`, `top-nav.tsx` + `mobile-nav.tsx` (fourth item), `.env.example`, `.gitignore` (`!.env.example`), `docs/CONTACT_SPEC.md`, ledgers.

**Gates** (Windows, Node 24.22.3, production build; output seen):

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → exit 0 on the retry (the first invocation printed the route table then exited 1 with the known `SecurityFatalError`; retry exited 0). Route table: 15 pages, `/contact` **ƒ** and `/api/contact` **ƒ**.
- `npm run format:check` → exit 0
- Payload/rules script (`.next/contact-send-check.mjs`, throwaway, fake `fetch`, no dependency): 38 checks, `ALL CHECKS PASSED` — subject `New enquiry — … — …`, `reply_to` = visitor, `to` array, labelled text, escaped HTML, `rejected` on 422, `unconfirmed` on transport error and abort.

**API, `next start`, key deliberately absent** (`x-real-ip` set per case):

| Case                                           | Result                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| valid JSON                                     | `503 not_configured`                                               |
| valid form-encoded                             | `503 not_configured`                                               |
| message 9 chars                                | `400` + `errors.message`                                           |
| honeypot filled                                | `200 {"ok":true}` — no send (a fall-through would have 503'd)      |
| `elapsedMs` 100                                | `200 {"ok":true}`                                                  |
| `elapsedMs` 2500                               | `503` — boundary is inclusive, as specified                        |
| malformed JSON / non-object JSON / array field | `400 bad_request`                                                  |
| six valid calls, one IP                        | five answered, sixth `429 rate_limited`                            |
| valid call with a deliberately wrong key       | `502 send_failed` from a real `https://api.resend.com/emails` call |

**Browser, production `next start` at 1440×900 and 360×740** (Playwright, fresh profile):
Focus order: skip link → pond → projects → about → contact → theme → name → email → phone → topic → 3 radios → message → send. Honeypot `tabIndex -1`, inside `aria-hidden`. One `h1` per page; `scrollWidth - innerWidth = 0` at both widths.
Empty submit: 5 inline errors, `aria-invalid` on 4 controls + `aria-describedby` on all 5 groups, `role="status"` announces "5 fields need attention.", focus lands on `#name`.
Layout stability: submit button `top` 964 → 964 at 1440 (doc 1166 → 1166); 1060 → 1060 at 360 (doc 1291 → 1291); every reserved error line measures 18 px, one line, at 360.
Failure with `CONTACT_TO` set: 502 → "The message did not send. Your text is still here. Email inbox@danielosman.com and I will reply from there.", `href="mailto:inbox@danielosman.com"`, all typed values preserved. Failure with `CONTACT_TO` unset: same copy without the address or the link.
Throttle: after five calls from the browser's own bucket, submit → "Too many messages just now. Try again in a few minutes. Email inbox@danielosman.com and I will reply from there."
Mobile nav at 360: menu lists pond / projects / about / contact, `contact` marked "here".
Console: 0 messages on load; the only entry after a failed submit is Chrome's own record of the intentional 502, as with the 404 note above. Reduced motion: `main` animation `none`. Light and dark both rendered.

**Negative:** `/contact` was prerendered at build, so `fallbackAddress()` baked in the build-time (empty) env and the `mailto:` never rendered in production even with `CONTACT_TO` set. Fixed with `export const dynamic = "force-dynamic"` and re-verified (`/"copy":true,"mailto":"mailto:inbox@danielosman.com"`). Also: `validateContact` judged untrimmed input, so a name of spaces passed — the script caught it, and validation now trims first.

**Open / unproven:** no key exists here, so **no real email was sent and the success state was never rendered**; delivery is unproven end to end. The 504 "could not confirm" copy is not exercised live (it needs a hung Resend). Preview deployment only; nothing promoted.

**Deploy (preview only, 2026-11-20):** branch `contact/phase-1` pushed; `vercel deploy --yes` → `dpl_d8g8mmvbg`, `target: preview`, state Ready, https://portfolio-d8g8mmvbg-daniel-osmans-projects.vercel.app. Preview URLs are protected (`all_except_custom_domains`): anonymous `GET /contact` → 302 to `vercel.com/sso-api`, anonymous `POST /api/contact` → 401. Through `vercel curl --deployment …`: `GET /contact` → 200 with the full form and `fallbackAddress: null`; `POST /api/contact` (valid body) → `503 {"ok":false,"error":"not_configured"}`, exactly as expected with no env set. `main` was **not** pushed, because the Vercel Git integration turns a `main` push into a production deployment.

## R-01 - page loop removed (2026-11-20, `0bb9a09`)

**Scope:** bounded revert of the UI half of `332671a`. `PageNav` (a shared page loop) left the four top-level pages; project detail pages keep the `Project navigation` they already had.

**Changed:** `src/app/components/page-nav.tsx` **deleted**; `src/app/page.tsx`, `src/app/components/about-view.tsx`, `src/app/contact/page.tsx` lost the `PageNav` block and its import; `src/app/components/projects-view.tsx` lost it from both branches and got its desktop layout back - `main` `flex h-full flex-col justify-center pt-12`, `DesktopStrip` rendered directly (no `flex flex-1` wrapper, no `max-w-[56rem]`/`pb-8` block), strip tile back to `h-[min(62vh,42rem)]` with the `[@media(max-height:820px)]` override dropped. Kept on purpose: the home hero `contact` link that replaced "contact pending", and the about sentence pointing at `/contact`. `projects-view.tsx` and `contact/page.tsx` are byte-identical to their pre-`332671a` blobs; `git diff a4dfd8e` shows only the two kept copy changes, in `page.tsx` and `about-view.tsx`. 5 files, +4 / -80.

**Gates** (Windows, Node 24.22.3, final tree):

- `npx tsc --noEmit` -> exit 0
- `npm run lint` -> exit 0
- `npm run build` -> exit **1**, then exit **0** on the retry. The first run compiled, type-checked, generated 14/14 static pages and printed the route table (17 entries; `/contact` and `/api/contact` dynamic), then hit `SecurityFatalError: Your version of Next.js is affected by a known security vulnerability` - the standing Next 16.4.3 advisory documented in `NOW.md` Gates, not this change. The retry printed the same table and exited 0.
- `npm run format:check` -> exit 0

**Production `next start` on :3111** (3001 was already held by another process on this box; Daniel's Chrome over `browse`, DOM measured after hydration - the top-level pages render nothing in the pre-hydration HTML because they wait on `useGlobal`):

| Route            | `aria-label="Page navigation"` | Other                                                                                        |
| ---------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `/`              | 0                              | hero line `projects/about/contact`, `contact` -> `/contact`; no "contact pending"            |
| `/projects`      | 0                              | desktop `main` `flex h-full flex-col justify-center pt-12`; tile 558 px = `62vh` at 1440x900 |
| `/about`         | 0                              | "The contact form comes straight to me...", `contact form` -> `/contact`                     |
| `/contact`       | 0                              | form renders, no nav block below it                                                          |
| `/projects/helm` | 0                              | `Project navigation` present: `<- Americorp International` and `NFD Express ->`              |

Layout: 1440x900 - `scrollWidth` 1440 = `clientWidth`, no horizontal overflow, tile left 272 / width 837, tile centre 424 px against a 450 px viewport centre (the `pt-12` offset, the same geometry as before `332671a`). 360x800 - `scrollWidth` 360 = `clientWidth` on all four routes, zero overflowing node in `main` (`/contact` reports only the honeypot parked at `-9999px`). Console, errors only, across all five routes: 5 entries, every one from Daniel's own extension (`chrome-extension://mbnbe.../inspector.b9415ea5.js`, "Permissions policy violation: unload is not allowed in this document"); zero page-origin errors.

**Deploy:** committed `0bb9a09` on `main`, pushed; the Vercel Git integration built production. `dpl_ERucsag7BMvVwsPVV1Lj5AuwrDs7`, `target: production`, status **Ready** at 01:44:08 +0200, build log line `Cloning github.com/Daniel-Osman/portfolio (Branch: main, Commit: 0bb9a09)`, aliases `https://danielosman.com`, `https://www.danielosman.com`, `portfolio-seven-orpin-35j0cxyw5s`, `portfolio-daniel-osmans-projects`, `portfolio-git-main-daniel-osmans-projects`. Live `curl` on `https://danielosman.com`: `/`, `/projects`, `/about`, `/contact`, `/projects/helm` -> **200**; `ssl_verify_result=0`; `www.danielosman.com` -> 308 to the apex; the `portfolio-daniel-osmans-projects.vercel.app` alias answers 302 (it redirects to the domain). The same DOM checks were repeated live: `/projects` 0 page navs, tile 558 px = `62vh`, no overflow; `/projects/helm` project nav with both neighbours; `/` hero `projects/about/contact`.

**Honest note:** the Next 16.4.3 security advisory still makes the **first** `npm run build` exit non-zero on every run; the retry is what exits 0. The pinned version is Daniel's call and was not touched here. Nothing else is unproven.
