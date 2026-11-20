# NOW — portfolio

**Status:** built, merged to `main` and deployed. Next 16.4.3 + React 19 + Tailwind 4: Home (the pond) / `/projects` / seven `/projects/[slug]` case studies / `/about` / `/contact` / 404. Contact Phase 1 is merged to `main` (`a4dfd8e`) and live at https://danielosman.com/contact; `/api/contact` is dynamic. The three env vars are set in Vercel for Production and Preview — `RESEND_API_KEY`, `CONTACT_FROM` (`Daniel Osman <hello@danielosman.com>`) and `CONTACT_TO` (`daniel@danielosman.com`), which doubles as the public `mailto:` fallback. Delivery is **proven end to end**: one real enquiry went through the live form on 2026-11-20 and returned `{"ok":true}`, and Resend accepted a separate sender test for `hello@danielosman.com`. The pond draws its fish as round pixels (`ca5395f`): one arc per cell at radius `cell * 0.72`, centre still snapped with `Math.round`, pellets square. Repo `github.com/Daniel-Osman/portfolio`, Vercel project `portfolio` under `daniel-osmans-projects`; the `ca5395f` deployment is production, state **Ready**, aliased to `https://danielosman.com`. `metadataBase` is `https://danielosman.com`. The shared page loop that `332671a` added to four top-level pages is **gone** (`0bb9a09`), shipped to production; only the project detail pages keep their `Project navigation`. `https://danielosman.com` **does answer** now: 200 on all five routes on 2026-11-20, certificate valid, `www` 308 → apex. The DNS table below is the 2026-11-19 measurement and was not re-measured.

**Next:** no blockers. Three open items, none urgent. (1) Real project media and permissions — M-02's artwork clause: screenshots, dates and client permission; nothing is invented to fill it. (2) The Next 16.4.3 security upgrade — the pin is Daniel's call, and the advisory makes the first `npm run build` exit 1 on most runs. (3) F-19 — project detail pages ship an empty `<body>` server-side, because `project-view.tsx` returns `null` until `isMobile` resolves on the client, so crawlers and no-JS visitors get no case-study content while metadata still renders. F-12 owes only the `MX` / SPF / `mail` record re-check.

**Verified 2026-11-20** (round fish pixels, `ca5395f`, production build of the final tree): `npx tsc --noEmit` exit 0, `npm run lint` exit 0, `npm run build` exit **0** on the first run, `npm run format:check` exit 0. Direct draw timing per frame at 1440: 0.603 ms with square cells → 0.634 ms with circles; inside noise at 360. Radius chosen from enclosed-pinhole counts at 1440: 9102 at 0.58, 1191 at 0.64, 102 at 0.68, 39 at 0.70, 23 at 0.71, 12 at 0.72 — a square lattice needs `cell/√2 ≈ 0.707` to close, so 0.72 is the first value clear of it. Deployment `ca5395f`: `target: production`, state **Ready**, aliased to `https://danielosman.com`. Home checked live in Daniel's Chrome at 1440 and 360: pond runs, fish bodies solid, zero page errors. Evidence: `docs/evidence.md` R-02.

**Verified 2026-11-20** (page loop removed, `0bb9a09`, production build of the final tree): `npx tsc --noEmit` exit 0, `npm run lint` exit 0, `npm run build` exit **1** then **0** on the retry (route table 17 entries, 14/14 static pages — the non-zero first run is the known Next 16.4.3 `SecurityFatalError` advisory, not this change), `npm run format:check` exit 0. `next start` on :3111 (3001 was held by another process) in Daniel's Chrome: `aria-label="Page navigation"` appears **0** times on `/`, `/projects`, `/about`, `/contact`; `/projects/helm` keeps `aria-label="Project navigation"` with `← Americorp International` and `NFD Express →`. Home hero still reads `projects/about/contact` with `contact` → `/contact`; about still renders "The contact form comes straight to me…" with the `contact form` link → `/contact`. `/projects` desktop: `main` is `flex h-full flex-col justify-center pt-12`, tile 558 px = `62vh` at 1440x900, `scrollWidth` 1440 = `clientWidth`, tile centre 26 px below the viewport centre (the `pt-12` offset, as before `332671a`). At 360: `scrollWidth` 360 = `clientWidth` on all four routes, no overflowing node (`/contact` excepted only by the honeypot parked at `-9999px`). Console: zero page-origin errors; the five entries are Daniel's own Chrome extension (`chrome-extension://mbnbe.../inspector.b9415ea5.js`, "Permissions policy violation: unload"). Deployment `dpl_ERucsag7BMvVwsPVV1Lj5AuwrDs7` → status **Ready**, `target: production`, build log `Commit: 0bb9a09`, aliased to `https://danielosman.com`. Live: `/`, `/projects`, `/about`, `/contact`, `/projects/helm` → **200** on `https://danielosman.com`, `ssl_verify_result=0`, `www` 308 → apex; the same three page checks repeated live. The ledger commit `897b5bd` (docs only) rebuilt the same code tree (`dpl_6QBV4JbUXBoFMv7n8pwRHMSh8DVY`, production, Ready) and the five routes answered 200 again, so production serves `main` and `main`'s code is `0bb9a09`. Evidence: `docs/evidence.md`.

**Verified 2026-11-20** (contact Phase 1, branch `contact/phase-1`, production build of the working tree): `npx tsc --noEmit`, `npm run lint`, `npm run build` (15 pages; `/contact` and `/api/contact` dynamic) and `npm run format:check` all exit 0. A fake-`fetch` script pinned the Resend payload (subject, `reply_to`, text, escaped HTML) in 38 checks. On `next start`: `400` for bad bodies and fields, silent `200` for honeypot and sub-2.5 s posts, `429` on the sixth call, `503` with the key absent, `502` from a real Resend call with a wrong key. Browser at 1440 and 360: 5 inline errors announced and focused, zero layout shift across every outcome, `mailto` fallback present only when `CONTACT_TO` parses, mobile nav lists `contact`. No page errors; the only console entry after a failed submit is Chrome's record of the intentional 502. Evidence and full numbers in `docs/evidence.md` and `docs/CONTACT_SPEC.md`.

**Verified 2026-11-19** (production, Vercel build of `77cdb51`): `npx tsc --noEmit`, `npm run lint`, `npm run build` (13/13 static pages, 7 SSG project paths) and `npm run format:check` all exit 0. Live on the `*.vercel.app` production alias: `/`, `/projects`, `/about`, `/projects/helm` → 200; `/projects/does-not-exist` and `/nope` → 404 with one `h1`; certificate valid (`curl ssl_verify_result=0`); a clean Chromium profile on all five routes loads **no origin other than the site itself** (zero `fonts.googleapis.com`, zero `gstatic`) and logs zero console errors, zero page errors, zero failed requests. The only console entry is Chrome's own record of the intentional 404 document. Evidence: `docs/evidence.md`.

## Gates

`npm ci` → `npx tsc --noEmit` → `npm run lint` → `npm run build` → `npm run format:check`, then `npm run dev` on **:3001** (3000 belongs to the reference clone).

`next build` on 16.4.3 prints the route table, then on the **first** run exits 1 with `SecurityFatalError: ... affected by a known security vulnerability` and asks for a retry; the retry exits 0. It did not reproduce on `ca5395f` — that first run exited 0. Both runs generate the same 15 pages (`/contact` and `/api/contact` are dynamic). The pinned Next version is Daniel's call — do not upgrade it inside a gate fix.

## Deploy

- Repo: `https://github.com/Daniel-Osman/portfolio` — connected to the Vercel project, so a push to `main` builds production.
- Vercel: account `daniel-osman`, team `daniel-osmans-projects`, project `portfolio`, CLI 59.9.1. `vercel deploy --prod` from this directory.
- Protection: `ssoProtection.deploymentType = all_except_custom_domains` — production aliases are public, per-deployment URLs need the team login.
- `.env.local` (git-ignored) holds the `VERCEL_OIDC_TOKEN` that `vercel link` wrote.
- Contact env, **server-only**, set in Vercel for Production and Preview: `RESEND_API_KEY`, `CONTACT_FROM` (`Name <addr>` of a verified Resend sender), `CONTACT_TO` (inbox; it becomes the public `mailto:` fallback, so it must be publishable). Locally: copy `.env.example` to `.env.local` and fill it. Nothing here has a key, so a local send cannot work yet.

## DNS — the blocker (Cloudflare, zone `danielosman.com`)

Nameservers `cameron.ns.cloudflare.com` + `collins.ns.cloudflare.com`. Measured 2026-11-19 against 1.1.1.1:

| Record                 | State today                                           |
| ---------------------- | ----------------------------------------------------- |
| apex `A` / `AAAA`      | **none** (SOA only)                                   |
| `www`                  | **none** (NXDOMAIN)                                   |
| `MX`                   | `route1/2/3.mx.cloudflare.net` (Email Routing) — keep |
| apex `TXT`             | `v=spf1 include:_spf.mx.cloudflare.net ~all` — keep   |
| `mail.danielosman.com` | **none published** (Brevo) — keep, do not touch       |
| `_dmarc`, `_vercel`    | none                                                  |

To add, proxy **off** (DNS only) on both: apex `A 76.76.21.21`, `www` `CNAME cname.vercel-dns.com`. Vercel then verifies the domain on its own and issues the certificate; a `_vercel` `TXT vc-domain-verify=...` is only needed when the domain is claimed without pointing DNS at Vercel. No Cloudflare API token is available on this machine (`cf` is not installed, no `CLOUDFLARE_API_TOKEN`), so nothing in the zone was changed.

## Shape

| Path                                  | What                                                                                                                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                    | Home: the pond fills the viewport, mono standfirst pinned to the base                                                                                                                                                  |
| `src/app/components/pond/pond.tsx`    | The one moving idea: canvas fish in four colourways drawn as round pixels (radius `cell * 0.72`), click feeds pellets, avoids `[data-pond-avoid]`, one still frame under reduced motion, paused when the tab is hidden |
| `src/app/components/top-nav.tsx`      | `pond` / `projects` / `about` / `contact` + theme toggle, `aria-current`, fixed top chrome                                                                                                                             |
| `src/app/components/mobile-nav.tsx`   | Under 1024px: menu button with `aria-expanded`, Escape close, focus return; same four items                                                                                                                            |
| `src/app/providers.tsx`               | One definition of "mobile" (`max-width: 1023px`) and the theme, read from `<html class="light">`                                                                                                                       |
| `src/app/projects/`                   | Index (7 rows, labelled plates) + `[slug]` case study (context, role, approach, artifacts, outcome, status)                                                                                                            |
| `src/app/about/`                      | Three-paragraph draft + Build · Automate · Communicate · Explore                                                                                                                                                       |
| `src/app/contact/page.tsx`            | Server page, `force-dynamic` so `CONTACT_TO` is read per request; passes only the fallback address to the form                                                                                                         |
| `src/app/components/contact-form.tsx` | The one client island: rules from `contact-rules`, 2.5 s gate, inline errors, `role="status"`, mailto fallback                                                                                                         |
| `src/app/api/contact/route.ts`        | Node handler: JSON + form-encoded, honeypot, fill-time gate, per-IP throttle, Resend REST via `fetch`, 400/429/503/502/504                                                                                             |
| `src/lib/contact-rules.ts`            | Limits, `isEmail`, `validateContact`, `buildEmail` — one definition for both sides                                                                                                                                     |
| `src/lib/contact-send.ts`             | `sendWithResend` with an injectable `fetch`; `sent` / `rejected` / `unconfirmed`                                                                                                                                       |
| `src/app/data/`                       | `profile.ts` (copy), `projects.ts` (typed, 7 entries), `status.ts` (honest status notes)                                                                                                                               |
| `src/app/globals.css`                 | Design tokens, mono chrome, hairline rules, focus ring, motion + reduced-motion                                                                                                                                        |
| `src/lib/view-transition.ts`          | View-transition helper (kept out of `src/app/` so Next does not treat it as a route)                                                                                                                                   |
| `tasks/todo.md`                       | F-01…F-19                                                                                                                                                                                                              |

## Open facts still needed from Daniel

GitHub / LinkedIn handles, OG image, portrait, client permission for names and logos, real project screenshots and metrics, and the true status of each project. The address pair is settled: `hello@danielosman.com` sends, `daniel@danielosman.com` receives and is the published `mailto:` fallback. Nothing was invented to fill the rest.

## Review

`helm/reviewer` gave a provisional PASS on the pre-redesign shell; the current tree (pond + theme toggle + view transitions) has not been reviewed. M-02's artwork clause stays open until Daniel supplies real media, dates and permissions.

## Reference

`docs/REFERENCE.md` → study clone at `shipwright/open-source/design/dao-ho-portfolio/`. Ideas borrowed: quiet one-idea-per-screen composition, typed project model, card → detail routing, citation-style annotations. No code, CSS or assets taken — upstream declares no licence.
