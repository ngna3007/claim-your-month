import { NextResponse } from "next/server";
import { recordEvent } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST() {
  recordEvent("phished");
  return NextResponse.json({ ok: true });
}
