# NOW — portfolio

**Status:** built and running — Next 16.4.3 + React 19 + Tailwind 4, Home / `/projects` / seven `/projects/[slug]` case studies / `/about` / 404. Redesigned on 2026-10-27 for taste: Instrument Serif display, paper-and-ink palette, one node-field idea on the hero, hairline chrome, light placeholder plates. Content is Daniel's real positioning; every status is honest; all seven previews are labelled placeholders. Not deployed, not committed.

**Next:** Daniel's gate — real contact URLs, domain, OG image and real project media. Then a fresh `helm/reviewer` pass over the redesigned tree, first commit, preview deploy.

**Verified 2026-10-27** (post-redesign, production `next start` on :3001): `npx tsc --noEmit`, `npm run lint`, `npm run build` (13/13 static pages, 7 SSG project paths) and `npm run format:check` all exit 0. Browser at 1440 and 360: all 10 routes 200, unknown slug 404 with one `h1`, no horizontal overflow, no console errors or failed requests, no `fonts.googleapis.com` traffic (Geist + Instrument Serif self-hosted), keyboard order with a visible 2px focus ring, mobile menu + Escape + focus return, status labels measured visible (home 3/3, `/projects` 7/7, detail 2/2), `prefers-reduced-motion` proven both ways (`page-in` → `none`). Evidence: `docs/evidence.md`, screenshots in `docs/evidence/`.

**Review:** `helm/reviewer` gave a provisional PASS on the pre-redesign shell; the redesigned tree has not been reviewed yet. M-02's artwork clause stays open until Daniel supplies real media, dates and permissions.

## Shape

| Path                                | What                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                  | Home: display hero + standfirst column, node field, three featured rows                                             |
| `src/app/components/node-field.tsx` | The one moving idea: drifting ink nodes, accent lines to the pointer, static under reduced motion, paused offscreen |
| `src/app/projects/`                 | Index (7 rows with labelled plates) + `[slug]` case study (context, role, approach, artifacts, outcome, status)     |
| `src/app/about/`                    | Three-paragraph draft + Build · Automate · Communicate · Explore                                                    |
| `src/app/data/`                     | `profile.ts` (copy), `projects.ts` (typed, 7 entries), `status.ts` (honest status notes)                            |
| `src/app/globals.css`               | Design tokens, `.display` / `.display-italic` / `.annotation`, hairline rules, motion + reduced-motion              |
| `src/lib/layout.ts`                 | Shared page shell (kept out of `src/app/` so Next doesn't treat it as a route)                                      |
| `docs/evidence/`                    | Eight screenshots from the post-redesign build (1440 + 360)                                                         |
| `tasks/todo.md`                     | F-01…F-10                                                                                                           |

## Gates

`npm ci` → `npx tsc --noEmit` → `npm run lint` → `npm run build` → `npm run format:check`, then `npm run dev` on **:3001** (3000 belongs to the reference clone).

## Open facts still needed from Daniel

Verified public email / GitHub / LinkedIn, domain (`metadataBase` deliberately unset), OG image, portrait, client permission for names and logos, real project screenshots and metrics, and the true status of each project. Nothing was invented to fill these.

## Reference

`docs/REFERENCE.md` → study clone at `shipwright/open-source/design/dao-ho-portfolio/`. Ideas borrowed: quiet one-idea-per-screen composition, typed project model, card → detail routing, citation-style annotations. No code, CSS or assets taken — upstream declares no licence.
