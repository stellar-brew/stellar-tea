import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clientMock = vi.hoisted(() => ({
  balance: vi.fn(),
  getOwnerTokenId: vi.fn(),
  getMetadata: vi.fn(),
  tokenUri: vi.fn(),
}));

vi.mock("tea-nft-client", () => {
  class Client {
    constructor(_options: unknown) {}
    balance = clientMock.balance;
    get_owner_token_id = clientMock.getOwnerTokenId;
    get_metadata = clientMock.getMetadata;
    token_uri = clientMock.tokenUri;
  }

  return {
    Client,
    networks: { testnet: { contractId: "CTESTNETTEA" } },
  };
});

vi.mock("@/lib/stellarConfig", () => ({
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "http://localhost:8000/rpc",
  stellarNetwork: "TESTNET",
}));

import {
  fetchOwnedTeaTokens,
  fetchTeaMetadata,
  toGatewayUrl,
} from "@/lib/contracts/nft";

const chainMetadata = {
  display_name: "Lunar Assam",
  flavor_profile: "citrus",
  image_uri: "ipfs://lunar",
  infusion: "base",
  level: 1,
  lineage: [10],
  rarity: 1,
  stats: { sweetness: 5, body: 7, caffeine: 3 },
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL;
  delete process.env.NEXT_PUBLIC_TEA_NFT_CONTRACT_ID;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("toGatewayUrl", () => {
  it("rewrites an ipfs:// URI onto the default gateway", () => {
    expect(toGatewayUrl("ipfs://bafybeigdyrzt")).toBe(
      "https://ipfs.filebase.io/ipfs/bafybeigdyrzt",
    );
  });

  it("passes https and http URLs through unchanged", () => {
    expect(toGatewayUrl("https://example.com/metadata.json")).toBe(
      "https://example.com/metadata.json",
    );
    expect(toGatewayUrl("http://example.com/metadata.json")).toBe(
      "http://example.com/metadata.json",
    );
  });

  it("passes a bare CID through unchanged", () => {
    expect(toGatewayUrl("bafybeigdyrzt")).toBe("bafybeigdyrzt");
  });

  it("short-circuits on an empty URI", () => {
    expect(toGatewayUrl("")).toBe("");
  });
});

describe("fetchOwnedTeaTokens", () => {
  it("returns an empty list when the balance is zero", async () => {
    clientMock.balance.mockResolvedValue({ result: 0 });

    await expect(fetchOwnedTeaTokens("GOWNER")).resolves.toEqual([]);
    expect(clientMock.getOwnerTokenId).not.toHaveBeenCalled();
  });

  it("returns an empty list when no owner is supplied", async () => {
    await expect(fetchOwnedTeaTokens("")).resolves.toEqual([]);
    expect(clientMock.balance).not.toHaveBeenCalled();
  });

  it("requests one id per balance entry and sorts results ascending", async () => {
    clientMock.balance.mockResolvedValue({ result: 3 });
    const ids = [9, 2, 5];
    clientMock.getOwnerTokenId.mockImplementation(
      async ({ index }: { index: number }) => ({ result: ids[index] }),
    );
    clientMock.getMetadata.mockResolvedValue({ result: chainMetadata });
    clientMock.tokenUri.mockResolvedValue({ result: "" });
    vi.stubGlobal("fetch", vi.fn());

    const tokens = await fetchOwnedTeaTokens("GOWNER");

    expect(clientMock.getOwnerTokenId).toHaveBeenCalledTimes(3);
    expect(tokens.map((token) => token.tokenId)).toEqual([2, 5, 9]);
    expect(tokens[0].metadata).toEqual(chainMetadata);
  });

  it("yields offchainMetadata null when the metadata fetch fails", async () => {
    clientMock.balance.mockResolvedValue({ result: 1 });
    clientMock.getOwnerTokenId.mockResolvedValue({ result: 1 });
    clientMock.getMetadata.mockResolvedValue({ result: chainMetadata });
    clientMock.tokenUri.mockResolvedValue({ result: "ipfs://bafybeigdyrzt" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const tokens = await fetchOwnedTeaTokens("GOWNER");

    expect(tokens).toHaveLength(1);
    expect(tokens[0].offchainMetadata).toBeNull();
  });
});

describe("fetchTeaMetadata", () => {
  it("returns null when the client exposes no result", async () => {
    clientMock.getMetadata.mockResolvedValue({ result: undefined });
    await expect(fetchTeaMetadata(1)).resolves.toBeNull();
  });
});
