import { RateLimitScope } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

type LoginRateLimitRecord = {
  key: string;
  scope: RateLimitScope;
  username: string | null;
  ip: string | null;
  attempts: number[];
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const store = new Map<string, LoginRateLimitRecord>();

const prismaMock = {
  loginRateLimit: {
    findUnique: vi.fn(async ({ where, select }: { where: { key: string }; select?: { lockedUntil?: true } }) => {
      const record = store.get(where.key);
      if (!record) {
        return null;
      }

      if (select?.lockedUntil) {
        return { lockedUntil: record.lockedUntil };
      }

      return {
        ...record,
        attempts: [...record.attempts]
      };
    }),
    upsert: vi.fn(
      async ({
        where,
        update,
        create
      }: {
        where: { key: string };
        update: Omit<LoginRateLimitRecord, "createdAt" | "updatedAt" | "key">;
        create: Omit<LoginRateLimitRecord, "createdAt" | "updatedAt">;
      }) => {
        const now = new Date();
        const existing = store.get(where.key);
        const nextRecord: LoginRateLimitRecord = existing
          ? {
              ...existing,
              ...update,
              updatedAt: now
            }
          : {
              ...create,
              createdAt: now,
              updatedAt: now
            };

        store.set(where.key, nextRecord);
        return nextRecord;
      }
    ),
    deleteMany: vi.fn(async ({ where }: { where: { key: { in: string[] } } }) => {
      for (const key of where.key.in) {
        store.delete(key);
      }

      return { count: 0 };
    })
  },
  $transaction: vi.fn(async (operation: (tx: typeof prismaMock) => Promise<unknown>) =>
    operation(prismaMock)
  )
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}));

async function loadRateLimitModule() {
  vi.resetModules();
  return import("./rate-limit");
}

describe("login rate limit", () => {
  beforeEach(() => {
    store.clear();
    prismaMock.$transaction.mockClear();
    prismaMock.loginRateLimit.findUnique.mockClear();
    prismaMock.loginRateLimit.upsert.mockClear();
    prismaMock.loginRateLimit.deleteMany.mockClear();
  });

  it("mengunci login setelah batas credential tercapai", async () => {
    const rateLimit = await loadRateLimitModule();

    let remaining = 0;
    for (let index = 0; index < 5; index += 1) {
      remaining = await rateLimit.hitLoginRateLimit("admin", "127.0.0.1");
    }

    expect(remaining).toBeGreaterThan(0);
    await expect(rateLimit.loginTooManyAttempts("admin", "127.0.0.1")).resolves.toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(Array.from(store.keys())).toHaveLength(2);
    expect(Array.from(store.keys()).every((key) => /^[a-f0-9]{64}$/.test(key))).toBe(true);
  });

  it("membersihkan limiter untuk credential dan ip", async () => {
    const rateLimit = await loadRateLimitModule();

    await rateLimit.hitLoginRateLimit("admin", "127.0.0.1");
    expect(store.size).toBe(2);

    await rateLimit.clearLoginRateLimit("admin", "127.0.0.1");

    expect(store.size).toBe(0);
    await expect(rateLimit.loginTooManyAttempts("admin", "127.0.0.1")).resolves.toBe(false);
  });
});
