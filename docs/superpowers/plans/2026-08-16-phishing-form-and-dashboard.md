# Phishing Form + Insight + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `/claim` flow into a fake claim-form whose submit triggers an on-screen phishing reveal ("you're phish #XX") with a visualization and a what-is-phishing insight box, backed by an anonymous event tally that survives on free Vercel and feeds a live organizer dashboard.

**Architecture:** Next.js App Router app. Persistence moves from a local `better-sqlite3` file to **Turso (libSQL)** via `@libsql/client` (same `events(type, ts)` schema; `file:` locally, Turso in prod). API routes stay thin; `/api/phished` returns the submitter's rank. `/claim` and `/dashboard` render hand-rolled SVG/CSS visualizations of anonymous data only.

**Tech Stack:** Next.js 15, React 19, TypeScript, `@libsql/client`, `qrcode`, Vitest (db unit tests), Playwright MCP (UI e2e).

**Spec:** `docs/superpowers/specs/2026-08-16-phishing-form-and-dashboard-design.md`

## Global Constraints

- **No PII persisted or transmitted.** Name/email/student-ID are bait; on submit their values are neither read for sending nor included in any request body. Server never logs request bodies. Only `scan` / `phished` events + timestamps are stored.
- **Fields are optional;** submit works with all fields blank.
- **Persistence:** `@libsql/client` only. `better-sqlite3` and `@types/better-sqlite3` must be removed. Local dev uses `file:./dev.db` when `TURSO_DATABASE_URL` is unset.
- **Env vars:** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXT_PUBLIC_BASE_URL`.
- **Reveal is on-screen, immediate, friendly** (K–8 tone); it states we saved nothing typed.
- **Design system:** CodeCatalyst tokens — navy `#243d71`, indigo `#494996`, teal `#32aab2`, teal-bright `#4fd1da`; Orbitron display + Manrope body. Confetti canvas reused (brand palette, reduced-motion aware).
- **Before building any chart/stat-tile (Tasks 3 & 4): load the `dataviz` skill** and follow its palette/mark/stat-tile conventions.
- Every route handler: `export const runtime = "nodejs"; export const dynamic = "force-dynamic";`.

---

### Task 1: Swap persistence to libSQL; add rank + time-series

**Files:**
- Modify: `package.json` (deps)
- Modify: `next.config.js` (drop `serverExternalPackages`)
- Rewrite: `lib/db.ts`
- Create: `vitest.config.ts`
- Create: `lib/db.test.ts`
- Modify: `.gitignore` (add `dev.db*`)

**Interfaces:**
- Produces:
  - `recordScan(): Promise<void>`
  - `recordPhished(): Promise<{ rank: number; scans: number; phished: number }>`
  - `getStats(): Promise<{ scans: number; phished: number; phishRate: number; series: { t: number; count: number }[] }>`
  - `series` buckets `phished` events into 15-minute windows: `t` = window start (ms epoch), `count` = phished in that window, ordered ascending.

- [ ] **Step 1: Update dependencies**

In `package.json`, remove `"better-sqlite3"` from `dependencies` and `"@types/better-sqlite3"` from `devDependencies`; add to `dependencies` `"@libsql/client": "^0.14.0"`; add to `devDependencies` `"vitest": "^2.1.0"`. Add script `"test": "vitest run"`. Then:

Run: `cd "/Users/rowanng/Development/Phishing for welcome" && npm install`
Expected: installs `@libsql/client` and `vitest`, removes better-sqlite3.

- [ ] **Step 2: Drop the native-module config**

Replace `next.config.js` with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `lib/db.test.ts`. It points the db at a fresh temp file BEFORE importing the module (the client reads the URL lazily at first use):

```ts
import { afterAll, beforeAll, expect, test } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "phish-db-"));
process.env.TURSO_DATABASE_URL = "file:" + join(dir, "test.db");
delete process.env.TURSO_AUTH_TOKEN;

// Import AFTER env is set so the lazy client uses the temp file.
const { recordScan, recordPhished, getStats } = await import("./db");

afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("recordPhished returns an incrementing rank and live totals", async () => {
  await recordScan();
  await recordScan();
  const first = await recordPhished();
  expect(first).toEqual({ rank: 1, scans: 2, phished: 1 });
  const second = await recordPhished();
  expect(second.rank).toBe(2);
  expect(second.phished).toBe(2);
});

test("getStats reports rate and a phished time-series", async () => {
  const stats = await getStats();
  expect(stats.scans).toBe(2);
  expect(stats.phished).toBe(2);
  expect(stats.phishRate).toBeCloseTo(1);
  expect(stats.series.reduce((a, b) => a + b.count, 0)).toBe(2);
  expect(stats.series.every((p) => typeof p.t === "number")).toBe(true);
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `cd "/Users/rowanng/Development/Phishing for welcome" && npx vitest run lib/db.test.ts`
Expected: FAIL (current `lib/db.ts` exports sync `recordEvent`/`getStats`, not `recordScan`/`recordPhished`).

- [ ] **Step 6: Rewrite `lib/db.ts`**

```ts
import { createClient, type Client } from "@libsql/client";

// One shared client (cached on globalThis so dev hot-reload doesn't leak clients).
// Local dev falls back to a file DB; production uses Turso env vars.
const g = globalThis as unknown as { _libsql?: Client; _libsqlInit?: Promise<void> };

function client(): Client {
  if (g._libsql) return g._libsql;
  const url = process.env.TURSO_DATABASE_URL ?? "file:./dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  g._libsql = createClient({ url, authToken });
  return g._libsql;
}

function init(): Promise<void> {
  if (!g._libsqlInit) {
    g._libsqlInit = client()
      .execute(
        `CREATE TABLE IF NOT EXISTS events (
           id   INTEGER PRIMARY KEY AUTOINCREMENT,
           type TEXT NOT NULL CHECK (type IN ('scan','phished')),
           ts   INTEGER NOT NULL
         );`,
      )
      .then(() => undefined);
  }
  return g._libsqlInit;
}

async function count(type: "scan" | "phished"): Promise<number> {
  const r = await client().execute({
    sql: "SELECT COUNT(*) AS c FROM events WHERE type = ?",
    args: [type],
  });
  return Number(r.rows[0].c);
}

export async function recordScan(): Promise<void> {
  await init();
  await client().execute({
    sql: "INSERT INTO events (type, ts) VALUES ('scan', ?)",
    args: [Date.now()],
  });
}

export async function recordPhished(): Promise<{ rank: number; scans: number; phished: number }> {
  await init();
  await client().execute({
    sql: "INSERT INTO events (type, ts) VALUES ('phished', ?)",
    args: [Date.now()],
  });
  const [phished, scans] = await Promise.all([count("phished"), count("scan")]);
  return { rank: phished, scans, phished };
}

const BUCKET_MS = 15 * 60 * 1000; // 15-minute windows

export async function getStats(): Promise<{
  scans: number;
  phished: number;
  phishRate: number;
  series: { t: number; count: number }[];
}> {
  await init();
  const [phished, scans] = await Promise.all([count("phished"), count("scan")]);
  const rows = await client().execute({
    sql: `SELECT (ts / ?) * ? AS bucket, COUNT(*) AS c
          FROM events WHERE type = 'phished'
          GROUP BY bucket ORDER BY bucket`,
    args: [BUCKET_MS, BUCKET_MS],
  });
  const series = rows.rows.map((r) => ({ t: Number(r.bucket), count: Number(r.c) }));
  return { scans, phished, phishRate: scans > 0 ? phished / scans : 0, series };
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd "/Users/rowanng/Development/Phishing for welcome" && npx vitest run lib/db.test.ts`
Expected: PASS (both tests).

- [ ] **Step 8: Ignore the local dev DB**

Add `dev.db*` to `.gitignore` (the old `*.db*` line already covers it; add explicitly if absent). Confirm `stats.db*` artifacts are not committed.

- [ ] **Step 9: Commit**

```bash
cd "/Users/rowanng/Development/Phishing for welcome"
git add package.json package-lock.json next.config.js lib/db.ts lib/db.test.ts vitest.config.ts .gitignore
git commit -m "feat: move tally to libSQL; add phished rank + time-series"
```

---

### Task 2: Update API routes to async + return rank

**Files:**
- Modify: `app/api/scan/route.ts`
- Modify: `app/api/phished/route.ts`
- Modify: `app/api/stats/route.ts`

**Interfaces:**
- Consumes: `recordScan`, `recordPhished`, `getStats` from Task 1.
- Produces: `POST /api/phished` → JSON `{ rank, scans, phished }`; `POST /api/scan` → `{ ok: true }`; `GET /api/stats` → `{ scans, phished, phishRate, series }`.

- [ ] **Step 1: Rewrite `app/api/scan/route.ts`**

```ts
import { NextResponse } from "next/server";
import { recordScan } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await recordScan();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Rewrite `app/api/phished/route.ts`**

```ts
import { NextResponse } from "next/server";
import { recordPhished } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Body is ignored on purpose: the fake form's field values are never sent or read.
export async function POST() {
  const result = await recordPhished();
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Rewrite `app/api/stats/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getStats } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getStats());
}
```

- [ ] **Step 4: Verify via the running dev server**

```bash
cd "/Users/rowanng/Development/Phishing for welcome"
rm -f ./dev.db ./dev.db-shm ./dev.db-wal 2>/dev/null
# start dev server (background), then:
curl -s -X POST http://localhost:3000/api/scan
curl -s -X POST http://localhost:3000/api/phished
curl -s http://localhost:3000/api/stats
```
Expected: phished POST returns `{"rank":1,"scans":1,"phished":1}`; stats returns those totals plus a non-empty `series`.

- [ ] **Step 5: Commit**

```bash
git add app/api
git commit -m "feat: async API routes; /api/phished returns rank"
```

---

### Task 3: Rebuild `/claim` — bait form → on-screen reveal

**Pre-req:** Load the `dataviz` skill before writing the stat tiles/bar.

**Files:**
- Rewrite: `app/claim/page.tsx`
- Modify: `app/globals.css` (form, reveal, stat-tiles, insight-box styles; keep confetti + `.overlay`/`.modal` if reused, else adapt)

**Interfaces:**
- Consumes: `POST /api/phished` → `{ rank, scans, phished }`.
- Produces: none (leaf page).

- [ ] **Step 1: Rewrite `app/claim/page.tsx`**

Keep the existing `Confetti` component (copy it forward unchanged) and the scan-on-mount effect. Replace the download flow with a form + reveal. Critical structure:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

const REGISTRATION_URL = "#registration-link-placeholder";

type Stats = { rank: number; scans: number; phished: number };

export default function ClaimPage() {
  const [result, setResult] = useState<Stats | null>(null);
  const scanReported = useRef(false);

  useEffect(() => {
    if (scanReported.current) return;
    scanReported.current = true;
    void fetch("/api/scan", { method: "POST" }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Ethics: the typed values are never read or sent. Empty POST only.
    let data: Stats = { rank: 0, scans: 0, phished: 0 };
    try {
      const res = await fetch("/api/phished", { method: "POST" });
      data = await res.json();
    } catch {
      /* offline: still reveal, with a zeroed rank */
    }
    setResult(data);
  }

  return (
    <main className="stage">
      {result ? <Reveal stats={result} /> : <BaitForm onSubmit={handleSubmit} />}
    </main>
  );
}
```

`BaitForm` renders the brand lockup, pitch, and three OPTIONAL inputs with no `name` wiring to state and an `onSubmit` handler:

```tsx
function BaitForm({ onSubmit }: { onSubmit: (e: React.FormEvent) => void }) {
  return (
    <section className="card promo">
      <Brand />
      <h1 className="promo__head">Get Claude Pro free for a month.</h1>
      <p className="promo__sub">Tell us where to send it and it&apos;s yours.</p>
      <form className="form" onSubmit={onSubmit}>
        <label className="field"><span>Full name</span>
          <input type="text" autoComplete="off" placeholder="Alex Nguyen" /></label>
        <label className="field"><span>Email</span>
          <input type="email" autoComplete="off" placeholder="alex@school.edu" /></label>
        <label className="field"><span>Student ID</span>
          <input type="text" autoComplete="off" placeholder="e.g. 100493" /></label>
        <button className="btn" type="submit">Claim my free month</button>
      </form>
      <p className="fine">For CodeCatalyst students. Limited to 50 gifts.</p>
    </section>
  );
}
```

`Reveal` shows confetti + count-up + viz + insight + reassurance + merch CTA:

```tsx
function Reveal({ stats }: { stats: Stats }) {
  const n = useCountUp(stats.rank);
  const rate = stats.scans > 0 ? Math.round((stats.phished / stats.scans) * 100) : 0;
  return (
    <div className="overlay">
      <Confetti />
      <section className="card reveal">
        <span className="badge badge--ok"><CheckIcon /> Gotcha</span>
        <h1 className="reveal__head">You just got phished.</h1>
        <p className="reveal__turn">Don&apos;t worry — it&apos;s a game, and you&apos;re in good company.</p>

        <p className="bignum">You&apos;re phish <b>#{n}</b> today</p>

        <div className="tiles">
          <Tile label="Scanned the QR" value={stats.scans} />
          <Tile label="Got phished" value={stats.phished} />
          <Tile label="Fell for it" value={`${rate}%`} />
        </div>
        <Bar phished={stats.phished} scans={stats.scans} />

        <div className="insight">
          <BulbIcon />
          <p><b>What is phishing?</b> A fake offer that tricks you into handing over your
          info. This one looked official and free — that&apos;s the trick. Always check
          who&apos;s really asking before you type anything.</p>
        </div>

        <p className="reassure">We didn&apos;t save your name, email, or ID. Promise.</p>
        <p className="merch">Show this screen to a CodeCatalyst member to grab your <b>free sticker</b>!</p>
        <a className="btn btn--teal" href={REGISTRATION_URL}>Come join us</a>
      </section>
    </div>
  );
}
```

Add helpers in the same file: `useCountUp(target)` (rAF ramp 0→target over ~900ms; returns `target` immediately when `matchMedia("(prefers-reduced-motion: reduce)").matches`), `Tile`, `Bar` (width `phished/scans*100%`, min 6% so it's visible), `BulbIcon` (drawn lightbulb SVG), and the existing `Brand`, `CheckIcon`, `Confetti`.

- [ ] **Step 2: Add styles to `app/globals.css`**

Guided by `dataviz`: `.form`/`.field` (stacked labels, inputs with `--line` borders, focus ring in teal), `.bignum` (Orbitron, large, teal `b`), `.tiles` (responsive grid of 3), `.tile` (value in tabular-nums, muted label), `.bar` (track + teal fill, animated width, reduced-motion aware), `.insight` (tinted panel, lightbulb accent), `.reassure`/`.merch` (small, friendly), reuse `.overlay`/`.modal`/`.badge--ok`/confetti. Keep the reveal celebratory and legible on the bright hero.

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/rowanng/Development/Phishing for welcome" && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: E2E verify (Playwright MCP), desktop + mobile**

With the dev server running and `dev.db` reset:
1. Navigate `/claim`; confirm `POST /api/scan` fired (stats `scans` +1).
2. Type junk into all three fields, then submit.
3. **Assert the `/api/phished` request had no body carrying the typed values** — capture the request via `browser_network_requests` / evaluate and confirm the POST body is empty (no "junk"). This is the ethics gate; it MUST pass.
4. Confirm reveal shows: count-up equals returned `rank`, three tiles, the bar, the insight box with the bulb, the reassurance line, and the merch CTA.
5. Submit again in a fresh load with all fields blank → still reveals (rank increments).
6. Screenshot desktop (1280×880) and mobile (390×844) for bait + reveal.

- [ ] **Step 5: Commit**

```bash
git add app/claim/page.tsx app/globals.css
git commit -m "feat: /claim bait form + on-screen phishing reveal with insight"
```

---

### Task 4: `/dashboard` — live anonymous organizer view

**Pre-req:** `dataviz` skill loaded (from Task 3).

**Files:**
- Create: `app/dashboard/page.tsx`
- Modify: `app/globals.css` (dashboard layout + time chart)

**Interfaces:**
- Consumes: `GET /api/stats` → `{ scans, phished, phishRate, series }`.
- Produces: none (leaf page).

- [ ] **Step 1: Create `app/dashboard/page.tsx`**

Client component that polls every 4s and renders anonymous stats only:

```tsx
"use client";

import { useEffect, useState } from "react";

type Stats = { scans: number; phished: number; phishRate: number; series: { t: number; count: number }[] };

export default function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/stats").then((r) => r.json()).then((d) => { if (alive) setS(d); }).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!s) return <main className="stage"><p className="dash__loading">Loading…</p></main>;
  const rate = Math.round(s.phishRate * 100);
  return (
    <main className="dash">
      <header className="dash__head">
        <h1>CodeCatalyst — live phish tally</h1>
        <p>Anonymous engagement. No personal data is collected.</p>
      </header>
      <div className="tiles tiles--dash">
        <Tile label="Scans" value={s.scans} />
        <Tile label="Phished" value={s.phished} />
        <Tile label="Fell for it" value={`${rate}%`} />
      </div>
      <TimeChart series={s.series} />
    </main>
  );
}
```

Add `Tile` (tabular-nums value + label) and `TimeChart` (inline SVG bar-per-15-min-bucket; label a couple of axis ticks; empty-state text when `series` is empty). Follow `dataviz` for palette/mark/axis.

- [ ] **Step 2: Add dashboard styles to `app/globals.css`**

`.dash` (centered column, generous padding, bright hero or clean surface), `.dash__head`, `.tiles--dash` (larger tiles), `.chart` (responsive SVG container with `overflow-x:auto`), bars in teal, faint grid, emphasized latest bar. Theme-consistent with the rest.

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/rowanng/Development/Phishing for welcome" && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: E2E verify (Playwright MCP)**

1. Navigate `/dashboard`; confirm tiles render current totals and the chart appears.
2. In another tab/route, POST `/api/phished` (or submit `/claim`), wait ≤4s, confirm the dashboard tile/chart updates on the next poll.
3. Screenshot desktop + mobile.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx app/globals.css
git commit -m "feat: live anonymous organizer dashboard"
```

---

### Task 5: Deploy docs, env sample, production build check

**Files:**
- Create: `DEPLOY.md`
- Create: `.env.example`
- Modify: `README.md`

**Interfaces:** none (docs/config).

- [ ] **Step 1: Create `.env.example`**

```bash
# Leave unset for local dev (falls back to file:./dev.db).
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
# The public URL the QR encodes (your Vercel domain in production).
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

- [ ] **Step 2: Write `DEPLOY.md`**

Document, as numbered steps: (1) create a free Turso DB (`turso db create` or the web UI), copy `TURSO_DATABASE_URL` and `turso db tokens create` → `TURSO_AUTH_TOKEN`; (2) push repo to GitHub; (3) import into Vercel (Hobby/free); (4) set the three env vars in Vercel; (5) deploy → the app is at `https://<project>.vercel.app`; (6) set `NEXT_PUBLIC_BASE_URL` to that URL and redeploy so the poster QR points at it; note no domain/payment needed and that the schema self-creates on first request.

- [ ] **Step 3: Update `README.md`**

Replace the SQLite-file/`.txt` description with the current flow (form → on-screen reveal + insight; `/dashboard`), the libSQL/Turso persistence, the anonymous-only guarantee, and a pointer to `DEPLOY.md`. Update the "before the event" swaps (`NEXT_PUBLIC_BASE_URL`, registration link, merch wording).

- [ ] **Step 4: Production build check**

Run: `cd "/Users/rowanng/Development/Phishing for welcome" && npm run build`
Expected: build succeeds with no better-sqlite3 references and no type errors.

- [ ] **Step 5: Commit**

```bash
git add DEPLOY.md .env.example README.md
git commit -m "docs: free Vercel + Turso deploy guide; env sample"
```

---

## Self-Review

**Spec coverage:** persistence swap + rank + series (Task 1) ✓; API rank (Task 2) ✓; bait form with optional fields + no-PII submit (Task 3) ✓; on-screen reveal with count-up, viz, insight box, reassurance, merch CTA (Task 3) ✓; dashboard (Task 4) ✓; deploy/free-Vercel + env + local `file:` fallback (Tasks 1 & 5) ✓; ethics no-PII network assertion (Task 3 Step 4) ✓; reduced-motion (Task 3 count-up/bar) ✓. Poster `/` unchanged (already encodes `NEXT_PUBLIC_BASE_URL`) — no task needed.

**Placeholder scan:** No TBD/TODO; test code and run commands are concrete; `REGISTRATION_URL` and merch wording are intentional, documented swaps.

**Type consistency:** `recordScan`/`recordPhished`/`getStats` signatures match across Tasks 1, 2, 3, 4; `Stats` shape (`rank/scans/phished`) consistent in `/claim`; dashboard `Stats` (`scans/phished/phishRate/series`) matches `getStats`; `series` `{t,count}` used identically in db, stats, and `TimeChart`.
