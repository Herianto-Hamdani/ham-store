import { createHash } from "node:crypto";

import { RateLimitScope } from "@prisma/client";

import {
  LOGIN_LOCK_SECONDS,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_MAX_ATTEMPTS_IP,
  LOGIN_WINDOW_SECONDS
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

type RecordPayload = {
  attempts: number[];
  lockedUntil: Date | null;
};

function credentialKey(username: string, ip: string): string {
  return createHash("sha1")
    .update(`cred|${username.trim().toLowerCase()}|${ip.trim()}`)
    .digest("hex");
}

function ipKey(ip: string): string {
  return createHash("sha1").update(`ip|${ip.trim()}`).digest("hex");
}

function normalizeAttempts(value: unknown, windowSeconds: number, nowSeconds: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= nowSeconds - windowSeconds);
}

async function readRecord(key: string): Promise<RecordPayload> {
  const record = await prisma.loginRateLimit.findUnique({
    where: { key }
  });
  if (!record) {
    return {
      attempts: [],
      lockedUntil: null
    };
  }

  return {
    attempts: normalizeAttempts(record.attempts, LOGIN_WINDOW_SECONDS, Math.floor(Date.now() / 1000)),
    lockedUntil: record.lockedUntil
  };
}

async function saveRecord(
  key: string,
  scope: RateLimitScope,
  username: string | null,
  ip: string | null,
  attempts: number[],
  lockedUntil: Date | null
) {
  await prisma.loginRateLimit.upsert({
    where: { key },
    update: {
      username,
      ip,
      attempts,
      lockedUntil
    },
    create: {
      key,
      scope,
      username,
      ip,
      attempts,
      lockedUntil
    }
  });
}

async function availableInKey(key: string): Promise<number> {
  const record = await prisma.loginRateLimit.findUnique({
    where: { key },
    select: { lockedUntil: true }
  });
  if (!record?.lockedUntil) {
    return 0;
  }

  const remaining = Math.floor((record.lockedUntil.getTime() - Date.now()) / 1000);
  return Math.max(0, remaining);
}

async function hitKey(
  key: string,
  scope: RateLimitScope,
  username: string | null,
  ip: string | null,
  maxAttempts: number
) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const existing = await readRecord(key);
  const attempts = normalizeAttempts(existing.attempts, LOGIN_WINDOW_SECONDS, nowSeconds);
  attempts.push(nowSeconds);

  let lockedUntil: Date | null = existing.lockedUntil;
  if (attempts.length >= maxAttempts) {
    lockedUntil = new Date((nowSeconds + LOGIN_LOCK_SECONDS) * 1000);
  }

  await saveRecord(key, scope, username, ip, attempts, lockedUntil);
  return lockedUntil ? Math.max(0, Math.floor((lockedUntil.getTime() - Date.now()) / 1000)) : 0;
}

export async function loginRateAvailableIn(username: string, ip: string) {
  const [credSeconds, ipSeconds] = await Promise.all([
    availableInKey(credentialKey(username, ip)),
    availableInKey(ipKey(ip))
  ]);

  return Math.max(credSeconds, ipSeconds);
}

export async function loginTooManyAttempts(username: string, ip: string) {
  return (await loginRateAvailableIn(username, ip)) > 0;
}

export async function hitLoginRateLimit(username: string, ip: string) {
  const [credLock, ipLock] = await Promise.all([
    hitKey(
      credentialKey(username, ip),
      RateLimitScope.CREDENTIAL,
      username.trim().toLowerCase(),
      ip,
      LOGIN_MAX_ATTEMPTS
    ),
    hitKey(ipKey(ip), RateLimitScope.IP, null, ip, LOGIN_MAX_ATTEMPTS_IP)
  ]);

  return Math.max(credLock, ipLock);
}

export async function clearLoginRateLimit(username: string, ip: string) {
  await prisma.loginRateLimit.deleteMany({
    where: {
      key: {
        in: [credentialKey(username, ip), ipKey(ip)]
      }
    }
  });
}

export function getLoginDelayMs() {
  const min = 250;
  const max = 700;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
