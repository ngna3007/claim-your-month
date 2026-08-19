export type Totals = { scans: number; phished: number };

function finiteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Whole-number 0–100 rate. A phish with no recorded scans counts as 100%. */
export function phishRatePercent(phished: number, scans: number): number {
  if (phished <= 0) return 0;
  if (scans <= 0) return 100;
  return Math.min(100, Math.round((phished / scans) * 100));
}

/** Bar width. Zero stays empty; tiny non-zero rates get a 6% sliver. */
export function barFillPercent(phished: number, scans: number): number {
  const raw = phishRatePercent(phished, scans);
  if (raw <= 0) return 0;
  return Math.min(100, Math.max(6, raw));
}

export function mergeLiveTotals(prev: Totals, incoming: Partial<Totals> | Record<string, unknown>): Totals {
  return {
    scans: finiteNumber(incoming.scans) ?? prev.scans,
    phished: finiteNumber(incoming.phished) ?? prev.phished,
  };
}

export function parsePhishedResponse(data: unknown): { rank: number; scans: number; phished: number } | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const rank = finiteNumber(record.rank);
  if (rank === null || rank < 1) return null;
  return {
    rank,
    scans: finiteNumber(record.scans) ?? 0,
    phished: finiteNumber(record.phished) ?? 0,
  };
}
