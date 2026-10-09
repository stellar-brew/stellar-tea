"use client";

import {
  Client as StarsContractClient,
  networks as starsNetworks,
} from "stars-token-client";
import type { SignTransaction as SorobanSignTransaction } from "@stellar/stellar-sdk/contract";

import { networkPassphrase, rpcUrl, stellarNetwork } from "@/lib/stellarConfig";
import { extractSorobanErrorMessage } from "@/lib/util/soroban";
import { parseAmountToI128 } from "@/lib/util/tokenMath";

type WalletSigner = SorobanSignTransaction;
export type StarsWalletSigner = WalletSigner;

const NETWORK_DEFAULT_CONTRACT: Partial<Record<typeof stellarNetwork, string>> =
  {
    TESTNET: starsNetworks.testnet.contractId,
  };
/** STARS metadata decimals, matching contracts/tokens/stars/src/metadata.rs. */
export const STARS_DECIMALS = 8;

const NETWORK_DEFAULT_CONTRACT: Partial<Record<typeof stellarNetwork, string>> = {
  TESTNET: "CCSMRVZW77HXGDBVXUTDAM5MOH4AX6DS2O7CWY3TEVAUHGJFEYN7LWJP",
};

const resolveContractId = () => {
  const fromEnv = process.env.NEXT_PUBLIC_STARS_CONTRACT_ID;
  const fallback = NETWORK_DEFAULT_CONTRACT[stellarNetwork];

  const contractId = fromEnv ?? fallback;

  if (!contractId) {
    throw new Error(
      `STARS contract id is not configured for ${stellarNetwork}. Set NEXT_PUBLIC_STARS_CONTRACT_ID.`,
    );
  }

  return contractId;
};

type CreateClientParams = {
  publicKey?: string;
  signer?: WalletSigner;
};

let cachedReadOnlyClient: Promise<StarsContractClient> | null = null;

const buildClient = async ({
  publicKey,
  signer,
}: CreateClientParams = {}): Promise<StarsContractClient> => {
  return new StarsContractClient({
    contractId: resolveContractId(),
    networkPassphrase,
    rpcUrl,
    allowHttp: rpcUrl.startsWith("http://"),
    ...(publicKey ? { publicKey } : {}),
    ...(signer && publicKey ? { signTransaction: signer } : {}),
  });
};

export const createStarsClient = async (params: CreateClientParams = {}) => {
  const requiresSigner = Boolean(params.publicKey && params.signer);

  if (requiresSigner) {
    return buildClient(params);
  }

  if (!cachedReadOnlyClient) {
    cachedReadOnlyClient = buildClient();
  }

  return cachedReadOnlyClient;
};

export const fetchStarsMetadata = async (): Promise<{
  decimals: number;
  name: string;
  symbol: string;
}> => {
  const client = await createStarsClient();
  const { result } = await client.metadata();
  const [decimals, name, symbol] = result ?? ([7, "Stars", "STARS"] as const);
  const [decimals, name, symbol] = result ?? [STARS_DECIMALS, "Stars", "STARS"];

  return {
    decimals: Number(decimals),
    name,
    symbol,
  };
};

export const BASE_MINT_STARS_COST = 150;

export const payStarsFee = async ({
  publicKey,
  signer,
  amount = BASE_MINT_STARS_COST,
  destination,
}: {
  publicKey: string;
  signer: StarsWalletSigner;
  amount?: number;
  destination: string;
}) => {
  if (!publicKey) {
    throw new Error("Wallet address is required to pay STARS fee.");
  }

  const client = await createStarsClient({
    publicKey,
    signer,
  });

  const { result: metadataResult } = await client.metadata();
  const decimals = Number(metadataResult?.[0] ?? STARS_DECIMALS);
  const scaledAmount = parseAmountToI128(amount.toString(), decimals);

  try {
    const tx = await client.transfer({
      from: publicKey,
      to: destination,
      amount: scaledAmount,
    });

    const pending = tx.needsNonInvokerSigningBy?.() ?? [];
    if (pending.length > 0) {
      throw new Error(
        `Additional signatures required for STARS transfer: ${pending.join(", ")}`,
      );
    }

    await tx.signAndSend();
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? extractSorobanErrorMessage(
            error,
            "Failed to transfer STARS for minting.",
          )
        : "Failed to transfer STARS for minting.",
    );
  }
};
