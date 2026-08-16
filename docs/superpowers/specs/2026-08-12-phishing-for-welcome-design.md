# Phishing for Welcome — Design Spec

**Date:** 2026-08-12
**Status:** Approved, building

## Purpose
A phishing-awareness recruitment stunt for the **CodeCatalyst** club. Students are
baited with a too-good-to-be-true "free 1-month Claude Pro" QR code, land on a fake
"claim your reward" page, click **Claim now!**, celebrate a confetti "claim complete"
moment, and download their "gift code" as a `.txt` file. There is no real code — the
file they open is the friendly reveal: *"You just got phished, by CodeCatalyst.
You scanned a stranger's QR and downloaded a file from it — that's how malware lands.
This is your welcome surprise for the workshop."* Nothing on screen spoils it; the
lesson lands only when they download and open the file, which mirrors the real attack.

Two goals (from the source mockup):
1. Test security awareness.
2. Capture engagement stats to reuse as post-event content.

## Non-goals / ethics
- No credential harvesting, no personal data collection. Only anonymous event counts
  and timestamps are stored.
- There is no real gift; the friendly reveal *is* the welcome surprise. The reveal is
  delivered in the file the participant downloads and opens — opening it is the natural
  "redeem" step, so the lesson reliably lands the moment they act on the bait. The tone
  is friendly and immediate so no participant is left actually deceived.

## Stack
- **Next.js (App Router, TypeScript)** — single app, pages + API routes together.
- **Persistence:** local SQLite file `stats.db` via `better-sqlite3`.
- **QR:** `qrcode` package, rendered on the poster page.

## Design system (adopted from the CodeCatalyst booklet)
Cloned from `github.com/xcb3d/coca-booklet` and applied so the gift reads as a
CodeCatalyst giveaway:
- **Palette:** navy `#243d71` → indigo `#494996` → teal `#32aab2` gradients; white
  card surfaces, `#0f172a` ink. A deep navy (`#0a1428`) dims the page behind the modal.
- **Type:** Orbitron (display) + Manrope (body), via `next/font`.
- **Surfaces:** hero gradient backdrop, glassy cards, gradient primary buttons, navy-tinted
  glow shadows, the `coca-logo.png` brand mark (also the favicon).
- **One bright brand throughout:** poster → `/claim` bait → confetti "claim complete"
  modal, all in the celebratory light world. The confetti burst is the authored motion
  moment; the tonal turn happens off-screen, inside the downloaded file.

## Pages
1. **`/` — QR poster.** Big QR + headline "SCAN THIS FOR FREE 1-MONTH CLAUDE PRO
   (50 FIRST K8 STUDENTS)". QR encodes the deployed base URL + `/claim`.
2. **`/claim` — bait → claim-complete modal → file download (client component).**
   - On mount: `POST /api/scan`.
   - Bait (promo) state: "You're in. Enjoy Claude Pro on us." + **Claim now** button.
   - Click Claim now → `POST /api/phished` → a confetti burst + a "Claim complete"
     modal slides up over the dimmed promo. The modal presents a file object
     `claude-pro-giftcode.txt` (a real file card with a download affordance) and the
     copy "Your 1-month code is inside this file. Download it, then open it to redeem."
   - Click the file → the browser downloads `claude-pro-giftcode.txt` (built client-side
     as a Blob; no server needed). The modal then confirms "Saved to your device — open
     it to see your code." **Nothing on screen reveals the trick.**
   - The downloaded file's contents are the reveal: a fake gift-code header, then
     "there's no code — you just got phished, by CodeCatalyst … this is your welcome
     surprise for the workshop. Register / details: **[placeholder link]**."
   - Confetti is a hand-rolled `<canvas>` burst in the CodeCatalyst palette only (no
     dependency); skipped under `prefers-reduced-motion`.

## API
- `POST /api/scan` → insert `event(type='scan', ts=now)`.
- `POST /api/phished` → insert `event(type='phished', ts=now)`.
- `GET /api/stats` → `{ scans, phished, phishRate }` for post-event content.

## Data model
`events(id INTEGER PK AUTOINCREMENT, type TEXT CHECK(type IN ('scan','phished')), ts INTEGER)`

## Deployment note
SQLite file works for local + a persistent host (Render/Railway/VPS). On Vercel's
ephemeral filesystem, swap the db module for a hosted store (KV/Postgres) later — the
API surface stays the same.

## Config to confirm at build time
- Real registration URL: **placeholder** for now (clearly marked, easy to swap).
- Club name **CodeCatalyst**; default palette unless the user supplies brand colors.
