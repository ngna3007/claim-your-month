# Phishing for Welcome

A phishing-awareness recruitment stunt for **CodeCatalyst**. Students scan a QR promising
free Claude Pro, land on a branded "claim your gift" page, click **Claim now**, celebrate a
confetti "claim complete" moment, and download their "gift code" as a `.txt`. There is no
real code — the file they open is the friendly reveal: *you just got phished, by
CodeCatalyst. You scanned a stranger's QR and downloaded a file from it — that's how malware
lands. This is your welcome surprise for the workshop.* Nothing on screen gives it away; the
lesson lands when they open the file, mirroring the real attack.

Anonymous engagement counts (scans, clicks) are tallied so the club can reuse the numbers
as post-event content. **No personal data is collected.**

## Pages
- `/` — the QR poster (print it or show it on a screen). The QR points to `/claim`.
- `/claim` — the branded bait; **Claim now** fires a confetti "claim complete" modal that
  hands over `claude-pro-giftcode.txt` to download. The reveal lives inside that file.

## API
- `POST /api/scan` — records a `/claim` page open.
- `POST /api/phished` — records a "Claim now" click.
- `GET /api/stats` — `{ scans, phished, phishRate }`.

Events are stored in a local SQLite file `stats.db` (git-ignored).

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
# or a production build:
npm run build && npm run start
```

## Deploy
Set `NEXT_PUBLIC_BASE_URL` to the public URL so the poster's QR encodes the right host,
then deploy to a **persistent** host (Render / Railway / a VPS) so `stats.db` survives.
On Vercel's ephemeral filesystem, swap `lib/db.ts` for a hosted store (KV / Postgres) —
the API surface stays the same.

## Before the event — one thing to swap
In `app/claim/page.tsx`, replace the placeholder registration link:
```ts
const REGISTRATION_URL = "#registration-link-placeholder"; // ← your Google Form / Luma / Discord
```
The reveal wording lives right above it in `giftFileContents()` — edit that string to
change what people read when they open `claude-pro-giftcode.txt`.

## Credits
Design system adopted from the CodeCatalyst booklet (`github.com/xcb3d/coca-booklet`):
navy→indigo→teal palette, Orbitron/Manrope type, and the `coca-logo` mark.
