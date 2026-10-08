"use client";

import { Client as SwapContractClient, networks as swapNetworks } from "swap-client";
import type { SignTransaction as SorobanSignTransaction } from "@stellar/stellar-sdk/contract";

import { networkPassphrase, rpcUrl } from "@/lib/stellarConfig";
import { extractSorobanErrorMessage } from "@/lib/util/soroban";

type WalletSigner = SorobanSignTransaction;

const resolveContractId = () => {
  const fallback = swapNetworks.testnet.contractId;
  const contractId = process.env.NEXT_PUBLIC_SWAP_CONTRACT_ID ?? fallback;
  if (!contractId) {
    throw new Error("Swap contract id is not configured. Set NEXT_PUBLIC_SWAP_CONTRACT_ID.");
  }
  return contractId;
};

const adaptSigner = (
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
      throw new Error(
        extractSorobanErrorMessage(response.error, "Wallet rejected the transaction."),
      );
    }

    return response;
  };
};

type CreateClientParams = {
  publicKey?: string;
  signer?: WalletSigner;
};

export const createSwapClient = ({ publicKey, signer }: CreateClientParams = {}) => {
  const contractId = resolveContractId();

  return new SwapContractClient({
    contractId,
    networkPassphrase,
    rpcUrl,
    allowHttp: rpcUrl.startsWith("http://"),
    publicKey,
    signTransaction: signer && publicKey ? adaptSigner(signer, publicKey) : undefined,
  });
};

export type { TeaMetadata as SwapTeaMetadata } from "swap-client";
export interface SwapRate {
  starsPerXlmNum: bigint;
  starsPerXlmDen: bigint;
}

/**
 * Reads the admin-configured XLM -> STARS rate from the swap contract. The rate
 * lives on-chain so the displayed price and the minted amount always agree with
 * the contract's configuration instead of a page-local literal.
 */
export const fetchSwapRate = async (): Promise<SwapRate> => {
  const client = createSwapClient();
  const rateTx = await client.rate();
  const result = rateTx.result;

  if (!result) {
    throw new Error("Swap rate is not configured on-chain.");
  }

  const [starsPerXlmNum, starsPerXlmDen] = result;

  if (starsPerXlmNum <= 0n || starsPerXlmDen <= 0n) {
    throw new Error("Swap rate is not configured on-chain.");
  }

  return { starsPerXlmNum, starsPerXlmDen };
};


