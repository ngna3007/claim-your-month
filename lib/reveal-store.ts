const KEY = "cym-reveal";

export type RevealRecord = { rank: number; scans: number; phished: number };

function finiteCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function readReveal(): RevealRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<RevealRecord>;
    if (typeof data.rank !== "number" || !Number.isFinite(data.rank) || data.rank < 1) return null;
    return {
      rank: data.rank,
      scans: finiteCount(data.scans),
      phished: finiteCount(data.phished),
    };
  } catch {
    return null;
  }
}

export function writeReveal(data: RevealRecord): void {
  if (!Number.isFinite(data.rank) || data.rank < 1) return;
  window.localStorage.setItem(KEY, JSON.stringify({
    rank: data.rank,
    scans: finiteCount(data.scans),
    phished: finiteCount(data.phished),
  }));
}
