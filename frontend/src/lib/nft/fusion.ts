"use client";

import { createTeaNftClient, type TeaNftWalletSigner } from "@/lib/contracts/nft";
import { buildTeaMetadata, type TeaMetadata, type LayerSnapshot, toIpfsUri } from "@/lib/nft";
import { renderTeaImage, type SelectedLayer } from "@/lib/nft/generator";
import { uploadBlobToIpfs, uploadJsonToIpfs } from "@/lib/ipfs/client";
import {
  buildLineage,
  deriveFusionColorway,
  deriveFusionStats,
  type FusionParentLike,
} from "@/lib/nft/fusion-helpers";
import type { TeaMetadata as ChainTeaMetadata } from "tea-nft-client";

export type FusionParent = FusionParentLike;

export interface FusionRequest {
  seed: string;
  parents: FusionParent[];
  selection: SelectedLayer[];
  rank: number;
  rarity: string;
  flavorProfile: string;
  infusion: string;
  mixCount: number;
  address: string;
  signer: TeaNftWalletSigner;
  gatewayBaseUrl?: string;
}

export interface FusionResult {
  tokenId: number;
  imageCid: string;
  metadataCid: string;
  metadata: TeaMetadata;
}

const buildLayerSnapshots = (layers: SelectedLayer[]): LayerSnapshot[] =>
  layers.map((layer) => ({
    categoryId: layer.categoryId,
    variantId: layer.variant.id,
    label: layer.variant.label,
    order: layer.order,
    assetUri: toIpfsUri(layer.variant.assetCid),
    tint: layer.tint,
  }));

const rarityToCode = (rarity: string): number => {
  switch (rarity.trim().toLowerCase()) {
    case "uncommon":
      return 2;
    case "rare":
      return 3;
    case "epic":
      return 4;
    case "legendary":
      return 5;
    case "common":
    default:
      return 1;
  }
};

const toChainMetadata = (metadata: TeaMetadata): ChainTeaMetadata => ({
  display_name: metadata.name,
  flavor_profile: metadata.properties.flavorProfile,
  image_uri: metadata.image,
  infusion: metadata.properties.infusion,
  level: metadata.properties.rank,
  lineage: metadata.properties.lineage.parents
    .map((parent) => parent.tokenId)
    .filter((tokenId): tokenId is string => Boolean(tokenId) && /^\d+$/.test(tokenId))
    .map((tokenId) => BigInt(tokenId)),
  rarity: rarityToCode(metadata.properties.rarity),
  stats: {
    body: metadata.properties.stats.body,
    caffeine: metadata.properties.stats.caffeine,
    sweetness: metadata.properties.stats.sweetness,
  },
});

export const completeFusion = async ({
  seed,
  parents,
  selection,
  rank,
  rarity,
  flavorProfile,
  infusion,
  mixCount,
  address,
  signer,
  gatewayBaseUrl,
}: FusionRequest): Promise<FusionResult> => {
  if (selection.length === 0) {
    throw new Error("No layers provided for fusion rendering.");
  }

  const colorway = deriveFusionColorway(parents.map((parent) => parent.metadata));
  const stats = deriveFusionStats(parents.map((parent) => parent.metadata));
  const lineage = buildLineage(parents);

  const rendered = await renderTeaImage(selection, {
    width: 1024,
    height: 1024,
    background: { mode: "solid", color: "#ffffff" },
    gatewayBaseUrl,
    withBlob: true,
  });

  if (!rendered.blob) {
    throw new Error("Failed to produce PNG blob for fusion render.");
  }

  const imageUpload = await uploadBlobToIpfs(rendered.blob, `${seed}-fusion.png`, "image/png");

  const metadataPayload = buildTeaMetadata({
    name: `Stellar Tea Fusion ${seed.slice(0, 6).toUpperCase()}`,
    description: `A collaborative Stellar Tea fusion bursting with ${flavorProfile} notes.`,
    imageCid: imageUpload.cid,
    seed,
    rank,
    rarity,
    flavorProfile,
    infusion,
    colorway,
    layers: buildLayerSnapshots(selection),
    lineage,
    stats,
    mixCount,
  });

  const metadataUpload = await uploadJsonToIpfs(metadataPayload, `${seed}-fusion.json`);

  const client = createTeaNftClient({
    publicKey: address,
    signer,
  });

  const onchainMetadata = toChainMetadata(metadataPayload);

  const transaction = await client.mint({
    caller: address,
    to: address,
    tea_metadata: onchainMetadata,
  });

  const pendingSigners = transaction.needsNonInvokerSigningBy?.() ?? [];
  if (pendingSigners.length > 0) {
    throw new Error(
      `Additional signatures required for mint transaction: ${pendingSigners.join(", ")}`,
    );
  }

  await transaction.signAndSend();
  const tokenIdResult = transaction.result;
  const tokenId =
    typeof tokenIdResult === "bigint"
      ? Number(tokenIdResult)
      : Number(tokenIdResult ?? 0);

  return {
    tokenId,
    imageCid: imageUpload.cid,
    metadataCid: metadataUpload.cid,
    metadata: metadataPayload,
  };
};


