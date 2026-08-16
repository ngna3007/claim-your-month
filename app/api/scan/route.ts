import { NextResponse } from "next/server";
import { recordScan } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await recordScan();
  return NextResponse.json({ ok: true });
}
