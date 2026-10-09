import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  metadata: vi.fn(),
  constructedWith: vi.fn(),
}));

vi.mock("balls-token-client", () => {
  class BallsTokenClient {
    metadata = mocks.metadata;

    constructor(options: unknown) {
      mocks.constructedWith(options);
    }
  }

  return {
    Client: BallsTokenClient,
    networks: { testnet: { contractId: "CTESTBALLSNETWORK" } },
  };
});

// The fallback contract id is keyed off the active network, so pin a network
// with no built-in default to exercise the "not configured" branch directly.
vi.mock("@/lib/stellarConfig", () => ({
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  stellarNetwork: "LOCAL",
}));

import { createBallsClient, fetchBallsMetadata } from "@/lib/contracts/balls";

const ORIGINAL_CONTRACT_ID = process.env.NEXT_PUBLIC_BALLS_CONTRACT_ID;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_BALLS_CONTRACT_ID = "CUSERCONFIGURED";
});

afterEach(() => {
  if (ORIGINAL_CONTRACT_ID === undefined) {
    delete process.env.NEXT_PUBLIC_BALLS_CONTRACT_ID;
  } else {
    process.env.NEXT_PUBLIC_BALLS_CONTRACT_ID = ORIGINAL_CONTRACT_ID;
  }
});

describe("fetchBallsMetadata", () => {
  it("returns the decimals, name and symbol reported by the contract", async () => {
    mocks.metadata.mockResolvedValue({ result: [8, "Balls Token", "BALLS"] });

    await expect(fetchBallsMetadata()).resolves.toEqual({
      decimals: 8,
      name: "Balls Token",
      symbol: "BALLS",
    });

    expect(mocks.constructedWith).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: "CUSERCONFIGURED" }),
    );
  });

  it("falls back to the documented [7, Balls, BALLS] tuple when metadata is missing", async () => {
    mocks.metadata.mockResolvedValue({ result: undefined });

    await expect(fetchBallsMetadata()).resolves.toEqual({
      decimals: 7,
      name: "Balls",
      symbol: "BALLS",
    });
  });
});

describe("createBallsClient", () => {
  it("throws a descriptive error when no contract id is configured", () => {
    delete process.env.NEXT_PUBLIC_BALLS_CONTRACT_ID;

    expect(() => createBallsClient()).toThrow(
      "Balls token contract id is not configured for LOCAL. Set NEXT_PUBLIC_BALLS_CONTRACT_ID.",
    );
  });

  it("passes the resolved contract id and network config into the client", () => {
    createBallsClient();

    expect(mocks.constructedWith).toHaveBeenCalledWith({
      contractId: "CUSERCONFIGURED",
      networkPassphrase: "Test SDF Network ; September 2015",
      rpcUrl: "https://soroban-testnet.stellar.org",
      allowHttp: false,
      publicKey: undefined,
      signTransaction: undefined,
    });
  });
});
