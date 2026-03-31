import { beforeEach, describe, expect, it, vi } from "vitest";

const recordPublicVisit = vi.fn();
const buildVisitorHash = vi.fn(() => "visitor-hash");

vi.mock("@/lib/data/traffic", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/traffic")>("@/lib/data/traffic");

  return {
    ...actual,
    buildVisitorHash,
    recordPublicVisit
  };
});

async function loadRouteModule() {
  vi.resetModules();
  return import("./route");
}

function createTrackRequest(pathname: unknown, forwardedFor = "10.0.0.1") {
  return new Request("https://ham-store.test/api/track", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": forwardedFor,
      "user-agent": "Vitest"
    },
    body: JSON.stringify({ pathname })
  });
}

describe("POST /api/track", () => {
  beforeEach(() => {
    recordPublicVisit.mockReset();
    buildVisitorHash.mockReset();
    buildVisitorHash.mockReturnValue("visitor-hash");
  });

  it("menerima path publik yang valid", async () => {
    const { POST } = await loadRouteModule();

    const response = await POST(createTrackRequest("/produk/lcd-redmi-note-11"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(recordPublicVisit).toHaveBeenCalledWith("/produk/lcd-redmi-note-11", "visitor-hash");
  });

  it("menolak payload yang tidak valid", async () => {
    const { POST } = await loadRouteModule();

    const response = await POST(
      new Request("https://ham-store.test/api/track", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(400);
    expect(recordPublicVisit).not.toHaveBeenCalled();
  });

  it("menolak path internal", async () => {
    const { POST } = await loadRouteModule();

    const response = await POST(createTrackRequest("/_next/static/chunk.js"));

    expect(response.status).toBe(400);
    expect(recordPublicVisit).not.toHaveBeenCalled();
  });

  it("membatasi burst request dari sumber yang sama", async () => {
    const { POST } = await loadRouteModule();

    let status = 200;
    for (let index = 0; index < 31; index += 1) {
      const response = await POST(createTrackRequest("/produk/lcd-redmi-note-11", "10.0.0.55"));
      status = response.status;
    }

    expect(status).toBe(429);
    expect(recordPublicVisit).toHaveBeenCalledTimes(30);
  });
});
