# NOW — portfolio

**Status:** built, committed and deployed. Next 16.4.3 + React 19 + Tailwind 4, all static: Home (the pond) / `/projects` / seven `/projects/[slug]` case studies / `/about` / 404. Repo `github.com/Daniel-Osman/portfolio` (`main`, public) and Vercel project `portfolio` under `daniel-osmans-projects`, production deployment `dpl_2hnEow6CMaCkT79E6MpPoydHvhXC` at https://portfolio-seven-orpin-35j0cxyw5s.vercel.app. `metadataBase` is `https://danielosman.com`. The custom domain is **not live yet**: `vercel domains add` refuses an unowned domain from the CLI and the DNS records below are still pending, so `danielosman.com` does not answer.

**Next:** Daniel adds the two DNS records in Cloudflare (see below), the domain is attached in Vercel, then the live re-check on the real domain. After that: real contact URLs, OG image, real project media.

**Verified 2026-11-19** (production, Vercel build of `77cdb51`): `npx tsc --noEmit`, `npm run lint`, `npm run build` (13/13 static pages, 7 SSG project paths) and `npm run format:check` all exit 0. Live on the `*.vercel.app` production alias: `/`, `/projects`, `/about`, `/projects/helm` → 200; `/projects/does-not-exist` and `/nope` → 404 with one `h1`; certificate valid (`curl ssl_verify_result=0`); a clean Chromium profile on all five routes loads **no origin other than the site itself** (zero `fonts.googleapis.com`, zero `gstatic`) and logs zero console errors, zero page errors, zero failed requests. The only console entry is Chrome's own record of the intentional 404 document. Evidence: `docs/evidence.md`.

## Gates

`npm ci` → `npx tsc --noEmit` → `npm run lint` → `npm run build` → `npm run format:check`, then `npm run dev` on **:3001** (3000 belongs to the reference clone).

`next build` on 16.4.3 prints the route table, then on the **first** run exits 1 with `SecurityFatalError: ... affected by a known security vulnerability` and asks for a retry; the retry exits 0. Both runs generate the same 13 pages. The pinned Next version is Daniel's call — do not upgrade it inside a gate fix.

## Deploy

- Repo: `https://github.com/Daniel-Osman/portfolio` — connected to the Vercel project, so a push to `main` builds production.
- Vercel: account `daniel-osman`, team `daniel-osmans-projects`, project `portfolio`, CLI 59.9.1. `vercel deploy --prod` from this directory.
- Protection: `ssoProtection.deploymentType = all_except_custom_domains` — production aliases are public, per-deployment URLs need the team login.
- `.env.local` (git-ignored) holds the `VERCEL_OIDC_TOKEN` that `vercel link` wrote.

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

| Path                                | What                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                  | Home: the pond fills the viewport, mono standfirst pinned to the base                                                                                                     |
| `src/app/components/pond/pond.tsx`  | The one moving idea: canvas fish in four colourways, click feeds pellets, avoids `[data-pond-avoid]`, one still frame under reduced motion, paused when the tab is hidden |
| `src/app/components/top-nav.tsx`    | `pond` / `projects` / `about` + theme toggle, `aria-current`, fixed top chrome                                                                                            |
| `src/app/components/mobile-nav.tsx` | Under 1024px: menu button with `aria-expanded`, Escape close, focus return                                                                                                |
| `src/app/providers.tsx`             | One definition of "mobile" (`max-width: 1023px`) and the theme, read from `<html class="light">`                                                                          |
| `src/app/projects/`                 | Index (7 rows, labelled plates) + `[slug]` case study (context, role, approach, artifacts, outcome, status)                                                               |
| `src/app/about/`                    | Three-paragraph draft + Build · Automate · Communicate · Explore                                                                                                          |
| `src/app/data/`                     | `profile.ts` (copy), `projects.ts` (typed, 7 entries), `status.ts` (honest status notes)                                                                                  |
| `src/app/globals.css`               | Design tokens, mono chrome, hairline rules, focus ring, motion + reduced-motion                                                                                           |
| `src/lib/view-transition.ts`        | View-transition helper (kept out of `src/app/` so Next does not treat it as a route)                                                                                      |
| `tasks/todo.md`                     | F-01…F-10                                                                                                                                                                 |

## Open facts still needed from Daniel

Verified public email / GitHub / LinkedIn, OG image, portrait, client permission for names and logos, real project screenshots and metrics, and the true status of each project. Nothing was invented to fill these.

## Review

`helm/reviewer` gave a provisional PASS on the pre-redesign shell; the current tree (pond + theme toggle + view transitions) has not been reviewed. M-02's artwork clause stays open until Daniel supplies real media, dates and permissions.

## Reference

`docs/REFERENCE.md` → study clone at `shipwright/open-source/design/dao-ho-portfolio/`. Ideas borrowed: quiet one-idea-per-screen composition, typed project model, card → detail routing, citation-style annotations. No code, CSS or assets taken — upstream declares no licence.
