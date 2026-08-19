import { recordScan } from "@/lib/db";
import { guardWrite, jsonError, jsonOk } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = guardWrite(req, { name: "scan", limit: 180 });
  if (blocked) return blocked;
  try {
    await recordScan();
    return jsonOk({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonError(503, "unavailable");
  }
}
