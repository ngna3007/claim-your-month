# Phishing for Welcome — Form + Insight + Dashboard (Conception Day)

**Date:** 2026-08-16
**Status:** Approved direction, spec for review
**Supersedes:** the `.txt`-download reveal in `2026-08-12-phishing-for-welcome-design.md`.
The QR poster and the anonymous-events idea carry over; the claim flow and the
persistence backend change.

## Purpose / context
A phishing-awareness stunt for **CodeCatalyst**'s **conception (orientation) day**,
where new K–8 students visit the club to explore. It should be the booth that hooks
them. A student scans a QR promising "free Claude Pro", lands on a fake **claim form**,
fills it in, and on submit gets an **on-screen reveal**: a friendly "gotcha", a live
"**you're phish #XX today**" counter with a small visualization, a **💡 insight box**
that explains what phishing is, a reassurance that nothing they typed was kept, and a
prompt to **show the screen to a club member to claim a sticker/merch**. Organizers watch
a live **dashboard** of anonymous engagement. The whole thing self-hosts free on Vercel.

## Non-goals / ethics (hard constraints)
- **No PII is ever stored or transmitted.** The form fields (name, email, student ID)
  are **bait only**. On submit the values are discarded in the browser; the network
  request carries **no field values**. The server never logs request bodies.
- Only **anonymous events** are persisted: `scan` (page open) and `phished` (form
  submit), each with a timestamp. No identifying columns, ever.
- No password field (it would nudge a child to type a real credential).
- The reveal is **on screen, immediate, and friendly** — age-appropriate for young kids,
  never scary. It explicitly tells them we kept nothing they typed.
- Fields are **optional**; submit works even when blank, so no child feels pressured to
  enter real details.

## Stack
- **Next.js 15 (App Router, TypeScript)** — pages + API routes.
- **Turso (libSQL)** via `@libsql/client` for persistence. One client works locally
  (`file:` URL) and in production (Turso `libsql://…` + auth token). **Remove
  `better-sqlite3`** — its local-file writes do not survive Vercel's ephemeral,
  read-only serverless filesystem (the counter would reset every request).
- **Hosting:** Vercel **Hobby** (free, non-commercial) → `https://<project>.vercel.app`
  with HTTPS, no custom domain, no payment. The QR encodes that URL via
  `NEXT_PUBLIC_BASE_URL`.

## Architecture / data pipeline
```
 Poster (QR ─► <base>/claim)
   page open   ─► POST /api/scan     ┐  (no PII in the body)
   form submit ─► POST /api/phished  ┤
        ▼                            ▼
   Next.js API routes ───────────► Turso (libSQL)  events(id, type, ts)
        ▲                            │
        │ GET /api/stats ◄───────────┘  aggregates: counts, rate, time buckets
        ▼
   /claim reveal  → "you're phish #XX" + viz + insight
   /dashboard     → organizer charts (all anonymous, auto-refresh)
```

## Data model
`events(id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL CHECK(type IN ('scan','phished')), ts INTEGER NOT NULL)`
Append-only. No PII columns. `CREATE TABLE IF NOT EXISTS` runs on first connection.

## API
All handlers: `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- `POST /api/scan` → insert `scan`; returns `{ ok: true }`.
- `POST /api/phished` → insert `phished`; returns `{ rank, scans, phished }` where
  `rank` = count of `phished` rows including this one (the student's number). Requests
  carry **no** body from the client (or an empty body); any body is ignored.
- `GET /api/stats` → `{ scans, phished, phishRate, series }` where `series` is
  `phished` bucketed by a fixed interval (e.g. 15 min) for the dashboard chart.
- **Rank race:** `COUNT(*)` after insert can, under exact concurrency, hand two students
  the same number. Acceptable for an open-house booth; documented, not engineered away.

## Pages
1. **`/` — QR poster.** Unchanged in spirit; QR encodes `NEXT_PUBLIC_BASE_URL` + `/claim`.
2. **`/claim` — form → reveal (client component).**
   - On mount: `POST /api/scan` (once).
   - **Bait (form):** brand lockup, short pitch ("Tell us where to send your free month
     of Claude Pro"), inputs **Name / Email / Student ID** (all optional), and a
     **Claim my free month** button.
   - **On submit:** `preventDefault`; **do not read or send the field values**; `POST
     /api/phished`; take `rank`; flip to reveal. (A confetti burst plays.)
   - **Reveal (on screen):**
     - Friendly "Gotcha — you just got phished 🎣" headline (kid tone).
     - **Big count-up** "You're phish **#<rank>** today!".
     - **Visualization:** three stat tiles — *Scanned* / *Got phished* / *% who fell for
       it* — plus a bar showing `phished / scans`. (Chosen default; simpler variants noted
       below.)
     - **💡 Insight box** (drawn lightbulb SVG, not emoji): *"What is phishing? A fake
       offer that tricks you into handing over your info. This one looked official and
       free — that's the trick. Always check who's really asking before you type."*
     - **Reassurance:** "We didn't save your name, email, or ID. Promise."
     - **Merch CTA:** "Show this screen to a CodeCatalyst member to grab your free
       sticker!" (merch wording is a swappable placeholder).
     - Optional "Come join us →" link (registration placeholder).
3. **`/dashboard` — organizer view (anonymous).**
   - Stat tiles: total scans, total phished, phish rate.
   - **Phished-over-time** chart (from `series`).
   - Auto-refresh by polling `GET /api/stats` every few seconds; count-ups animate.
   - Aggregate-only, so safe to leave public; an optional `?key=` gate can be added later.

## Visualization approach
Hand-rolled lightweight **SVG/CSS** charts and count-ups (no heavy chart dependency),
following the `dataviz` skill for palette, stat-tile, and bar/meter conventions. Respect
`prefers-reduced-motion` (skip count-up + confetti, show final values). Shared visual
language between the student reveal and the organizer dashboard.
**Simpler viz variants** (if preferred at review): (b) big number + one progress bar;
(c) a small scanned-vs-phished bar chart.

## Design system
Existing CodeCatalyst tokens (navy `#243d71` / indigo `#494996` / teal `#32aab2`,
Orbitron display + Manrope body). Tune the reveal **friendlier and celebratory** for
young kids while staying on-brand. Insight box = tinted panel + drawn lightbulb. Confetti
reused from the current build (canvas, brand palette, reduced-motion aware).

## Local development
`@libsql/client` opens `file:./dev.db` when Turso env vars are absent, so `npm run dev`
works offline and the tally persists locally. In production it uses
`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.

## Deployment (`DEPLOY.md`)
1. Create a free **Turso** DB → copy `TURSO_DATABASE_URL` and an auth token.
2. Push the repo to GitHub; import into **Vercel** (Hobby / free).
3. Set env vars in Vercel: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
   `NEXT_PUBLIC_BASE_URL=https://<project>.vercel.app`.
4. Deploy → point the printed poster's QR at that URL. No domain, no payment.

## Testing
- Local `file:` DB. E2E (Playwright, desktop + mobile):
  - `scan` fires on load.
  - Submit the form **empty** and **filled** → `phished` increments; `rank` returned and
    shown; reveal renders count-up, stat tiles + bar, insight box, reassurance, merch CTA.
  - **Assert the `/api/phished` request body contains none of the typed values** (the
    core ethics guarantee).
  - `/dashboard` reflects counts and updates on poll.
  - Reduced-motion path. Capture screenshots for all states.
- `npx tsc --noEmit` clean; impeccable detector clean.

## Config to swap before the event
- `NEXT_PUBLIC_BASE_URL` (poster QR target).
- Registration/join link placeholder.
- Merch wording ("free sticker").
