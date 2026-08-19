import { NextResponse } from "next/server";

const noStore = { headers: { "Cache-Control": "no-store" } };

export function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status, ...noStore });
}

export function jsonOk(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, ...noStore });
}

export function hasEmptyBody(req: Request): boolean {
  const len = req.headers.get("content-length");
  if (len === null || len === "") return true;
  const n = Number(len);
  return Number.isFinite(n) && n <= 0;
}

export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export function isCrossSite(req: Request): boolean {
  return req.headers.get("sec-fetch-site") === "cross-site";
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  return req.headers.get("x-real-ip")?.trim().slice(0, 128) || "unknown";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

/** Shared write-path checks: no body (no PII), same origin, not a flood. */
export function guardWrite(
  req: Request,
  opts: { name: string; limit: number; windowMs?: number },
): NextResponse | null {
  if (!hasEmptyBody(req)) return jsonError(400, "empty body required");
  if (!isAllowedOrigin(req) || isCrossSite(req)) return jsonError(403, "forbidden");
  const windowMs = opts.windowMs ?? 60_000;
  if (!rateLimit(`${opts.name}:${clientIp(req)}`, opts.limit, windowMs)) {
    return jsonError(429, "too many requests");
  }
  return null;
}
