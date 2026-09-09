import { NextRequest, NextResponse } from "next/server";

// Transliterates English text to Hindi (Devanagari) using Google Input Tools.
// Falls back to empty string on any failure — the user can then type manually.
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text")?.trim() ?? "";
  if (!text) return NextResponse.json({ hindi: "" });

  try {
    const url = `https://inputtools.google.com/request?itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&text=${encodeURIComponent(
      text,
    )}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("bad status");
    const data = (await res.json()) as [string, [string, string[]][]];
    if (data[0] === "SUCCESS" && data[1]?.[0]?.[1]?.[0]) {
      return NextResponse.json({ hindi: data[1][0][1][0] });
    }
  } catch {
    // network blocked / timeout — silently fall back
  }
  return NextResponse.json({ hindi: "" });
}
