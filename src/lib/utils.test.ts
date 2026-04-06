import { beforeAll, describe, expect, it, vi } from "vitest";

type UtilsModule = typeof import("@/lib/utils");

let utils: UtilsModule;

beforeAll(async () => {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/web_katalog?schema=public";
  process.env.APP_URL_SECRET ??= "test_app_url_secret_2026_abcdefghijklmnopqrstuvwxyz";
  vi.resetModules();
  utils = await import("@/lib/utils");
});

describe("date serialization helpers", () => {
  it("mengubah string ISO menjadi Date yang valid", () => {
    const value = utils.toDateValue("2026-04-02T06:16:52.772Z");

    expect(value).toBeInstanceOf(Date);
    expect(value?.toISOString()).toBe("2026-04-02T06:16:52.772Z");
  });

  it("mengembalikan null untuk tanggal yang tidak valid", () => {
    expect(utils.toDateValue("bukan-tanggal")).toBeNull();
    expect(utils.toDateValue(null)).toBeNull();
  });

  it("memformat tanggal secara aman untuk Date maupun string", () => {
    expect(utils.formatDateOnly("2026-04-02T06:16:52.772Z")).toBe("2026-04-02");
    expect(utils.formatDateOnly(new Date("2026-04-02T06:16:52.772Z"))).toBe("2026-04-02");
    expect(utils.formatDateOnly("invalid")).toBe("-");
  });

  it("membangun revision token yang stabil dari string tanggal", () => {
    expect(utils.getDateRevisionToken("2026-04-02T06:16:52.772Z")).toBe(
      "2026-04-02T06:16:52.772Z"
    );
    expect(utils.getDateRevisionToken("invalid")).toBe("unknown");
  });

  it("tetap bisa membuat kode produk saat createdAt datang sebagai string", () => {
    expect(
      utils.getProductCode({
        id: 79,
        createdAt: "2026-04-02T06:16:52.772Z",
        typeName: "LCD"
      })
    ).toBe("LCD-0204-79");
  });

  it("menggunakan mode light antara jam 06:00 sampai 18:00", () => {
    expect(utils.getScheduledThemeMode(new Date("2026-04-07T06:00:00+08:00"))).toBe("light");
    expect(utils.getScheduledThemeMode(new Date("2026-04-07T18:00:00+08:00"))).toBe("light");
  });

  it("menggunakan mode dark di luar jam light", () => {
    expect(utils.getScheduledThemeMode(new Date("2026-04-07T05:59:00+08:00"))).toBe("dark");
    expect(utils.getScheduledThemeMode(new Date("2026-04-07T18:01:00+08:00"))).toBe("dark");
  });
});
