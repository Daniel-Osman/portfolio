# Reference — Dao Ho's portfolio

The design inspiration for this project. **Reference only, not a source tree.**

|             |                                                                               |
| ----------- | ----------------------------------------------------------------------------- |
| Upstream    | https://github.com/Dao-Ho/portfolio                                           |
| Live        | https://www.daoho.dev/                                                        |
| Local clone | `shipwright/open-source/design/dao-ho-portfolio/` (pin `7fe372a`, 2026-10-26) |
| Licence     | **none declared** — public source is not a licence to copy                    |
| Role here   | study the structure and interaction ideas; build our own code and assets      |

## Where the good ideas are

Paths are inside the local clone.

| What                      | Where                                                                     | Why it's worth studying                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typed project model       | `src/app/data/projects.ts`                                                | One central source feeding cards _and_ detail pages, with a per-project story body. We model the same idea in `src/app/data/projects.ts` with our own type names (`RichText`, `CaseStudyBlock`) and block shape — no declarations copied. |
| Detail routes             | `src/app/projects/[slug]/` + `components/project-page.tsx`                | Card → full case study without duplicating copy.                                                                                                                                                                                          |
| Project index layouts     | `src/app/projects/page.tsx`                                               | Desktop horizontal strip vs mobile vertical stack, one data source.                                                                                                                                                                       |
| View transitions          | `src/lib/view-transition.ts`                                              | Native `document.startViewTransition` navigation with a forward/back direction on `<html>`, a 1.5 s bail-out and a reduced-motion escape hatch — cheap polish, no animation library.                                                      |
| Link + citation treatment | `src/app/components/citation.tsx`, `inline-link.tsx`, `src/lib/utils.tsx` | Hover cards for `@mentions` sourced from `src/app/data/sources.ts`; restrained inline references.                                                                                                                                         |
| Page transition CSS       | `src/app/globals.css`                                                     | How the `data-transition` direction actually animates.                                                                                                                                                                                    |
| Image pipeline            | `next.config.js`                                                          | AVIF + WebP, 31-day cache, PostHog proxied through the same origin.                                                                                                                                                                       |
| Gallery reveal            | `src/app/gallery/page.tsx`                                                | Scroll-triggered fade on artwork; also the reason a flat full-page screenshot looks empty.                                                                                                                                                |

## What we do **not** take

- Any source file, component, stylesheet or asset from the clone — no licence.
- The koi-pond scene, personal quotations, art gallery, employer citation cards, logos, avatars, social links, `daoho.dev` metadata.
- PostHog configuration, tracking IDs, analytics proxying.

Copy that shape, not the bytes. If Daniel obtains written permission from the author, revisit — the plan and the constraint both change at that point.

## Divergences already decided by the starter

- Home / Projects / About at launch. No Gallery, no Blog, no dead nav.
- Warm off-white `#F5F3EE` / charcoal `#1B211F` / muted blue-green `#508478` instead of the reference's near-black.
- Geist Sans + Geist Mono rather than Inter + Playfair Display.
- Every project carries an honest status label; no invented launch claims, no fake screenshots.

## Running the reference locally

```powershell
cd shipwright/open-source/design/dao-ho-portfolio
npm ci
npm run dev     # http://localhost:3000
```

`npm ci` takes ~6 min cold. The sparse checkout drops an 85 MB nested bare repo and the demo videos; if a local asset is missing, `git sparse-checkout disable` restores the full tree. Fonts (`fonts.googleapis.com`) are unreachable from this box, so the local copy renders in fallback type.
