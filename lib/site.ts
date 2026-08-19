function publicEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Join / registration URL. Empty until set in env; hide the CTA when missing. */
export const joinUrl = publicEnv("NEXT_PUBLIC_JOIN_URL");

/** Label on the join button. Used only when `joinUrl` is set. */
export const joinLabel = publicEnv("NEXT_PUBLIC_JOIN_LABEL") || "Come join us";

/** Reveal merch line. Override with NEXT_PUBLIC_MERCH; set that to empty to hide. */
export const merch =
  process.env.NEXT_PUBLIC_MERCH === undefined
    ? "Show this screen to a CodeCatalyst member to grab your free gift."
    : publicEnv("NEXT_PUBLIC_MERCH");
