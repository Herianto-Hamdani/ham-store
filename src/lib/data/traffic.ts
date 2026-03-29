import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dateKeyToDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function buildVisitorHash(ip: string, userAgent: string) {
  return createHash("sha1").update(`${ip}|${userAgent}`).digest("hex");
}

export async function recordPublicVisit(pathname: string, visitorHash: string) {
  if (!pathname || pathname.startsWith("/admin")) {
    return;
  }

  const dateKey = toDateKey();
  const date = dateKeyToDate(dateKey);

  await prisma.$transaction(async (tx) => {
    await tx.trafficDailyMetric.upsert({
      where: { date },
      update: {
        hits: { increment: 1 }
      },
      create: {
        date,
        hits: 1,
        uniqueHits: 0
      }
    });

    await tx.trafficPageMetric.upsert({
      where: { path: pathname },
      update: {
        hits: { increment: 1 }
      },
      create: {
        path: pathname,
        hits: 1
      }
    });

    const existingVisitor = await tx.trafficVisitor.findUnique({
      where: {
        date_visitorHash: {
          date,
          visitorHash
        }
      }
    });

    if (existingVisitor) {
      await tx.trafficVisitor.update({
        where: {
          date_visitorHash: {
            date,
            visitorHash
          }
        },
        data: {
          hits: { increment: 1 }
        }
      });
      return;
    }

    await tx.trafficVisitor.create({
      data: {
        date,
        visitorHash,
        hits: 1
      }
    });

    await tx.trafficDailyMetric.update({
      where: { date },
      data: {
        uniqueHits: { increment: 1 }
      }
    });
  });
}

export async function getTrafficSummary(days = 7) {
  const safeDays = Math.max(1, Math.min(days, 60));
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (safeDays - 1));
  start.setUTCHours(0, 0, 0, 0);

  const [windowRows, totals, today] = await Promise.all([
    prisma.trafficDailyMetric.findMany({
      where: {
        date: {
          gte: start
        }
      }
    }),
    prisma.trafficDailyMetric.aggregate({
      _sum: {
        hits: true,
        uniqueHits: true
      }
    }),
    prisma.trafficDailyMetric.findUnique({
      where: {
        date: dateKeyToDate(toDateKey())
      }
    })
  ]);

  return {
    todayHits: today?.hits ?? 0,
    todayUnique: today?.uniqueHits ?? 0,
    windowDays: safeDays,
    windowHits: windowRows.reduce((sum, item) => sum + item.hits, 0),
    windowUnique: windowRows.reduce((sum, item) => sum + item.uniqueHits, 0),
    totalHits: totals._sum.hits ?? 0,
    totalUnique: totals._sum.uniqueHits ?? 0
  };
}

export async function getRecentTraffic(days = 7) {
  const safeDays = Math.max(1, Math.min(days, 60));
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (safeDays - 1));
  start.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.trafficDailyMetric.findMany({
    where: {
      date: {
        gte: start
      }
    },
    orderBy: {
      date: "asc"
    }
  });

  const map = new Map(rows.map((row) => [toDateKey(row.date), row]));
  const result: Array<{ date: string; hits: number; unique: number }> = [];

  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const target = new Date();
    target.setUTCDate(target.getUTCDate() - offset);
    const dateKey = toDateKey(target);
    const row = map.get(dateKey);
    result.push({
      date: dateKey,
      hits: row?.hits ?? 0,
      unique: row?.uniqueHits ?? 0
    });
  }

  return result;
}

export async function getTopPages(limit = 20) {
  return prisma.trafficPageMetric.findMany({
    orderBy: {
      hits: "desc"
    },
    take: Math.max(1, Math.min(limit, 300))
  });
}
