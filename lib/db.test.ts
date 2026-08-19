import { afterAll, expect, test } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";

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

test("getStats buckets phished events into correct 15-minute windows (integer-safe regression)", async () => {
  const BUCKET_MS = 15 * 60 * 1000;

  // Timestamps chosen far from "now" (year-2026 epoch ms) so they can never land in the
  // same bucket as the phished events the earlier tests recorded via Date.now().
  const T = 1_000 * BUCKET_MS; // an exact 15-min boundary
  const windowAStart = T;
  const windowBStart = T + BUCKET_MS;
  const tsA1 = T;
  const tsA2 = T + 60_000; // same window as tsA1 (60s later, still < 15min)
  const tsB1 = T + 16 * 60_000; // one window over: 900000 + 60000 ms into window B

  // Reuse the same temp DB the module-level client is already pointed at (set at the top
  // of this file) via a second, independent connection so we can insert rows with exact,
  // known timestamps rather than relying on Date.now().
  const raw = createClient({ url: process.env.TURSO_DATABASE_URL! });
  try {
    await raw.execute(
      `CREATE TABLE IF NOT EXISTS events (
         id   INTEGER PRIMARY KEY AUTOINCREMENT,
         type TEXT NOT NULL CHECK (type IN ('scan','phished')),
         ts   INTEGER NOT NULL
       );`,
    );
    for (const ts of [tsA1, tsA2, tsB1]) {
      await raw.execute({
        sql: "INSERT INTO events (type, ts) VALUES ('phished', ?)",
        args: [ts],
      });
    }
  } finally {
    raw.close();
  }

  const stats = await getStats();

  const ours = stats.series.filter((p) => p.t === windowAStart || p.t === windowBStart);
  expect(ours).toHaveLength(2);
  expect(ours[0]).toEqual({ t: windowAStart, count: 2 });
  expect(ours[1]).toEqual({ t: windowBStart, count: 1 });
  expect(ours[0].t).toBeLessThan(ours[1].t);

  // Sanity-check the flooring formula matches what the bucket boundaries should be.
  expect(windowAStart).toBe(Math.floor(tsA1 / 900_000) * 900_000);
  expect(windowAStart).toBe(Math.floor(tsA2 / 900_000) * 900_000);
  expect(windowBStart).toBe(Math.floor(tsB1 / 900_000) * 900_000);
});

test("recordPhished records a matching scan when none exist", async () => {
  const raw = createClient({ url: process.env.TURSO_DATABASE_URL! });
  try {
    await raw.execute("DELETE FROM events");
  } finally {
    raw.close();
  }
  const result = await recordPhished();
  expect(result).toEqual({ rank: 1, scans: 1, phished: 1 });
});

test("getStats never reports a phishRate above 1", async () => {
  const raw = createClient({ url: process.env.TURSO_DATABASE_URL! });
  try {
    await raw.execute("DELETE FROM events");
    await raw.execute({
      sql: "INSERT INTO events (type, ts) VALUES ('phished', ?), ('phished', ?)",
      args: [1, 2],
    });
  } finally {
    raw.close();
  }
  const stats = await getStats();
  expect(stats.phished).toBe(2);
  expect(stats.scans).toBe(0);
  expect(stats.phishRate).toBe(1);
});
