import { NextResponse } from "next/server";
import { verifySecurityPin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pin?: string };
    const valid = await verifySecurityPin(String(body.pin ?? ""));
    return NextResponse.json({ valid }, { status: valid ? 200 : 401 });
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}
