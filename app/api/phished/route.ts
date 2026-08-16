import { NextResponse } from "next/server";
import { recordPhished } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Body is ignored on purpose: the fake form's field values are never sent or read.
export async function POST() {
  const result = await recordPhished();
  return NextResponse.json(result);
}
