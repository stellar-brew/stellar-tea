"use client";

import {
  Client as GameClient,
  type Listing as GameListing,
  type PaymentToken,
  networks as gameNetworks,
  rpc,
  xdr,
} from "tea-game-client";
import type { SignTransaction as SorobanSignTransaction } from "@stellar/stellar-sdk/contract";
import { scValToNative } from "@stellar/stellar-sdk";

import { networkPassphrase, rpcUrl, stellarNetwork } from "@/lib/stellarConfig";
import { createTeaNftClient, fetchTeaMetadata } from "@/lib/contracts/nft";

type WalletSigner = SorobanSignTransaction;
export type GameWalletSigner = WalletSigner;

const NETWORK_DEFAULT_CONTRACT: Partial<Record<typeof stellarNetwork, string>> = {
  TESTNET: gameNetworks.testnet.contractId,
};

const resolveContractId = () => {
  const fromEnv = process.env.NEXT_PUBLIC_GAME_CONTRACT_ID;
  const fallback = NETWORK_DEFAULT_CONTRACT[stellarNetwork];

  const contractId = fromEnv ?? fallback;

  if (!contractId) {
    throw new Error(
      `Game contract id is not configured for ${stellarNetwork}. Set NEXT_PUBLIC_GAME_CONTRACT_ID.`,
    );
  }

  return contractId;
};

const adaptWalletSigner = (
  signer: Required<WalletSigner>,
  defaultAddress?: string,
): WalletSigner => {
  return async (xdrEnvelope, opts) => {
    const response = await signer(xdrEnvelope, {
      ...opts,
      address: opts?.address ?? defaultAddress,
      networkPassphrase: opts?.networkPassphrase ?? networkPassphrase,
    });

    if ("error" in response && response.error) {
      throw new Error(response.error);
    }

    return response;
  };
};

type CreateClientParams = {
  publicKey?: string;
  signer?: WalletSigner;
};

export const createGameClient = ({ publicKey, signer }: CreateClientParams = {}) => {
  const contractId = resolveContractId();

  return new GameClient({
    contractId,
    networkPassphrase,
    rpcUrl,
    allowHttp: rpcUrl.startsWith("http://"),
    publicKey,
    signTransaction: signer && publicKey ? adaptWalletSigner(signer, publicKey) : undefined,
  });
};

const rpcServer = new rpc.Server(rpcUrl, {
  allowHttp: rpcUrl.startsWith("http://"),
});

export const resolvePaymentToken = (paymentToken: PaymentToken) => {
  if (paymentToken.tag === "Balls") return "BALLS" as const;
  return "STARS" as const;
};

export type OnChainListing = {
  seller: string;
  price: bigint;
  paymentToken: ReturnType<typeof resolvePaymentToken>;
  createdAt: number;
};

const LISTING_SYMBOL = "Listing";

export const isMissingEntryError = (error: unknown) => {
  if (!error) return false;

  if (typeof error === "object") {
    if ("status" in error && (error as { status?: number }).status === 404) return true;
    if ("code" in error && (error as { code?: number }).code === 404) return true;
    if ("name" in error && (error as { name?: string }).name === "NotFoundError") return true;
    if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
      const message = (error as { message: string }).message.toLowerCase();
      if (
        message.includes("entry not found") ||
        message.includes("missing value") ||
        message.includes("missing state") ||
        message.includes("not found") ||
        message.includes("404")
      ) {
        return true;
      }
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("entry not found") ||
      message.includes("missing value") ||
      message.includes("missing state") ||
      message.includes("not found") ||
      message.includes("404")
    );
  }

  return false;
};

export const fetchListingFromStorage = async (
  contractId: string,
  tokenId: number,
): Promise<OnChainListing | null> => {
  const key = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol(LISTING_SYMBOL),
    xdr.ScVal.scvU64(BigInt(tokenId)),
  ]);

  const tryFetch = async (durability: rpc.Durability): Promise<OnChainListing | null> => {
    const entry = await rpcServer.getContractData(contractId, key, durability);
    const value = entry?.val?.contractData()?.val();
    if (!value) return null;

    const decoded = scValToNative<GameListing>(value);
    if (!decoded) return null;

    return {
      seller: decoded.seller,
      price: BigInt(decoded.price),
      paymentToken: resolvePaymentToken(decoded.payment_token),
      createdAt: Number(decoded.created_at),
    };
  };

  const tried: Array<{ durability: rpc.Durability; error: unknown }> = [];

  for (const durability of [rpc.Durability.Persistent, rpc.Durability.Temporary]) {
    try {
      const listing = await tryFetch(durability);
      if (listing) return listing;
    } catch (error) {
      if (isMissingEntryError(error)) {
        continue;
      }
      tried.push({ durability, error });
    }
  }

  if (tried.length > 0) {
    console.error(
      `Failed to fetch listing for token ${tokenId} after trying ${tried
        .map(({ durability }) => durability)
        .join(", ")}`,
      tried.at(-1)?.error,
    );
  }

  return null;
};

export type MarketplaceListing = {
  tokenId: number;
  listing: OnChainListing;
  metadata: Awaited<ReturnType<typeof fetchTeaMetadata>>;
  tokenUri?: string;
};

export const fetchMarketplaceListings = async (): Promise<MarketplaceListing[]> => {
  const contractId = resolveContractId();
  const teaClient = createTeaNftClient();

  const supplyTx = await teaClient.total_supply();
  const totalSupply = Number(supplyTx.result ?? 0);

  if (!Number.isFinite(totalSupply) || totalSupply <= 0) {
    return [];
  }

  const listings: MarketplaceListing[] = [];

  for (let index = 0; index < totalSupply; index += 1) {
    const tokenIdTx = await teaClient.get_token_id({ index });
    const tokenId = Number(tokenIdTx.result ?? 0);
    if (!tokenId) continue;

    const listing = await fetchListingFromStorage(contractId, tokenId);
    if (!listing) continue;

    const [metadata, tokenUriTx] = await Promise.all([
      fetchTeaMetadata(tokenId),
      teaClient.token_uri({ token_id: tokenId }),
    ]);

    listings.push({
      tokenId,
      listing,
      metadata,
      tokenUri: tokenUriTx.result ?? undefined,
    });
  }

  return listings.sort((a, b) => Number(b.listing.createdAt - a.listing.createdAt));
};

export const paymentTokenLabel = (token: OnChainListing["paymentToken"]) => {
  switch (token) {
    case "BALLS":
      return "Balls";
    case "STARS":
      return "Stars";
    default:
      return token;
  }
};


