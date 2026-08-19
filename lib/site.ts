import { safeHttpUrl } from "./safe-url";

function publicEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Site root the poster QR encodes. Env wins; otherwise the incoming host. */
export function publicSiteUrl(
  envBase: string | undefined,
  host: string | null,
  proto: string | null,
): string {
  const fromEnv = safeHttpUrl(envBase).replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const h = (host ?? "").trim() || "localhost:3000";
  const p = (proto ?? "").trim() || (h.startsWith("localhost") ? "http" : "https");
  const fallback = safeHttpUrl(`${p}://${h}`).replace(/\/$/, "");
  return fallback || "http://localhost:3000";
}

/** Join / registration URL. Empty until set in env; hide the CTA when missing. */
export const joinUrl = safeHttpUrl(publicEnv("NEXT_PUBLIC_JOIN_URL"));

/** Label on the join button. Used only when `joinUrl` is set. */
export const joinLabel = publicEnv("NEXT_PUBLIC_JOIN_LABEL") || "Come join us";

/** Reveal merch line. Override with NEXT_PUBLIC_MERCH; set that to empty to hide. */
export const merch =
  process.env.NEXT_PUBLIC_MERCH === undefined
    ? "Show this screen to a CodeCatalyst member to grab your free gift."
    : publicEnv("NEXT_PUBLIC_MERCH");
