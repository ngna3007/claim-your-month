# Deployment Guide: Free Vercel + Turso

This app runs on **Vercel Hobby** (free tier) with **Turso** (free libSQL database). No credit card or domain needed.

## 1. Create a Turso Database

Visit [turso.tech](https://turso.tech) and sign up (free, GitHub login supported).

Create a new database:
```bash
turso db create phishing-for-welcome
```

Or use the web console to create it.

**Copy the database URL** — you'll need it in step 4.

Then create an auth token:
```bash
turso db tokens create phishing-for-welcome
```

**Copy the auth token** — you'll need it in step 4.

## 2. Push to GitHub

Initialize git and push to a new GitHub repo:
```bash
git remote add origin https://github.com/<your-username>/phishing-for-welcome.git
git branch -M main
git push -u origin main
```

## 3. Import into Vercel

1. Go to [vercel.com](https://vercel.com).
2. Sign in or create a free account.
3. Click **"Add New" → "Project"**.
4. Import from GitHub: search for `phishing-for-welcome` and click **Import**.
5. Accept defaults and click **Deploy**.

Vercel builds and deploys. After a minute or two, you'll see your app at:
```
https://<project-name>.vercel.app
```

(The exact URL is shown in the Vercel dashboard.)

## 4. Set Environment Variables in Vercel

In the Vercel dashboard:
1. Go to your project **Settings → Environment Variables**.
2. Add three variables:

| Key | Value |
|-----|-------|
| `TURSO_DATABASE_URL` | Paste the URL from step 1 |
| `TURSO_AUTH_TOKEN` | Paste the auth token from step 1 |
| `NEXT_PUBLIC_BASE_URL` | `https://<project-name>.vercel.app` (from step 3) |

Save and **redeploy** (or click the deploy button).

## 5. Verify Deployment

The app should now work at `https://<project-name>.vercel.app`.

- Visit `/` — see the QR poster.
- Scan or visit `/claim` — fill the fake form and submit.
- See the on-screen phish reveal with stats.
- Visit `/dashboard` — see the live organizer view (anonymous counts + chart).

The database schema (`events` table) **self-creates on first request** — no manual setup needed.

## 6. Update QR to Point to the Correct URL (Optional)

If you redeploy later and the Vercel URL changes, update `NEXT_PUBLIC_BASE_URL` and redeploy:

```bash
# In Vercel dashboard or locally:
export NEXT_PUBLIC_BASE_URL=https://<new-url>.vercel.app
npm run build && npm run start
```

The QR poster on `/` will re-encode to point to the new URL on the next deploy.

## Notes

- **No custom domain or payment needed** — Vercel Hobby is free and gives you a `.vercel.app` domain.
- **Local dev**: Leave `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` unset in `.env` (or `.env.local`). The app falls back to `file:./dev.db` for local testing.
- **Turso free tier**: 9GB storage, 1 million read requests per month, 100k write requests per month. More than enough for a recruiting event.
- **Anonymity guaranteed**: The form fields (name, email, student ID) are never sent or stored — only anonymous event counts.
