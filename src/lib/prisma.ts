import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const isVercelBuild =
  process.env.VERCEL === "1" &&
  (process.env.CI === "1" || process.env.CI === "true") &&
  Boolean(process.env.DIRECT_DATABASE_URL);

const datasourceUrl = isVercelBuild
  ? process.env.DIRECT_DATABASE_URL
  : process.env.DATABASE_URL;

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}
