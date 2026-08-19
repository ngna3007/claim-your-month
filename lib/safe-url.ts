/** http(s) only. Rejects javascript:, data:, and URLs with credentials. */
export function safeHttpUrl(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}
