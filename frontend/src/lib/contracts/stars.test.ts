import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StarsWalletSigner } from "@/lib/contracts/stars";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  metadata: vi.fn(),
  transfer: vi.fn(),
  signAndSend: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk/contract", () => ({
  Client: { from: mocks.from },
}));

vi.mock("@/lib/stellarConfig", () => ({
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  stellarNetwork: "TESTNET",
}));

import {
  BASE_MINT_STARS_COST,
  fetchStarsMetadata,
  payStarsFee,
} from "@/lib/contracts/stars";

const signer = vi.fn() as unknown as StarsWalletSigner;

beforeEach(() => {
  vi.clearAllMocks();
  // A single shared client shape backs both the read-only and the signing clients,
  // so tests can assert on the same `metadata`/`transfer` spies regardless of caching.
  mocks.from.mockResolvedValue({
    metadata: mocks.metadata,
    transfer: mocks.transfer,
  });
  mocks.metadata.mockResolvedValue({
    result: [8, "STARS Premium Token", "STARS"],
  });
  mocks.transfer.mockResolvedValue({
    needsNonInvokerSigningBy: () => [],
    signAndSend: mocks.signAndSend,
  });
});

describe("BASE_MINT_STARS_COST", () => {
  it("defaults to 150 STARS", () => {
    expect(BASE_MINT_STARS_COST).toBe(150);
  });
});

describe("payStarsFee", () => {
  it("transfers the 150 STARS fee scaled by the contract decimals (8)", async () => {
    await payStarsFee({
      publicKey: "GABC",
      signer,
      destination: "GDEST",
    });

    expect(mocks.transfer).toHaveBeenCalledTimes(1);
    expect(mocks.transfer).toHaveBeenCalledWith({
      from: "GABC",
      to: "GDEST",
      amount: 150n * 10n ** 8n,
    });
    expect(mocks.signAndSend).toHaveBeenCalledTimes(1);
  });

  it("falls back to 7 decimals when metadata is unavailable", async () => {
    // The deployed token reports 8 decimals; this pins the documented `?? 7`
    // fallback so a change to it is an intentional decision, not an accident.
    mocks.metadata.mockResolvedValue({ result: undefined });

    await payStarsFee({
      publicKey: "GABC",
      signer,
      destination: "GDEST",
    });

    expect(mocks.transfer).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 150n * 10n ** 7n }),
    );
  });

  it("honours a custom amount argument", async () => {
    await payStarsFee({
      publicKey: "GABC",
      signer,
      destination: "GDEST",
      amount: 2,
    });

    expect(mocks.transfer).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2n * 10n ** 8n }),
    );
  });

  it("throws before transferring when no wallet address is supplied", async () => {
    await expect(
      payStarsFee({ publicKey: "", signer, destination: "GDEST" }),
    ).rejects.toThrow("Wallet address is required to pay STARS fee.");

    expect(mocks.transfer).not.toHaveBeenCalled();
  });

  it("surfaces when additional signatures are required", async () => {
    mocks.transfer.mockResolvedValue({
      needsNonInvokerSigningBy: () => ["GOTHER"],
      signAndSend: mocks.signAndSend,
    });

    await expect(
      payStarsFee({ publicKey: "GABC", signer, destination: "GDEST" }),
    ).rejects.toThrow(/Additional signatures required/);

    expect(mocks.signAndSend).not.toHaveBeenCalled();
  });
});

describe("fetchStarsMetadata", () => {
  it("returns the decimals, name and symbol reported by the contract", async () => {
    await expect(fetchStarsMetadata()).resolves.toEqual({
      decimals: 8,
      name: "STARS Premium Token",
      symbol: "STARS",
    });
  });

  it("falls back to 7 decimals and Stars defaults when metadata is missing", async () => {
    mocks.metadata.mockResolvedValue({ result: undefined });

    await expect(fetchStarsMetadata()).resolves.toEqual({
      decimals: 7,
      name: "Stars",
      symbol: "STARS",
    });
  });
});
