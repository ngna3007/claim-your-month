# Claim your month

A CodeCatalyst booth flow. Someone sees a QR promising a free month of Claude Pro,
lands on a plain claim form, and types a name and email. Nothing they type is stored.
On submit the club identity drops in: *You just got phished.* The screen shows their
rank, live counts, a short note on what that kind of offer is, and a prompt to show
the screen to a member for a **free sticker**.

The QR poster and the form stay anonymous on purpose. No logo, no club palette, no
club name, until the reveal.

Anonymous counts (page opens and form submits) are stored so the booth can put
numbers on a screen. **No personal data is collected.**

## Pages

- `/` — unbranded claim form (name, email; never sent to the server). This is
  what the printed QR opens. Submit records an anonymous count and opens the
  reveal: CodeCatalyst lockup, rank, stat tiles, insight box, sticker CTA.
- `/qr` — poster for print or a booth screen. The QR encodes the site root.
- `/claim` — redirects to `/` so old links still work.
- `/dashboard` — organizer view. Tiles plus a submits-over-time chart, polling
  every 4 seconds. Safe to leave on a booth screen.

## API

- `POST /api/scan` — records a `/` page load (once per mount; a refresh
  counts again). No PII.
- `POST /api/phished` — records a form submit. Returns `{ rank, scans, phished }`
  so the client can show "You're phish #N".
- `GET /api/stats` — returns `{ scans, phished, phishRate, series }`. `series`
  is time-bucketed submit counts for the dashboard chart.

Events live in **Turso** (free libSQL). Locally the app uses `file:./dev.db`
so you can run offline.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
# or a production build:
npm run build && npm run start
```

Local dev uses `file:./dev.db` (git-ignored) unless you set `TURSO_DATABASE_URL`
and `TURSO_AUTH_TOKEN` in `.env.local`.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for a free **Vercel Hobby** + **Turso** setup.
No credit card, custom domain, or manual schema step. The tables create
themselves on the first request.

The public URL is the slug students can read under the QR. Keep the Vercel
project named something that looks like a giveaway, for example
`claim-your-month` → `https://claim-your-month.vercel.app`.

1. Create a free Turso database and copy its URL + auth token.
2. Push this repo to GitHub.
3. Import into Vercel (free).
4. Set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `NEXT_PUBLIC_BASE_URL`.
5. Deploy.

## Before the booth

Copy `.env.example` to `.env.local` (or set the same keys in Vercel).
`NEXT_PUBLIC_*` values are baked in at build time, so change them and
redeploy.

| Key | Required | What it does |
|-----|----------|----------------|
| `NEXT_PUBLIC_BASE_URL` | yes, in production | Host the poster QR encodes (the site root) |
| `NEXT_PUBLIC_JOIN_URL` | no | Reveal "join us" link. Hidden until set. |
| `NEXT_PUBLIC_JOIN_LABEL` | no | Button text. Defaults to `Come join us`. |
| `NEXT_PUBLIC_MERCH` | no | Line under the reassurance. Hidden until set. |

Example:

```bash
NEXT_PUBLIC_BASE_URL=https://claim-your-month.vercel.app
NEXT_PUBLIC_JOIN_URL=https://example.com/join
NEXT_PUBLIC_JOIN_LABEL=Come join us
NEXT_PUBLIC_MERCH=Show this screen to a CodeCatalyst member to grab your free sticker.
```

## Credits

Reveal and dashboard use the CodeCatalyst booklet system
(`github.com/xcb3d/coca-booklet`): navy → indigo → teal, Orbitron / Manrope,
and the `coca-logo` mark. The poster and form do not.
