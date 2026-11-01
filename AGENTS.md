# portfolio — Agent Instructions

## Start here (read order)

1. `NOW.md` → what exists today.
2. `docs/BRAND_AND_CONTENT.md` → the writing source of truth.
3. `docs/IMPLEMENTATION_PLAN.md` → phases; `docs/OPENCODE_TASK.md` → acceptance criteria.
4. `docs/REFERENCE.md` → what we borrow from Dao Ho's portfolio, and what we must not.

## Purpose

Daniel Osman's personal portfolio: independent full-stack developer and AI systems builder. Teach the work — context, role, approach, artifacts, honest status — rather than decorate it.

## Stack

Next.js 16.4.3 (App Router, Turbopack) + React 19.3.0 + Tailwind 4.3.3 (`@tailwindcss/turbopack`) + TypeScript 5.9 strict. Fonts: self-hosted Geist Sans + Geist Mono from the `geist` package — never `next/font/google`, this box cannot reach Google Fonts.

## Commands

```powershell
npm ci                      # install exactly the lockfile
npm run dev                 # http://localhost:3001 (3000 belongs to the reference clone)
npm run lint                # eslint
npx tsc --noEmit            # typecheck
npm run build               # production build + static generation
npm run format:check        # prettier
```

Gate order: typecheck → lint → build → browser pass on `next start`, then record in `docs/evidence.md`.

## Constraints

- **No code, CSS, or assets from the reference clone** (`shipwright/open-source/design/dao-ho-portfolio/`) — upstream declares no licence. Structure and interaction ideas only. If Daniel ever gets written permission, revisit `docs/REFERENCE.md`.
- No invented launch status, metrics, client names, screenshots or demo links. Missing evidence is labelled missing, not filled in.
- Home / Projects / About only at launch; no dead Gallery or Blog links.
- Placeholder graphics must say they are placeholders.
- Analytics: no third-party visitor data until Daniel approves a privacy story.
- No commit, push, merge or deploy without Daniel's explicit say-so.

## Current context

See `NOW.md`.

## Progress tracking

- One feature at a time from `feature_list.json`, end-to-end verified before `passes` flips.
- Refresh `NOW.md`'s Status / Next / Verified block after meaningful work.
