import { NextResponse } from "next/server";

import { buildVisitorHash, recordPublicVisit } from "@/lib/data/traffic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { pathname?: string };
    const pathname = typeof payload.pathname === "string" ? payload.pathname : "/";
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    await recordPublicVisit(pathname, buildVisitorHash(ip, userAgent));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
