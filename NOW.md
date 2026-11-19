# NOW — portfolio

**Status:** built, committed and deployed. Next 16.4.3 + React 19 + Tailwind 4: Home (the pond) / `/projects` / seven `/projects/[slug]` case studies / `/about` / `/contact` / 404. Contact Phase 1 is on branch `contact/phase-1`, pushed, with a **preview** deployment `dpl_d8g8mmvbg` at https://portfolio-d8g8mmvbg-daniel-osmans-projects.vercel.app (Vercel Authentication on, so the URL needs the team login). It is **not** on `main` and **not** promoted; no key exists here, so no real email has been sent. Repo `github.com/Daniel-Osman/portfolio`, Vercel project `portfolio` under `daniel-osmans-projects`, production deployment `dpl_2hnEow6CMaCkT79E6MpPoydHvhXC` at https://portfolio-seven-orpin-35j0cxyw5s.vercel.app. `metadataBase` is `https://danielosman.com`. The custom domain is **not live yet**: `vercel domains add` refuses an unowned domain from the CLI and the DNS records below are still pending, so `danielosman.com` does not answer.

**Next:** Daniel adds three env vars in Vercel (Production + Preview) — `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO` — and confirms `CONTACT_TO` is an address he is willing to publish, because the failure state renders it as the `mailto:` fallback. Then merge `contact/phase-1`, send one real enquiry, and check the inbox. Unchanged blocker: the two DNS records in Cloudflare. After that: real project media.

**Verified 2026-11-20** (contact Phase 1, branch `contact/phase-1`, production build of the working tree): `npx tsc --noEmit`, `npm run lint`, `npm run build` (15 pages; `/contact` and `/api/contact` dynamic) and `npm run format:check` all exit 0. A fake-`fetch` script pinned the Resend payload (subject, `reply_to`, text, escaped HTML) in 38 checks. On `next start`: `400` for bad bodies and fields, silent `200` for honeypot and sub-2.5 s posts, `429` on the sixth call, `503` with the key absent, `502` from a real Resend call with a wrong key. Browser at 1440 and 360: 5 inline errors announced and focused, zero layout shift across every outcome, `mailto` fallback present only when `CONTACT_TO` parses, mobile nav lists `contact`. No page errors; the only console entry after a failed submit is Chrome's record of the intentional 502. Evidence and full numbers in `docs/evidence.md` and `docs/CONTACT_SPEC.md`.

**Verified 2026-11-19** (production, Vercel build of `77cdb51`): `npx tsc --noEmit`, `npm run lint`, `npm run build` (13/13 static pages, 7 SSG project paths) and `npm run format:check` all exit 0. Live on the `*.vercel.app` production alias: `/`, `/projects`, `/about`, `/projects/helm` → 200; `/projects/does-not-exist` and `/nope` → 404 with one `h1`; certificate valid (`curl ssl_verify_result=0`); a clean Chromium profile on all five routes loads **no origin other than the site itself** (zero `fonts.googleapis.com`, zero `gstatic`) and logs zero console errors, zero page errors, zero failed requests. The only console entry is Chrome's own record of the intentional 404 document. Evidence: `docs/evidence.md`.

## Gates

`npm ci` → `npx tsc --noEmit` → `npm run lint` → `npm run build` → `npm run format:check`, then `npm run dev` on **:3001** (3000 belongs to the reference clone).

`next build` on 16.4.3 prints the route table, then on the **first** run exits 1 with `SecurityFatalError: ... affected by a known security vulnerability` and asks for a retry; the retry exits 0. Both runs generate the same 15 pages (`/contact` and `/api/contact` are dynamic). The pinned Next version is Daniel's call — do not upgrade it inside a gate fix.

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

| Path                                  | What                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                    | Home: the pond fills the viewport, mono standfirst pinned to the base                                                                                                     |
| `src/app/components/pond/pond.tsx`    | The one moving idea: canvas fish in four colourways, click feeds pellets, avoids `[data-pond-avoid]`, one still frame under reduced motion, paused when the tab is hidden |
| `src/app/components/top-nav.tsx`      | `pond` / `projects` / `about` / `contact` + theme toggle, `aria-current`, fixed top chrome                                                                                |
| `src/app/components/mobile-nav.tsx`   | Under 1024px: menu button with `aria-expanded`, Escape close, focus return; same four items                                                                               |
| `src/app/providers.tsx`               | One definition of "mobile" (`max-width: 1023px`) and the theme, read from `<html class="light">`                                                                          |
| `src/app/projects/`                   | Index (7 rows, labelled plates) + `[slug]` case study (context, role, approach, artifacts, outcome, status)                                                               |
| `src/app/about/`                      | Three-paragraph draft + Build · Automate · Communicate · Explore                                                                                                          |
| `src/app/contact/page.tsx`            | Server page, `force-dynamic` so `CONTACT_TO` is read per request; passes only the fallback address to the form                                                            |
| `src/app/components/contact-form.tsx` | The one client island: rules from `contact-rules`, 2.5 s gate, inline errors, `role="status"`, mailto fallback                                                            |
| `src/app/api/contact/route.ts`        | Node handler: JSON + form-encoded, honeypot, fill-time gate, per-IP throttle, Resend REST via `fetch`, 400/429/503/502/504                                                |
| `src/lib/contact-rules.ts`            | Limits, `isEmail`, `validateContact`, `buildEmail` — one definition for both sides                                                                                        |
| `src/lib/contact-send.ts`             | `sendWithResend` with an injectable `fetch`; `sent` / `rejected` / `unconfirmed`                                                                                          |
| `src/app/data/`                       | `profile.ts` (copy), `projects.ts` (typed, 7 entries), `status.ts` (honest status notes)                                                                                  |
| `src/app/globals.css`                 | Design tokens, mono chrome, hairline rules, focus ring, motion + reduced-motion                                                                                           |
| `src/lib/view-transition.ts`          | View-transition helper (kept out of `src/app/` so Next does not treat it as a route)                                                                                      |
| `tasks/todo.md`                       | F-01…F-10                                                                                                                                                                 |

## Open facts still needed from Daniel

Verified public email / GitHub / LinkedIn, OG image, portrait, client permission for names and logos, real project screenshots and metrics, and the true status of each project. Nothing was invented to fill these.

## Review

`helm/reviewer` gave a provisional PASS on the pre-redesign shell; the current tree (pond + theme toggle + view transitions) has not been reviewed. M-02's artwork clause stays open until Daniel supplies real media, dates and permissions.

## Reference

`docs/REFERENCE.md` → study clone at `shipwright/open-source/design/dao-ho-portfolio/`. Ideas borrowed: quiet one-idea-per-screen composition, typed project model, card → detail routing, citation-style annotations. No code, CSS or assets taken — upstream declares no licence.
