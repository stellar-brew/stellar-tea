"use client";

import {
  Client as TeaNftClient,
  type TeaMetadata as ChainTeaMetadata,
  networks as teaNftNetworks,
} from "tea-nft-client";
import type { SignTransaction as SorobanSignTransaction } from "@stellar/stellar-sdk/contract";

import { networkPassphrase, rpcUrl, stellarNetwork } from "@/lib/stellarConfig";
import { type TeaMetadata as OffchainTeaMetadata } from "@/lib/nft/schema";

type WalletSigner = SorobanSignTransaction;
export type TeaNftWalletSigner = WalletSigner;

const NETWORK_DEFAULT_CONTRACT: Partial<Record<typeof stellarNetwork, string>> = {
  TESTNET: teaNftNetworks.testnet.contractId,
};

const resolveContractId = () => {
  const fromEnv = process.env.NEXT_PUBLIC_TEA_NFT_CONTRACT_ID;
  const fallback = NETWORK_DEFAULT_CONTRACT[stellarNetwork];

  const contractId = fromEnv ?? fallback;

  if (!contractId) {
    throw new Error(
      `Tea NFT contract id is not configured for ${stellarNetwork}. Set NEXT_PUBLIC_TEA_NFT_CONTRACT_ID.`,
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

export const createTeaNftClient = ({ publicKey, signer }: CreateClientParams = {}) => {
  const contractId = resolveContractId();

  return new TeaNftClient({
    contractId,
    networkPassphrase,
    rpcUrl,
    allowHttp: rpcUrl.startsWith("http://"),
    publicKey,
    signTransaction: signer && publicKey ? adaptWalletSigner(signer, publicKey) : undefined,
  });
};

export const getTeaContractId = () => resolveContractId();

/**
 * Destination for the 150 STARS mint fee.
 *
 * Operators can point the fee at a dedicated treasury with
 * NEXT_PUBLIC_TEA_MINT_FEE_DESTINATION. When unset it defaults to the tea NFT
 * contract, which exposes an admin-guarded `sweep` entrypoint so the held
 * STARS can be recovered instead of being stranded.
 */
export const getMintFeeDestination = (): string => {
  const configured = process.env.NEXT_PUBLIC_TEA_MINT_FEE_DESTINATION?.trim();
  return configured && configured.length > 0 ? configured : getTeaContractId();
};

export type OwnedTeaToken = {
  tokenId: number;
  metadata: ChainTeaMetadata;
  tokenUri?: string;
  offchainMetadata?: OffchainTeaMetadata | null;
};

const resolveGatewayBase = () =>
  (process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL ?? "https://ipfs.filebase.io").replace(/\/$/, "");

export const toGatewayUrl = (uri: string) => {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://")) {
    const path = uri.slice("ipfs://".length);
    return `${resolveGatewayBase()}/ipfs/${path}`;
  }
  return uri;
};

const fetchOffchainMetadata = async (uri?: string): Promise<OffchainTeaMetadata | null> => {
  if (!uri) return null;

  try {
    const url = toGatewayUrl(uri);
    const response = await fetch(url, { cache: "force-cache" });

    if (!response.ok) {
      throw new Error(`Failed to load metadata ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OffchainTeaMetadata;
    return data;
  } catch (error) {
    console.warn("Failed to fetch off-chain metadata", { uri, error });
    return null;
  }
};

export const fetchOwnedTeaTokens = async (owner: string): Promise<OwnedTeaToken[]> => {
  if (!owner) return [];

  const client = createTeaNftClient();

  const balanceTx = await client.balance({ account: owner });
  const rawBalance = balanceTx.result ?? 0;
  const balance = Number(rawBalance);

  if (!Number.isFinite(balance) || balance <= 0) {
    return [];
  }

  const tokens = await Promise.all(
    Array.from({ length: balance }).map(async (_, index) => {
      const tokenIdTx = await client.get_owner_token_id({ owner, index });
      const tokenId = Number(tokenIdTx.result ?? 0);

      const [metadataTx, tokenUriTx] = await Promise.all([
        client.get_metadata({ token_id: tokenId }),
        client.token_uri({ token_id: tokenId }),
      ]);

      const tokenUri = tokenUriTx.result ?? undefined;

      return {
        tokenId,
        metadata: metadataTx.result,
        tokenUri,
        offchainMetadata: await fetchOffchainMetadata(tokenUri),
      } satisfies OwnedTeaToken;
    }),
  );

  return tokens.sort((a, b) => a.tokenId - b.tokenId);
};

export const fetchTeaMetadata = async (tokenId: number): Promise<TeaMetadata | null> => {
  if (!Number.isFinite(tokenId)) return null;

  const client = createTeaNftClient();
  const metadataTx = await client.get_metadata({ token_id: tokenId });

  return metadataTx.result ?? null;
};


