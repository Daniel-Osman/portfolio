# Contact page — Phase 1 spec

Scope: one page at `/contact` with a working email form, its API route, and its nav entry.
No avatar, no other feature work. Existing shell, nav, tokens and motion rules only; no new
dependency and no new visual system.

## Route and chrome

- `/contact` is a server component page with `metadata` (title "Contact"). The page body —
  header, copy, privacy line, form slot — renders on the server and is not behind a client
  guard. Only the nav switch waits for `isMobile`.
- The nav switch (`isMobile ? MobileNav : TopNav`) is a small client component, the same
  decision `about-view.tsx` and `page.tsx` inline today; `src/lib/layout.ts` named in the
  request does not exist.
- The page reuses the about-page measure: `max-w-[56rem] px-6 pt-28 pb-40 font-sans lg:pt-40`.
- `contact` joins the desktop and mobile nav lists as the fourth item, lowercase.

## Fields

| Field       | Rule                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`      | required, trimmed 1..80                                                                                                                                              |
| `email`     | required, max 254; exactly one `@`; local 1..64 with no edge dot and no `..`; domain 1..253, at least one dot, every label 1..63 with no edge hyphen, TLD 2+ letters |
| `phone`     | optional, max 32, any human format                                                                                                                                   |
| `topic`     | required, one of "a new project", "working together", "a question", "something else"                                                                                 |
| `preferred` | required, one of "a meeting", "WhatsApp", "email"                                                                                                                    |
| `message`   | required, trimmed 10..2000                                                                                                                                           |
| `website`   | honeypot, off-screen, not in the tab order, not announced                                                                                                            |
| `elapsedMs` | client fill time in whole ms; non-negative integer                                                                                                                   |

Rules live once in `src/lib/contact-rules.ts`, client-safe: limits, `validateContact`, and the
pure `buildEmail` (subject, text, HTML). The route and the form import the same file.
`src/lib/contact-send.ts` holds the Resend call only, with an injectable `fetch` — the one
seam the verification script uses.

One privacy line: details are used only to reply.

## Send path — `src/app/api/contact/route.ts`

Node runtime (`export const runtime = "nodejs"`).

**Parsing.** `application/json` → `req.json()` and the result must be a plain object; anything
else is `400 { ok: false, error: "bad_request" }`. `application/x-www-form-urlencoded` or
`multipart/form-data` → `req.formData()`, first value per key. A field whose value is not a
string (array, object, file) is `400`, never coerced. Unknown keys are ignored. Malformed or
unreadable body → `400`.

**Order of checks.** Each earlier step ends the request.

1. **Honeypot.** `website` non-empty → silent drop.
2. **Fill time.** `elapsedMs` missing, non-integer, negative or `< 2500` → silent drop. This is
   how bots are lost. People do not reach it: the form waits out the remaining time before it
   sends (below).
3. **Throttle.** Per IP, 5 requests per 10 minutes: `x-real-ip`, else the **last** hop of
   `x-forwarded-for` (the platform-appended one; the leftmost can be spoofed), else
   `"unknown"`. Timestamps older than the window are pruned on every call; the map is capped at
   5000 keys. Over the limit → `429 { ok: false, error: "rate_limited" }`. Comment in the file
   states this is best effort: serverless instances do not share memory and cold starts reset
   it.
4. **Validation.** Same rules as the client → `400 { ok: false, errors: { field: message } }`.
5. **Config.** Any of `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO` missing →
   `503 { ok: false, error: "not_configured" }`. Values are never echoed.
6. **Send.** `buildEmail` → `sendWithResend`, which POSTs
   `https://api.resend.com/emails` with `from`, `to: [CONTACT_TO]`, `reply_to: <visitor>`,
   `subject: New enquiry — <name> — <topic>`, `text`, `html`, `AbortSignal.timeout(10_000)`.
   Non-2xx, network error or timeout → `502 { ok: false, error: "send_failed" }`. Text is
   labelled; HTML escapes every visitor value.

**Silent drop.** Same status, same body bytes as success, and a 250–600 ms jittered wait so it
does not answer faster than a real send. No outbound fetch. The comment says plainly that a
determined prober can still time a real send against a drop; the jitter only blunts it.

`.env.example` lists the three names with no values; `.gitignore` keeps `.env*` ignored and
re-includes `.env.example`.

## UI

- Paper and ink: hairline rows, mono 12px lowercase labels, 16px sans input text, one pill
  submit. Reuses `focus-ring`, `text-muted`, `border-foreground/15`.
- Every visible control has a `<label for>`; the radio group is a `fieldset` with a `legend`;
  the select is native. The honeypot and the timer are exempt: they are not visible and are
  reached by no one.
- Errors: inline under the field, `aria-describedby` on the control, `aria-invalid` on the
  failing control, one `role="status"` region above submit, focus moved to the first invalid
  control. Success and failure land in that same region.
- Fill time: measured from mount. On submit the form waits out the remainder of 2500 ms, then
  sends the measured value — a fast human is never dropped and no button sits disabled.
- Double send: a ref guard plus `aria-busy`; the label swaps to "sending…" inside a
  fixed-width button.
- Outcomes, all keeping the typed values:
    - `503` / `502` / network, with a fallback address: "The message did not send. Your text is
      still here — email <address> and I will reply from there."
    - `503` / `502` / network, with no fallback address: "The message did not send, and no
      fallback address is set on this site. Your text is still here; try again shortly."
    - Timeout (the request aborted without an answer): "I could not confirm the send. Your text
      is still here — check before sending twice."
    - `429`: "Too many messages just now. Try again in a few minutes, or email me directly."
      (the last four words only when a fallback exists)
    - `400` with field errors: rendered like client errors. `400` without them: "Something in the
      form could not be read. Check the fields and try again."
- `mailto:` fallback: the server page reads `CONTACT_TO`, extracts the bare address from
  `Name <addr>` and checks it, and passes only that address to the form. Absent or invalid →
  no link, and the copy above changes to match. The inbox is public by design (it is the reply
  address); no other env value crosses to the client. **Daniel must confirm the address in
  `CONTACT_TO` is one he is willing to publish**, since the fallback link exposes it.
- Success (verbatim): "Thanks. I will get back to you within two business days."
- Reserved error line per field; copy stays under one line at 360 px, and that is measured, not
  assumed.
- Reduced motion: no animation is added; existing `.rise` stays off. No analytics, no
  third-party script, no new font.

## Slices

1. **Data and API** — `src/lib/contact-rules.ts`, `src/lib/contact-send.ts`,
   `src/app/api/contact/route.ts`, `.env.example`, `.gitignore` re-include.
   Verify: `npx tsc --noEmit`, `npm run lint`; a Node script against `contact-send.ts` with a
   fake `fetch` asserting the exact payload, success, network failure and abort; on `next start`
   JSON and form-encoded `400`, boundary values, both silent drops answering `200` while the key
   is absent (so no send was attempted), `429` on the sixth call, `503` for each missing env var,
   `502` against Resend with a deliberately wrong key.
2. **Page and form** — `src/app/contact/page.tsx`, `src/app/components/site-nav.tsx`,
   `src/app/components/contact-form.tsx`, the two nav lists.
   Verify: the four gates plus the browser pass at 1440 and 360 — success copy verbatim, `400`
   rendering, `503` copy in both fallback states, throttle copy, fast submit, double submit,
   tab order, status announcements, no shift across every outcome, reduced motion, console
   clean.
3. **Ship** — full gate chain, `git diff --check`, evidence record, commit on a branch, push
   that branch, Vercel **preview** deployment.
   Verify: `git log --oneline -1`, `vercel ls portfolio`, preview `/contact` answers.
   A push to `main` builds production through the Vercel Git integration, so it is **not** part
   of this slice; promotion is Daniel's separate decision. Recorded in F-15. Commit, push and
   deploy still run only on Daniel's say-so; the request that opened this work is that say-so for
   a branch and a preview, not for `main`.
