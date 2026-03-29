import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function buildVisitorHash(ip: string, userAgent: string) {
  return createHash("sha1").update(`${ip}|${userAgent}`).digest("hex");
}

export async function recordPublicVisit(pathname: string, visitorHash: string) {
  if (!pathname || pathname.startsWith("/admin")) {
    return;
  }

  await prisma.trafficEvent.create({
    data: {
      path: pathname,
      visitorHash
    }
  });
}

type TrafficSummaryRow = {
  today_hits: bigint;
  today_unique: bigint;
  window_hits: bigint;
  window_unique: bigint;
  total_hits: bigint;
  total_unique: bigint;
};

export async function getTrafficSummary(days = 7) {
  const safeDays = Math.max(1, Math.min(days, 60));
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (safeDays - 1));
  start.setUTCHours(0, 0, 0, 0);

  const [row] = await prisma.$queryRaw<TrafficSummaryRow[]>(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::bigint AS today_hits,
      COUNT(DISTINCT visitor_hash) FILTER (WHERE created_at >= CURRENT_DATE)::bigint AS today_unique,
      COUNT(*) FILTER (WHERE created_at >= ${start})::bigint AS window_hits,
      COUNT(DISTINCT visitor_hash) FILTER (WHERE created_at >= ${start})::bigint AS window_unique,
      COUNT(*)::bigint AS total_hits,
      COUNT(DISTINCT visitor_hash)::bigint AS total_unique
    FROM traffic_events
  `);

  return {
    todayHits: Number(row?.today_hits ?? 0n),
    todayUnique: Number(row?.today_unique ?? 0n),
    windowDays: safeDays,
    windowHits: Number(row?.window_hits ?? 0n),
    windowUnique: Number(row?.window_unique ?? 0n),
    totalHits: Number(row?.total_hits ?? 0n),
    totalUnique: Number(row?.total_unique ?? 0n)
  };
}

type RecentTrafficRow = {
  date: Date;
  hits: bigint;
  unique_hits: bigint;
};

export async function getRecentTraffic(days = 7) {
  const safeDays = Math.max(1, Math.min(days, 60));
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (safeDays - 1));
  start.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.$queryRaw<RecentTrafficRow[]>(Prisma.sql`
    SELECT
      day::date AS date,
      COALESCE(COUNT(te.id), 0)::bigint AS hits,
      COALESCE(COUNT(DISTINCT te.visitor_hash), 0)::bigint AS unique_hits
    FROM generate_series(${start}::timestamp, CURRENT_DATE::timestamp, interval '1 day') AS day
    LEFT JOIN traffic_events te
      ON te.created_at >= day
     AND te.created_at < day + interval '1 day'
    GROUP BY day
    ORDER BY day ASC
  `);

  return rows.map((row) => ({
    date: toDateKey(row.date),
    hits: Number(row.hits),
    unique: Number(row.unique_hits)
  }));
}

type TopPageRow = {
  path: string;
  hits: bigint;
};

export async function getTopPages(limit = 20) {
  const safeLimit = Math.max(1, Math.min(limit, 300));

  const rows = await prisma.$queryRaw<TopPageRow[]>(Prisma.sql`
    SELECT
      path,
      COUNT(*)::bigint AS hits
    FROM traffic_events
    GROUP BY path
    ORDER BY hits DESC, path ASC
    LIMIT ${safeLimit}
  `);

  return rows.map((row) => ({
    path: row.path,
    hits: Number(row.hits)
  }));
}
