# Phishing for Welcome

A phishing-awareness recruitment stunt for **CodeCatalyst**. Students scan a QR promising
free Claude Pro, land on a branded "claim your gift" page, fill in a fake form (name, email,
student ID), and submit. Instantly, they see an on-screen reveal: *You just got phished.*
Nothing they typed is stored — only an anonymous `phished` event is recorded. The screen shows
their rank ("You're phish #42"), live stats (scans, phished, % who fell for it), and an insight
box explaining what phishing is. A reassurance confirms nothing is saved. They're invited to
show the screen to a CodeCatalyst member to grab a **free sticker**.

Anonymous engagement counts (scans, form submissions) are tallied in a database so the club
can reuse the numbers as post-event content. **No personal data is collected.**

## Pages

- `/` — the QR poster (print it or show it on a screen). The QR points to `/claim`.
- `/claim` — the branded bait form with three fields (never submitted to the server). On
  submit, records an anonymous `phished` event and shows the on-screen reveal: rank,
  stats tiles, a live chart of phish events over time, an insight box, and a sticker CTA.
- `/dashboard` — live organizer view (tiles + phished-over-time chart, polls every 4 seconds).
  Useful for displaying event stats on a screen during or after the event.

## API

- `POST /api/scan` — records a `/claim` page load (one per browser session, no PII).
- `POST /api/phished` — records a form submission (one anonymous `phished` event). Returns
  `{ rank, scans, phished }` so the client can show "You're phish #N".
- `GET /api/stats` — returns `{ scans, phished, phishRate, series }` where `series` is a
  time-bucketed array of phished counts for the chart.

Events are stored in **Turso** (free libSQL cloud database). Locally, the app falls back to
`file:./dev.db` so you can develop offline.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
# or a production build:
npm run build && npm run start
```

Local dev uses `file:./dev.db` (git-ignored) by default. To use a remote Turso database
even locally, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.local`.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for a step-by-step guide to deploy free on **Vercel Hobby**
with **Turso** as the database. No credit card, custom domain, or database setup needed —
the schema self-creates on first request.

Key config points:

1. Create a free Turso database and copy its URL + auth token.
2. Push code to GitHub.
3. Import into Vercel (free).
4. Set three env vars in Vercel: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXT_PUBLIC_BASE_URL`.
5. Deploy. The app is at `https://<project-name>.vercel.app`.

## Before the event — customize these

In `app/claim/page.tsx`, find and replace:

```ts
const REGISTRATION_URL = "#registration-link-placeholder"; // ← your Google Form / Luma / Discord invite
```

The reveal also mentions a "**free sticker**" (line 95) — edit that merch wording if needed:

```ts
<p className="merch">Show this screen to a CodeCatalyst member to grab your <b>free sticker</b>!</p>
```

Update `NEXT_PUBLIC_BASE_URL` in your deploy environment or `.env` so the QR poster encodes
the correct public URL where the app is hosted.

## Credits

Design system adopted from the CodeCatalyst booklet (`github.com/xcb3d/coca-booklet`):
navy→indigo→teal palette, Orbitron/Manrope type, and the `coca-logo` mark.
