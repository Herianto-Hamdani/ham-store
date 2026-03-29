import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ADMIN_SESSION_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const SESSION_DAYS = 30;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const getCurrentAdminSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.adminSession.deleteMany({
      where: { tokenHash }
    });
    return null;
  }

  const staleMinutes = Math.abs(Date.now() - session.lastSeenAt.getTime()) / 1000 / 60;
  if (staleMinutes >= 30) {
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });
  }

  return session;
});

export async function getOptionalAdminUser() {
  const session = await getCurrentAdminSession();
  return session?.user ?? null;
}

export async function requireAdmin() {
  const user = await getOptionalAdminUser();
  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function createAdminSession(userId: number) {
  const cookieStore = await cookies();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt
    }
  });

  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await prisma.adminSession.deleteMany({
      where: {
        tokenHash: hashSessionToken(token)
      }
    });
  }

  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
