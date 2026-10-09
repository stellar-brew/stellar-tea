"use client";

import {
  Client as BallsTokenClient,
  networks as ballsNetworks,
} from "balls-token-client";
import type { SignTransaction as SorobanSignTransaction } from "@stellar/stellar-sdk/contract";

import { networkPassphrase, rpcUrl, stellarNetwork } from "@/lib/stellarConfig";

type WalletSigner = SorobanSignTransaction;
export type BallsWalletSigner = WalletSigner;

/** BALLS metadata decimals, matching contracts/tokens/balls/src/metadata.rs. */
export const BALLS_DECIMALS = 8;

const NETWORK_DEFAULT_CONTRACT: Partial<Record<typeof stellarNetwork, string>> = {
  TESTNET: ballsNetworks.testnet.contractId,
};

const resolveContractId = () => {
  const fromEnv = process.env.NEXT_PUBLIC_BALLS_CONTRACT_ID;
  const fallback = NETWORK_DEFAULT_CONTRACT[stellarNetwork];

  const contractId = fromEnv ?? fallback;

  if (!contractId) {
    throw new Error(
      `Balls token contract id is not configured for ${stellarNetwork}. Set NEXT_PUBLIC_BALLS_CONTRACT_ID.`,
    );
  }

  return contractId;
};

const adaptWalletSigner = (
  signer: Required<WalletSigner>,
  defaultAddress?: string,
): WalletSigner => {
  return async (xdr, opts) => {
    const response = await signer(xdr, {
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

export const createBallsClient = ({ publicKey, signer }: CreateClientParams = {}) => {
  const contractId = resolveContractId();

  return new BallsTokenClient({
    contractId,
    networkPassphrase,
    rpcUrl,
    allowHttp: rpcUrl.startsWith("http://"),
    publicKey,
    signTransaction: signer && publicKey ? adaptWalletSigner(signer, publicKey) : undefined,
  });
};

export const fetchBallsMetadata = async () => {
  const client = createBallsClient();
  const metadataTx = await client.metadata();
  const [decimals, name, symbol] = metadataTx.result ?? [BALLS_DECIMALS, "Balls", "BALLS"];

  return {
    decimals: Number(decimals),
    name,
    symbol,
  };
};


