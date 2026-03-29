import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";

import { defaultSiteSettingValues } from "../src/lib/site-settings";

const prisma = new PrismaClient();
const execFileAsync = promisify(execFile);
const shouldReset = process.argv.includes("--reset");

type LegacyTypeRow = {
  id: number;
  name: string;
  createdAt?: string | null;
};

type LegacyUserRow = {
  id: number;
  username: string;
  passwordHash: string;
  role?: string | null;
  createdAt?: string | null;
};

type LegacyProductRow = {
  id: number;
  typeId: number;
  name: string;
  brand?: string | null;
  model?: string | null;
  cardMode?: string | null;
  detail?: string | null;
  priceItem?: number | null;
  priceInstall?: number | null;
  imagePosX?: number | null;
  imagePosY?: number | null;
  imageScale?: number | null;
  imagePath?: string | null;
  thumbPath?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type LegacyDataset = {
  source: "mysql" | "seed.sql";
  types: LegacyTypeRow[];
  users: LegacyUserRow[];
  products: LegacyProductRow[];
};

function toDate(value?: string | null, fallback?: Date) {
  if (!value) {
    return fallback ?? new Date();
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? fallback ?? new Date() : parsed;
}

function mysqlArgs(sql: string) {
  const args = ["--batch", "--raw", "--skip-column-names", "-u", process.env.LEGACY_MYSQL_USER || "root"];

  if (process.env.LEGACY_MYSQL_HOST) {
    args.push("-h", process.env.LEGACY_MYSQL_HOST);
  }

  if (process.env.LEGACY_MYSQL_PORT) {
    args.push("-P", process.env.LEGACY_MYSQL_PORT);
  }

  if (process.env.LEGACY_MYSQL_PASSWORD) {
    args.push(`-p${process.env.LEGACY_MYSQL_PASSWORD}`);
  }

  args.push(process.env.LEGACY_MYSQL_DATABASE || "web_katalog", "-e", sql);
  return args;
}

async function resolveMysqlClient() {
  const candidates = [
    process.env.LEGACY_MYSQL_COMMAND,
    "C:\\xampp\\mysql\\bin\\mysql.exe",
    "mysql"
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (candidate === "mysql") {
      return candidate;
    }

    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

async function queryMysql(sql: string) {
  const mysql = await resolveMysqlClient();
  if (!mysql) {
    throw new Error("MySQL client tidak ditemukan.");
  }

  const { stdout } = await execFileAsync(mysql, mysqlArgs(sql), {
    cwd: process.cwd(),
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true
  });

  return stdout;
}

function parseJsonLines<T>(source: string) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function loadLegacyDatasetFromMysql(): Promise<LegacyDataset> {
  const [typesRaw, usersRaw, productsRaw] = await Promise.all([
    queryMysql(
      [
        "SELECT JSON_OBJECT(",
        "'id', id,",
        "'name', name,",
        "'createdAt', DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')",
        ")",
        "FROM types",
        "ORDER BY id ASC;"
      ].join(" ")
    ),
    queryMysql(
      [
        "SELECT JSON_OBJECT(",
        "'id', id,",
        "'username', username,",
        "'passwordHash', password_hash,",
        "'role', role,",
        "'createdAt', DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')",
        ")",
        "FROM users",
        "ORDER BY id ASC;"
      ].join(" ")
    ),
    queryMysql(
      [
        "SELECT JSON_OBJECT(",
        "'id', id,",
        "'typeId', type_id,",
        "'name', name,",
        "'brand', brand,",
        "'model', model,",
        "'cardMode', card_mode,",
        "'detail', detail,",
        "'priceItem', price_item,",
        "'priceInstall', price_install,",
        "'imagePosX', image_pos_x,",
        "'imagePosY', image_pos_y,",
        "'imageScale', image_scale,",
        "'imagePath', image_path,",
        "'thumbPath', thumb_path,",
        "'createdAt', DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'),",
        "'updatedAt', DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')",
        ")",
        "FROM products",
        "ORDER BY id ASC;"
      ].join(" ")
    )
  ]);

  const dataset: LegacyDataset = {
    source: "mysql",
    types: parseJsonLines<LegacyTypeRow>(typesRaw),
    users: parseJsonLines<LegacyUserRow>(usersRaw),
    products: parseJsonLines<LegacyProductRow>(productsRaw)
  };

  if (dataset.types.length === 0 && dataset.users.length === 0 && dataset.products.length === 0) {
    throw new Error("Database MySQL lama tidak mengandung data yang bisa dimigrasikan.");
  }

  return dataset;
}

function extractInsertValues(sql: string, table: string) {
  const match = sql.match(
    new RegExp(`INSERT INTO\\s+${table}\\s*\\(([^)]+)\\)\\s*VALUES\\s*([\\s\\S]*?);`, "i")
  );
  if (!match) {
    return null;
  }

  return {
    columns: match[1]
      .split(",")
      .map((item) => item.trim().replace(/`/g, "")),
    values: match[2]
  };
}

function parseSqlValue(token: string) {
  const trimmed = token.trim();
  if (!trimmed || trimmed.toUpperCase() === "NULL") {
    return null;
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }

  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  return trimmed;
}

function parseSqlTuples(source: string) {
  const rows: Array<Array<string | number | null>> = [];
  let current = "";
  let tuple: Array<string | number | null> = [];
  let inString = false;
  let depth = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "'" && next === "'" && inString) {
      current += "''";
      index += 1;
      continue;
    }

    if (char === "'") {
      inString = !inString;
      current += char;
      continue;
    }

    if (!inString && char === "(") {
      depth += 1;
      if (depth === 1) {
        tuple = [];
        current = "";
        continue;
      }
    }

    if (!inString && char === ")") {
      depth -= 1;
      if (depth === 0) {
        tuple.push(parseSqlValue(current));
        rows.push(tuple);
        current = "";
        tuple = [];
        continue;
      }
    }

    if (!inString && depth === 1 && char === ",") {
      tuple.push(parseSqlValue(current));
      current = "";
      continue;
    }

    if (depth >= 1) {
      current += char;
    }
  }

  return rows;
}

async function loadLegacyDatasetFromSeed(): Promise<LegacyDataset> {
  const seedPath = path.join(process.cwd(), "seed.sql");
  const seedSql = await readFile(seedPath, "utf8");
  const typesInsert = extractInsertValues(seedSql, "types");
  const usersInsert = extractInsertValues(seedSql, "users");
  const productsInsert = extractInsertValues(seedSql, "products");

  const types = (typesInsert ? parseSqlTuples(typesInsert.values) : []).map((row, index) => ({
    id: index + 1,
    name: String(row[0] ?? "").trim()
  }));

  const users = (usersInsert ? parseSqlTuples(usersInsert.values) : []).map((row, index) => ({
    id: index + 1,
    username: String(row[0] ?? "").trim(),
    passwordHash: String(row[1] ?? ""),
    role: String(row[2] ?? "admin")
  }));

  const products = (productsInsert ? parseSqlTuples(productsInsert.values) : []).map((row, index) => ({
    id: index + 1,
    typeId: Number(row[0] ?? 0),
    name: String(row[1] ?? ""),
    brand: String(row[2] ?? ""),
    model: String(row[3] ?? ""),
    cardMode: String(row[4] ?? "image"),
    detail: String(row[5] ?? ""),
    priceItem: Number(row[6] ?? 0),
    priceInstall: Number(row[7] ?? 0),
    imagePosX: Number(row[8] ?? 50),
    imagePosY: Number(row[9] ?? 50),
    imageScale: Number(row[10] ?? 100),
    imagePath: row[11] ? String(row[11]) : null,
    thumbPath: row[12] ? String(row[12]) : null
  }));

  return {
    source: "seed.sql",
    types,
    users,
    products
  };
}

async function loadLegacyDataset() {
  try {
    const dataset = await loadLegacyDatasetFromMysql();
    console.log(
      `Menggunakan sumber data MySQL lama: ${dataset.types.length} type, ${dataset.users.length} user, ${dataset.products.length} produk.`
    );
    return dataset;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.warn(`Gagal membaca MySQL legacy, fallback ke seed.sql. Alasan: ${reason}`);
    return loadLegacyDatasetFromSeed();
  }
}

function normalizeRole(role?: string | null): "ADMIN" {
  return String(role ?? "admin").toUpperCase() === "ADMIN" ? "ADMIN" : "ADMIN";
}

function normalizeCardMode(mode?: string | null): "IMAGE" | "TEMPLATE" {
  return String(mode ?? "image").toUpperCase() === "TEMPLATE" ? "TEMPLATE" : "IMAGE";
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.trafficVisitor.deleteMany(),
    prisma.trafficPageMetric.deleteMany(),
    prisma.trafficDailyMetric.deleteMany(),
    prisma.loginRateLimit.deleteMany(),
    prisma.adminSession.deleteMany(),
    prisma.product.deleteMany(),
    prisma.type.deleteMany(),
    prisma.user.deleteMany(),
    prisma.siteSetting.deleteMany()
  ]);
}

async function resetSequences() {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"users"', 'id'), COALESCE((SELECT MAX(id) FROM "users"), 1), true);`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"types"', 'id'), COALESCE((SELECT MAX(id) FROM "types"), 1), true);`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"products"', 'id'), COALESCE((SELECT MAX(id) FROM "products"), 1), true);`
  );
}

async function importCatalog(dataset: LegacyDataset) {
  const existingProducts = await prisma.product.count();
  if (existingProducts > 0 && !shouldReset) {
    console.log("Produk sudah ada di database. Gunakan --reset jika ingin impor ulang.");
    return;
  }

  if (dataset.types.length > 0) {
    await prisma.type.createMany({
      data: dataset.types
        .filter((row) => row.id > 0 && row.name.trim())
        .map((row) => {
          const createdAt = toDate(row.createdAt);
          return {
            id: row.id,
            name: row.name.trim(),
            createdAt,
            updatedAt: createdAt
          };
        })
    });
  }

  if (dataset.users.length > 0) {
    await prisma.user.createMany({
      data: dataset.users
        .filter((row) => row.id > 0 && row.username.trim() && row.passwordHash)
        .map((row) => {
          const createdAt = toDate(row.createdAt);
          return {
            id: row.id,
            username: row.username.trim(),
            passwordHash: row.passwordHash,
            role: normalizeRole(row.role),
            createdAt,
            updatedAt: createdAt
          };
        })
    });
  }

  if (dataset.products.length > 0) {
    await prisma.product.createMany({
      data: dataset.products
        .filter((row) => row.id > 0 && row.typeId > 0 && row.name.trim())
        .map((row) => ({
          id: row.id,
          typeId: row.typeId,
          name: row.name.trim(),
          brand: String(row.brand ?? "").trim(),
          model: String(row.model ?? "").trim(),
          cardMode: normalizeCardMode(row.cardMode),
          detail: String(row.detail ?? ""),
          priceItem: Number(row.priceItem ?? 0),
          priceInstall: Number(row.priceInstall ?? 0),
          imagePosX: Number(row.imagePosX ?? 50),
          imagePosY: Number(row.imagePosY ?? 50),
          imageScale: Number(row.imageScale ?? 100),
          imagePath: row.imagePath ? String(row.imagePath) : null,
          thumbPath: row.thumbPath ? String(row.thumbPath) : null,
          createdAt: toDate(row.createdAt),
          updatedAt: toDate(row.updatedAt, toDate(row.createdAt))
        }))
    });
  }

  await resetSequences();
}

async function importSiteSettings() {
  const siteSettingPath = path.join(process.cwd(), "storage", "site_settings.json");
  const siteSettingsRaw = await readFile(siteSettingPath, "utf8").catch(() => null);
  if (!siteSettingsRaw) {
    return;
  }

  const parsed = JSON.parse(siteSettingsRaw) as Record<string, unknown>;
  await prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {
      webName: String(parsed.web_name ?? defaultSiteSettingValues.webName),
      whatsappNumber: String(parsed.whatsapp_number ?? ""),
      whatsappMessage: String(parsed.whatsapp_message ?? defaultSiteSettingValues.whatsappMessage),
      logoPath: parsed.logo_path ? String(parsed.logo_path) : null,
      logoThumbPath: parsed.logo_thumb_path ? String(parsed.logo_thumb_path) : null,
      bannerPath: parsed.banner_path ? String(parsed.banner_path) : null,
      bannerThumbPath: parsed.banner_thumb_path ? String(parsed.banner_thumb_path) : null,
      templateBgPath: parsed.template_bg_path ? String(parsed.template_bg_path) : null,
      templateBgThumbPath: parsed.template_bg_thumb_path ? String(parsed.template_bg_thumb_path) : null,
      templateLogoPath: parsed.template_logo_path ? String(parsed.template_logo_path) : null,
      templateLogoThumbPath: parsed.template_logo_thumb_path
        ? String(parsed.template_logo_thumb_path)
        : null,
      templateBgPosX: Number(parsed.template_bg_pos_x ?? 50),
      templateBgPosY: Number(parsed.template_bg_pos_y ?? 50),
      templateBgScale: Number(parsed.template_bg_scale ?? 100),
      templateLogoTop: Number(parsed.template_logo_top ?? 4),
      templateLogoRight: Number(parsed.template_logo_right ?? 4),
      templateLogoWidth: Number(parsed.template_logo_width ?? 32),
      templateTitleLeft: Number(parsed.template_title_left ?? 10),
      templateTitleWidth: Number(parsed.template_title_width ?? 80),
      templateTitleBottom: Number(parsed.template_title_bottom ?? 2),
      templateTitleFont: Number(parsed.template_title_font ?? 14),
      templateSideTop: Number(parsed.template_side_top ?? 22),
      templateSideLeft: Number(parsed.template_side_left ?? 3),
      templateSideRight: Number(parsed.template_side_right ?? 3),
      templateSideFont: Number(parsed.template_side_font ?? 12),
      templatePhotoTop: Number(parsed.template_photo_top ?? 18),
      templatePhotoLeft: Number(parsed.template_photo_left ?? 15),
      templatePhotoWidth: Number(parsed.template_photo_width ?? 70),
      templatePhotoHeight: Number(parsed.template_photo_height ?? 58)
    },
    create: {
      ...defaultSiteSettingValues,
      webName: String(parsed.web_name ?? defaultSiteSettingValues.webName),
      whatsappNumber: String(parsed.whatsapp_number ?? ""),
      whatsappMessage: String(parsed.whatsapp_message ?? defaultSiteSettingValues.whatsappMessage),
      logoPath: parsed.logo_path ? String(parsed.logo_path) : null,
      logoThumbPath: parsed.logo_thumb_path ? String(parsed.logo_thumb_path) : null,
      bannerPath: parsed.banner_path ? String(parsed.banner_path) : null,
      bannerThumbPath: parsed.banner_thumb_path ? String(parsed.banner_thumb_path) : null,
      templateBgPath: parsed.template_bg_path ? String(parsed.template_bg_path) : null,
      templateBgThumbPath: parsed.template_bg_thumb_path ? String(parsed.template_bg_thumb_path) : null,
      templateLogoPath: parsed.template_logo_path ? String(parsed.template_logo_path) : null,
      templateLogoThumbPath: parsed.template_logo_thumb_path
        ? String(parsed.template_logo_thumb_path)
        : null,
      templateBgPosX: Number(parsed.template_bg_pos_x ?? 50),
      templateBgPosY: Number(parsed.template_bg_pos_y ?? 50),
      templateBgScale: Number(parsed.template_bg_scale ?? 100),
      templateLogoTop: Number(parsed.template_logo_top ?? 4),
      templateLogoRight: Number(parsed.template_logo_right ?? 4),
      templateLogoWidth: Number(parsed.template_logo_width ?? 32),
      templateTitleLeft: Number(parsed.template_title_left ?? 10),
      templateTitleWidth: Number(parsed.template_title_width ?? 80),
      templateTitleBottom: Number(parsed.template_title_bottom ?? 2),
      templateTitleFont: Number(parsed.template_title_font ?? 14),
      templateSideTop: Number(parsed.template_side_top ?? 22),
      templateSideLeft: Number(parsed.template_side_left ?? 3),
      templateSideRight: Number(parsed.template_side_right ?? 3),
      templateSideFont: Number(parsed.template_side_font ?? 12),
      templatePhotoTop: Number(parsed.template_photo_top ?? 18),
      templatePhotoLeft: Number(parsed.template_photo_left ?? 15),
      templatePhotoWidth: Number(parsed.template_photo_width ?? 70),
      templatePhotoHeight: Number(parsed.template_photo_height ?? 58)
    }
  });
}

async function importTraffic() {
  const trafficPath = path.join(process.cwd(), "storage", "metrics", "traffic.json");
  const trafficRaw = await readFile(trafficPath, "utf8").catch(() => null);
  if (!trafficRaw) {
    return;
  }

  const parsed = JSON.parse(trafficRaw) as {
    daily?: Record<string, { hits?: number; unique?: number }>;
    pages?: Record<string, number>;
    unique_hashes?: Record<string, Record<string, number>>;
  };

  if (parsed.daily) {
    for (const [dateKey, metric] of Object.entries(parsed.daily)) {
      await prisma.trafficDailyMetric.upsert({
        where: {
          date: new Date(`${dateKey}T00:00:00.000Z`)
        },
        update: {
          hits: Number(metric.hits ?? 0),
          uniqueHits: Number(metric.unique ?? 0)
        },
        create: {
          date: new Date(`${dateKey}T00:00:00.000Z`),
          hits: Number(metric.hits ?? 0),
          uniqueHits: Number(metric.unique ?? 0)
        }
      });
    }
  }

  if (parsed.pages) {
    for (const [pagePath, hits] of Object.entries(parsed.pages)) {
      await prisma.trafficPageMetric.upsert({
        where: { path: pagePath },
        update: { hits: Number(hits ?? 0) },
        create: { path: pagePath, hits: Number(hits ?? 0) }
      });
    }
  }

  if (parsed.unique_hashes) {
    for (const [dateKey, hashes] of Object.entries(parsed.unique_hashes)) {
      for (const visitorHash of Object.keys(hashes)) {
        await prisma.trafficVisitor.upsert({
          where: {
            date_visitorHash: {
              date: new Date(`${dateKey}T00:00:00.000Z`),
              visitorHash
            }
          },
          update: {},
          create: {
            date: new Date(`${dateKey}T00:00:00.000Z`),
            visitorHash,
            hits: 1
          }
        });
      }
    }
  }
}

async function main() {
  if (shouldReset) {
    await resetDatabase();
  }

  const dataset = await loadLegacyDataset();
  await importCatalog(dataset);
  await importSiteSettings();
  await importTraffic();

  console.log(
    `Migrasi legacy selesai dari ${dataset.source}. Type: ${dataset.types.length}, user: ${dataset.users.length}, produk: ${dataset.products.length}.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
