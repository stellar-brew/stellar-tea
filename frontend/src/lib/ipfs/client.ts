"use client";

import { toIpfsUri } from "@/lib/nft";

import { getIPFSUrl } from "./ipfs-config";
import { uploadMetadataToIPFS, uploadToIPFS } from "./ipfs-client";

export interface UploadResult {
  cid: string;
  uri: string;
  gatewayUrl: string;
  size?: number;
}

const buildGatewayUrl = (cid: string) => getIPFSUrl(cid);

export const uploadBlobToIpfs = async (
  blob: Blob,
  filename: string,
  contentType?: string,
): Promise<UploadResult> => {
  const file =
    blob instanceof File ? blob : new File([blob], filename, { type: contentType ?? blob.type });

  const result = await uploadToIPFS(file);

  return {
    cid: result.cid,
    uri: toIpfsUri(result.cid),
    gatewayUrl: buildGatewayUrl(result.cid),
    size: result.size,
  };
};

export const uploadJsonToIpfs = async (
  data: unknown,
  filename?: string,
): Promise<UploadResult> => {
  const result = await uploadMetadataToIPFS(data, filename);

  return {
    cid: result.cid,
    uri: toIpfsUri(result.cid),
    gatewayUrl: buildGatewayUrl(result.cid),
    size: result.size,
  };
};


