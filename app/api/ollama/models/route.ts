import { NextResponse } from "next/server";
import { CHAT_MODEL_IDS } from "@/lib/chatModels";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ models: CHAT_MODEL_IDS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
