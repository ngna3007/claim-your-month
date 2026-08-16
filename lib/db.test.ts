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
