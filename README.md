# Daniel Osman — portfolio

Independent portfolio site for Daniel Osman: full-stack developer and AI systems builder based in Lebanon. Three routes — home, `/projects` with seven case studies, and `/about`. Every project states what it is, the role played, and how much evidence exists today.

Not deployed yet. Placeholder previews are labelled placeholders, and missing facts (contact URLs, domain, real media, client permissions) are labelled missing rather than invented.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Geist Sans/Mono self-hosted from the `geist` package. No analytics, no third-party requests.

## Commands

```powershell
npm ci
npm run dev          # http://localhost:3001
npm run build
npm start            # production server, port 3001
npx tsc --noEmit
npm run lint
npm run format:check
```

`dev` and `start` pin **3001** on purpose: 3000 hosts the local study clone of the reference site.

## Where the documents live

| Path                                                   | What                                                      |
| ------------------------------------------------------ | --------------------------------------------------------- |
| `NOW.md`                                               | current state: status, next, verified                     |
| `docs/BRAND_AND_CONTENT.md`                            | the writing source of truth                               |
| `docs/IMPLEMENTATION_PLAN.md`, `docs/OPENCODE_TASK.md` | phases and acceptance criteria                            |
| `docs/evidence.md`, `docs/evidence/`                   | milestone gate record and screenshots                     |
| `docs/REFERENCE.md`                                    | what is studied from the reference, and what is not taken |
| `feature_list.json`                                    | feature-by-feature completion, flipped only with proof    |

## Provenance

This is an independent implementation. `Dao-Ho/portfolio` (the design reference) **declares no licence**, so it is used as a study reference only — no source files, components, stylesheets or assets are taken from it. What is borrowed is structural: one typed project model feeding cards and detail pages, card → case-study routing, and a native view-transition direction. Details and the constraint itself live in `docs/REFERENCE.md`.
