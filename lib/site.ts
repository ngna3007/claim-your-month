function publicEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Join / registration URL. Empty until set in env; hide the CTA when missing. */
export const joinUrl = publicEnv("NEXT_PUBLIC_JOIN_URL");

/** Label on the join button. Used only when `joinUrl` is set. */
export const joinLabel = publicEnv("NEXT_PUBLIC_JOIN_LABEL") || "Come join us";

/** Reveal merch line. Empty until set in env; hide the line when missing. */
export const merch = publicEnv("NEXT_PUBLIC_MERCH");
