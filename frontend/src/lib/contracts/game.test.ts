import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PaymentToken } from "tea-game-client";

const mocks = vi.hoisted(() => ({
  getContractData: vi.fn(),
  scValToNative: vi.fn(),
  createTeaNftClient: vi.fn(),
  fetchTeaMetadata: vi.fn(),
}));

vi.mock("tea-game-client", () => {
  class Server {
    getContractData = mocks.getContractData;
  }

  return {
    Client: class Client {},
    networks: { testnet: { contractId: "CTESTGAMECONTRACT" } },
    rpc: {
      Server,
      Durability: { Persistent: "persistent", Temporary: "temporary" },
    },
    xdr: {
      ScVal: {
        scvVec: (items: unknown[]) => ({ type: "vec", items }),
        scvSymbol: (symbol: string) => ({ type: "symbol", symbol }),
        scvU64: (value: bigint) => ({ type: "u64", value }),
      },
    },
  };
});

vi.mock("@stellar/stellar-sdk", () => ({
  scValToNative: mocks.scValToNative,
}));

vi.mock("@/lib/stellarConfig", () => ({
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  stellarNetwork: "TESTNET",
}));

vi.mock("@/lib/contracts/nft", () => ({
  createTeaNftClient: mocks.createTeaNftClient,
  fetchTeaMetadata: mocks.fetchTeaMetadata,
}));

import {
  fetchListingFromStorage,
  fetchMarketplaceListings,
  isMissingEntryError,
  paymentTokenLabel,
  resolvePaymentToken,
} from "@/lib/contracts/game";

const ballsToken: PaymentToken = { tag: "Balls", values: undefined };
const starsToken: PaymentToken = { tag: "Stars", values: undefined };

const contractDataEntry = (value: unknown) => ({
  val: { contractData: () => ({ val: () => value }) },
});

const decodedListing = (overrides: Partial<Record<string, unknown>> = {}) => ({
  seller: "GSELLER",
  price: 12345n,
  payment_token: starsToken,
  created_at: 1700000000n,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isMissingEntryError", () => {
  it.each([
    [{ status: 404 }],
    [{ code: 404 }],
    [{ name: "NotFoundError" }],
    [{ message: "Entry Not Found" }],
    [new Error("entry not found")],
    [new Error("Missing value")],
    [new Error("MISSING STATE")],
    [new Error("not found")],
    [new Error("404 from the RPC")],
  ])("treats %# as a missing entry", (error) => {
    expect(isMissingEntryError(error)).toBe(true);
  });

  it("returns false for a generic error", () => {
    expect(isMissingEntryError(new Error("boom"))).toBe(false);
  });

  it("returns false for null, undefined and non-error values", () => {
    expect(isMissingEntryError(null)).toBe(false);
    expect(isMissingEntryError(undefined)).toBe(false);
    expect(isMissingEntryError("boom")).toBe(false);
  });
});

describe("resolvePaymentToken", () => {
  it("maps the Balls tag to BALLS", () => {
    expect(resolvePaymentToken(ballsToken)).toBe("BALLS");
  });

  it("maps the Stars tag to STARS", () => {
    expect(resolvePaymentToken(starsToken)).toBe("STARS");
  });
});

describe("paymentTokenLabel", () => {
  it("renders a human label for each payment token", () => {
    expect(paymentTokenLabel("BALLS")).toBe("Balls");
    expect(paymentTokenLabel("STARS")).toBe("Stars");
  });
});

describe("fetchListingFromStorage", () => {
  it("builds the Listing storage key from the token id", async () => {
    mocks.getContractData.mockResolvedValue(null);

    await fetchListingFromStorage("CTEST", 3);

    const [, key] = mocks.getContractData.mock.calls[0];
    expect(key).toEqual({
      type: "vec",
      items: [
        { type: "symbol", symbol: "Listing" },
        { type: "u64", value: 3n },
      ],
    });
  });

  it("returns null when both the Persistent and Temporary reads miss", async () => {
    mocks.getContractData.mockResolvedValue(null);

    await expect(fetchListingFromStorage("CTEST", 2)).resolves.toBeNull();

    expect(mocks.getContractData).toHaveBeenCalledTimes(2);
    expect(mocks.getContractData).toHaveBeenNthCalledWith(
      1,
      "CTEST",
      expect.anything(),
      "persistent",
    );
    expect(mocks.getContractData).toHaveBeenNthCalledWith(
      2,
      "CTEST",
      expect.anything(),
      "temporary",
    );
  });

  it("skips durability reads that reject with a missing-entry error", async () => {
    mocks.getContractData.mockRejectedValue(new Error("entry not found"));

    await expect(fetchListingFromStorage("CTEST", 5)).resolves.toBeNull();

    expect(mocks.getContractData).toHaveBeenCalledTimes(2);
  });

  it("decodes seller, price, payment_token and created_at from the stored value", async () => {
    const stored = { marker: "scval" };
    mocks.getContractData.mockResolvedValue(contractDataEntry(stored));
    mocks.scValToNative.mockReturnValue(decodedListing());

    await expect(fetchListingFromStorage("CTEST", 7)).resolves.toEqual({
      seller: "GSELLER",
      price: 12345n,
      paymentToken: "STARS",
      createdAt: 1700000000,
    });

    expect(mocks.scValToNative).toHaveBeenCalledWith(stored);
  });

  it("maps a Balls payment token to BALLS", async () => {
    mocks.getContractData.mockResolvedValue(contractDataEntry({ marker: "scval" }));
    mocks.scValToNative.mockReturnValue(decodedListing({ payment_token: ballsToken }));

    await expect(fetchListingFromStorage("CTEST", 8)).resolves.toMatchObject({
      paymentToken: "BALLS",
    });
  });

  it("stops after the Persistent read succeeds", async () => {
    mocks.getContractData.mockResolvedValue(contractDataEntry({ marker: "scval" }));
    mocks.scValToNative.mockReturnValue(decodedListing());

    await fetchListingFromStorage("CTEST", 1);

    expect(mocks.getContractData).toHaveBeenCalledTimes(1);
  });
});

describe("fetchMarketplaceListings", () => {
  it("returns [] when total_supply is 0", async () => {
    mocks.createTeaNftClient.mockReturnValue({
      total_supply: vi.fn().mockResolvedValue({ result: 0n }),
    });

    await expect(fetchMarketplaceListings()).resolves.toEqual([]);
  });

  it("returns [] when total_supply is missing", async () => {
    mocks.createTeaNftClient.mockReturnValue({
      total_supply: vi.fn().mockResolvedValue({}),
    });

    await expect(fetchMarketplaceListings()).resolves.toEqual([]);
  });

  it("resolves metadata for each listed token", async () => {
    mocks.createTeaNftClient.mockReturnValue({
      total_supply: vi.fn().mockResolvedValue({ result: 1n }),
      get_token_id: vi.fn().mockResolvedValue({ result: 5n }),
      token_uri: vi.fn().mockResolvedValue({ result: "ipfs://cid" }),
    });
    mocks.fetchTeaMetadata.mockResolvedValue({ name: "Tea" });
    mocks.getContractData.mockResolvedValue(contractDataEntry({ marker: "scval" }));
    mocks.scValToNative.mockReturnValue(
      decodedListing({ payment_token: ballsToken, price: 10n, created_at: 1n }),
    );

    const listings = await fetchMarketplaceListings();

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      tokenId: 5,
      tokenUri: "ipfs://cid",
      listing: {
        seller: "GSELLER",
        price: 10n,
        paymentToken: "BALLS",
        createdAt: 1,
      },
    });
    expect(mocks.fetchTeaMetadata).toHaveBeenCalledWith(5);
  });
});
