import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { defaultSiteSettingValues } from "../src/lib/site-settings";

const prisma = new PrismaClient();

async function main() {
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: defaultSiteSettingValues
  });

  const adminCount = await prisma.user.count();
  if (adminCount === 0) {
    const isProductionSeed = process.env.NODE_ENV === "production";
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    const password = process.env.SEED_ADMIN_PASSWORD || (isProductionSeed ? "" : "admin123");

    if (!password) {
      throw new Error(
        "SEED_ADMIN_PASSWORD wajib diisi saat menjalankan seed di production."
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: "ADMIN"
      }
    });

    console.log(`Seed admin dibuat: ${username}`);
    if (!process.env.SEED_ADMIN_PASSWORD && !isProductionSeed) {
      console.log("Password default: admin123");
    }
  }

  console.log("Seed selesai.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
