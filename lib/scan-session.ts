const KEY = "cym-scan";

/** True once per tab. Survives React Strict Mode remounts. */
export function shouldReportScan(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(KEY)) return false;
    window.sessionStorage.setItem(KEY, "1");
    return true;
  } catch {
    return true;
  }
}
