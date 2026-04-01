import { describe, expect, it } from "vitest";

import {
  buildSearchRequestKey,
  extractProductCodeId,
  isExactProductCodeQuery,
  normalizeSearchInput,
  normalizeSearchPage,
  normalizeTypeId,
  tokenizeSearchTerms
} from "@/lib/search-utils";

describe("search-utils", () => {
  it("menormalkan query search dengan trim dan collapse whitespace", () => {
    expect(normalizeSearchInput("  redmi   note 11  ")).toBe("redmi note 11");
  });

  it("memotong query yang terlalu panjang", () => {
    expect(normalizeSearchInput("x".repeat(120))).toHaveLength(80);
  });

  it("mendeteksi kode produk exact", () => {
    expect(isExactProductCodeQuery("lcd-0305-79")).toBe(true);
    expect(extractProductCodeId("lcd-0305-79")).toBe(79);
    expect(isExactProductCodeQuery("lcd redmi note")).toBe(false);
  });

  it("menyiapkan token search yang aman untuk full-text", () => {
    expect(tokenizeSearchTerms("  Vivo Y02 / Metoo ")).toEqual(["vivo", "y02", "metoo"]);
  });

  it("menormalkan page dan type untuk request key", () => {
    expect(normalizeTypeId("12")).toBe(12);
    expect(normalizeTypeId("0")).toBeNull();
    expect(normalizeSearchPage("3")).toBe(3);
    expect(buildSearchRequestKey("  Vivo Y02  ", 12, 3)).toBe("vivo y02::12::3");
  });
});
