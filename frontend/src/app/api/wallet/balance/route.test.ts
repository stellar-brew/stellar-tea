import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

vi.mock("@/lib/stellarConfig", () => ({
  horizonUrl: "https://horizon.testnet.example.com/",
}));

import { GET } from "@/app/api/wallet/balance/route";

const fetchMock = vi.fn();

const buildRequest = (query = "") =>
  new NextRequest(`https://app.example.com/api/wallet/balance${query}`);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/wallet/balance", () => {
  it("returns 400 with an error body when the address is missing", async () => {
    const response = await GET(buildRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Wallet address is required.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proxies the address to Horizon and returns the balances", async () => {
    const balances = [{ asset_type: "native", balance: "10.0000000" }];
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ balances }),
      text: async () => "",
    });

    const response = await GET(buildRequest("?address=GABC"));

    expect(fetchMock).toHaveBeenCalledWith(
      "https://horizon.testnet.example.com/accounts/GABC",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ balances });
  });

  it("defaults to an empty balances array when upstream omits it", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ account_id: "GABC" }),
      text: async () => "",
    });

    const response = await GET(buildRequest("?address=GABC"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ balances: [] });
  });

  it("forwards a non-OK upstream response with the upstream status and body", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "Account not found",
      json: async () => ({}),
    });

    const response = await GET(buildRequest("?address=GABC"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Account not found" });
  });

  it("falls back to the upstream status text when the error body is empty", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => "",
      json: async () => ({}),
    });

    const response = await GET(buildRequest("?address=GABC"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Service Unavailable",
    });
  });

  it("returns 502 when the upstream fetch throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("network down"));

    const response = await GET(buildRequest("?address=GABC"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to reach Horizon server.",
    });
    expect(consoleError).toHaveBeenCalled();
  });
});
