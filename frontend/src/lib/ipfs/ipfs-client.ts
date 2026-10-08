"use client";

import type { KuboRPCClient, AddResult } from "kubo-rpc-client";

import { getIPFSClientConfig, getIPFSUrl } from "./ipfs-config";

let ipfsClient: KuboRPCClient | null = null;

const ensureClient = async (): Promise<KuboRPCClient> => {
  if (typeof window === "undefined") {
    throw new Error("IPFS client is only available in the browser environment.");
  }

  if (!ipfsClient) {
    const { create } = await import("kubo-rpc-client");
    ipfsClient = create(getIPFSClientConfig());
  }

  return ipfsClient;
};

export const uploadToIPFS = async (file: File | Blob) => {
  const client = await ensureClient();
  const result: AddResult = await client.add(file, {
    cidVersion: 1,
    pin: true,
    wrapWithDirectory: false,
  });
  const cid = result?.cid?.toString?.() ?? result?.path;

  if (!cid) {
    throw new Error("Failed to obtain CID from IPFS response.");
  }

  return {
    cid,
    path: result?.path ?? cid,
    size: Number(result?.size ?? 0),
    url: getIPFSUrl(cid),
  };
};

export const uploadMetadataToIPFS = async (metadata: unknown) => {
  const client = await ensureClient();
  const payload = JSON.stringify(metadata, null, 2);
  const result: AddResult = await client.add(payload, {
    cidVersion: 1,
    pin: true,
    wrapWithDirectory: false,
  });
  const cid = result?.cid?.toString?.() ?? result?.path;

  if (!cid) {
    throw new Error("Failed to obtain CID from IPFS response.");
  }

  return {
    cid,
    path: result?.path ?? cid,
    size: Number(result?.size ?? 0),
    url: getIPFSUrl(cid),
  };
};

export { getIPFSUrl };


