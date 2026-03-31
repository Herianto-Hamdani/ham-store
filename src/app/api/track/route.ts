import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildVisitorHash,
  normalizeTrackedPath,
  recordPublicVisit
} from "@/lib/data/traffic";

const TRACK_RATE_LIMIT_WINDOW_MS = 60_000;
const TRACK_RATE_LIMIT_MAX_REQUESTS = 30;
const trackRequests = new Map<string, { count: number; resetAt: number }>();

const TrackPayloadSchema = z.object({
  pathname: z.string().trim().min(1).max(160)
});

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return (forwardedFor || realIp || "unknown").slice(0, 64);
}

function getTrackRateKey(ip: string, userAgent: string) {
  if (ip !== "unknown") {
    return `ip:${ip}`;
  }

  return `ua:${buildVisitorHash("unknown", userAgent).slice(0, 16)}`;
}

function isTrackRateLimited(key: string) {
  const now = Date.now();

  if (trackRequests.size > 500) {
    for (const [entryKey, entry] of trackRequests) {
      if (entry.resetAt <= now) {
        trackRequests.delete(entryKey);
      }
    }
  }

  const existing = trackRequests.get(key);
  if (!existing || existing.resetAt <= now) {
    trackRequests.set(key, {
      count: 1,
      resetAt: now + TRACK_RATE_LIMIT_WINDOW_MS
    });
    return false;
  }

  existing.count += 1;
  return existing.count > TRACK_RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsedPayload = TrackPayloadSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        { ok: false, error: "Payload tracking tidak valid." },
        { status: 400 }
      );
    }

    const pathname = normalizeTrackedPath(parsedPayload.data.pathname);
    if (!pathname) {
      return NextResponse.json(
        { ok: false, error: "Path tracking tidak diizinkan." },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const userAgent = (request.headers.get("user-agent") || "unknown").slice(0, 256);

    if (isTrackRateLimited(getTrackRateKey(ip, userAgent))) {
      return NextResponse.json(
        { ok: false, error: "Terlalu banyak permintaan tracking." },
        { status: 429 }
      );
    }

    await recordPublicVisit(pathname, buildVisitorHash(ip, userAgent));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/track] gagal merekam kunjungan", {
      error: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json(
      { ok: false, error: "Gagal merekam kunjungan." },
      { status: 500 }
    );
  }
}
