import { prisma } from "@/lib/prisma";

const statements = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING gin (brand gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_products_model_trgm ON products USING gin (model gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_types_name_trgm ON types USING gin (name gin_trgm_ops)`
];

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  console.log("Performance indexes applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
