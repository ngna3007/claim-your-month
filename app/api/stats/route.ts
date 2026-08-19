import { getStats } from "@/lib/db";
import { clientIp, jsonError, jsonOk, rateLimit } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!rateLimit(`stats:${clientIp(req)}`, 90, 60_000)) {
    return jsonError(429, "too many requests");
  }
  try {
    return jsonOk(await getStats());
  } catch (err) {
    console.error(err);
    return jsonError(503, "unavailable");
  }
}
