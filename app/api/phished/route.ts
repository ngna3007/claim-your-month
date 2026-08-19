import { recordPhished } from "@/lib/db";
import { guardWrite, jsonError, jsonOk } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = guardWrite(req, { name: "phished", limit: 120 });
  if (blocked) return blocked;
  try {
    return jsonOk(await recordPhished());
  } catch (err) {
    console.error(err);
    return jsonError(503, "unavailable");
  }
}
