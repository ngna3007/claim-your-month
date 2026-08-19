const KEY = "cym-reveal";

export type RevealRecord = { rank: number; scans: number; phished: number };

export function readReveal(): RevealRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<RevealRecord>;
    if (typeof data.rank !== "number" || data.rank < 1) return null;
    return {
      rank: data.rank,
      scans: Number(data.scans) || 0,
      phished: Number(data.phished) || 0,
    };
  } catch {
    return null;
  }
}

export function writeReveal(data: RevealRecord): void {
  if (data.rank < 1) return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}
