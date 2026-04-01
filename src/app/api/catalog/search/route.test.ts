import { beforeEach, describe, expect, it, vi } from "vitest";

const getCatalog = vi.fn();
const createCatalogCardItems = vi.fn();

vi.mock("@/lib/data/catalog", () => ({
  getCatalog
}));

vi.mock("@/lib/catalog-card", () => ({
  createCatalogCardItems
}));

async function loadRouteModule() {
  vi.resetModules();
  return import("./route");
}

describe("GET /api/catalog/search", () => {
  beforeEach(() => {
    getCatalog.mockReset();
    createCatalogCardItems.mockReset();
  });

  it("mengembalikan payload search yang ringan", async () => {
    getCatalog.mockResolvedValue({
      page: 2,
      total: 14,
      totalPages: 2,
      strategy: "full-text",
      products: [{ id: 10 }]
    });
    createCatalogCardItems.mockReturnValue([{ id: 10, title: "LCD Redmi Note 11" }]);

    const { GET } = await loadRouteModule();
    const response = await GET(new Request("https://ham-store.test/api/catalog/search?q=redmi&type=3&page=2"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        page: 2,
        total: 14,
        totalPages: 2,
        strategy: "full-text",
        products: [{ id: 10, title: "LCD Redmi Note 11" }]
      }
    });
    expect(getCatalog).toHaveBeenCalledWith({
      page: 2,
      search: "redmi",
      typeId: 3
    });
  });

  it("menormalkan parameter page yang tidak valid ke halaman pertama", async () => {
    getCatalog.mockResolvedValue({
      page: 1,
      total: 0,
      totalPages: 1,
      strategy: "browse",
      products: []
    });
    createCatalogCardItems.mockReturnValue([]);

    const { GET } = await loadRouteModule();
    const response = await GET(new Request("https://ham-store.test/api/catalog/search?page=abc"));

    expect(response.status).toBe(200);
    expect(getCatalog).toHaveBeenCalledWith({
      page: 1,
      search: "",
      typeId: null
    });
  });
});


