import { expect, test } from "vitest";
import { barFillPercent, mergeLiveTotals, parsePhishedResponse, phishRatePercent } from "./stats-display";

test("phishRatePercent caps at 100 and treats a phish with no scans as 100%", () => {
  expect(phishRatePercent(0, 0)).toBe(0);
  expect(phishRatePercent(0, 4)).toBe(0);
  expect(phishRatePercent(3, 2)).toBe(100);
  expect(phishRatePercent(1, 0)).toBe(100);
  expect(phishRatePercent(1, 4)).toBe(25);
});

test("barFillPercent stays empty at 0% and slivers tiny non-zero rates", () => {
  expect(barFillPercent(0, 0)).toBe(0);
  expect(barFillPercent(0, 8)).toBe(0);
  expect(barFillPercent(1, 100)).toBe(6);
  expect(barFillPercent(1, 2)).toBe(50);
});

test("mergeLiveTotals accepts a real 0 instead of keeping the previous count", () => {
  expect(mergeLiveTotals({ scans: 6, phished: 4 }, { scans: 0, phished: 0 })).toEqual({
    scans: 0,
    phished: 0,
  });
  expect(mergeLiveTotals({ scans: 6, phished: 4 }, {})).toEqual({ scans: 6, phished: 4 });
});

test("parsePhishedResponse rejects a zeroed or malformed payload", () => {
  expect(parsePhishedResponse({ rank: 0, scans: 0, phished: 0 })).toBeNull();
  expect(parsePhishedResponse({ error: "unavailable" })).toBeNull();
  expect(parsePhishedResponse({ rank: 3, scans: 5, phished: 3 })).toEqual({
    rank: 3,
    scans: 5,
    phished: 3,
  });
});
