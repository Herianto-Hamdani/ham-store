import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trafficEvent: {
      create: vi.fn()
    }
  }
}));

import { buildVisitorHash, normalizeTrackedPath } from "./traffic";

describe("normalizeTrackedPath", () => {
  it("menormalkan path publik yang valid", () => {
    expect(normalizeTrackedPath("produk//lcd-redmi-note-11/?from=home#top")).toBe(
      "/produk/lcd-redmi-note-11"
    );
  });

  it("mengubah input kosong menjadi root", () => {
    expect(normalizeTrackedPath("")).toBe("/");
    expect(normalizeTrackedPath(undefined)).toBe("/");
  });

  it("menolak path internal dan karakter kontrol", () => {
    expect(normalizeTrackedPath("/admin/products")).toBeNull();
    expect(normalizeTrackedPath("/api/track")).toBeNull();
    expect(normalizeTrackedPath("/_next/static/chunk.js")).toBeNull();
    expect(normalizeTrackedPath("/produk/\u0000lcd")).toBeNull();
  });

  it("menolak path yang terlalu panjang", () => {
    expect(normalizeTrackedPath(`/${"a".repeat(161)}`)).toBeNull();
  });
});

describe("buildVisitorHash", () => {
  it("menghasilkan hash sha256 yang stabil", () => {
    const hashA = buildVisitorHash("127.0.0.1", "Vitest");
    const hashB = buildVisitorHash("127.0.0.1", "Vitest");

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });
});
