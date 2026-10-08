"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useWallet } from "@/lib/hooks/useWallet";
import { TeaCard, type TeaCardData } from "@/components/nft/tea-card";
import { buildTeaMetadata } from "@/lib/nft";
import { generateLocalLayers } from "@/lib/nft/generateLocal";
import { buildFlavorTemplate } from "@/lib/nft/metadataTemplate";
import { renderTeaImage } from "@/lib/nft/generator";
import { uploadBlobToIpfs, uploadJsonToIpfs } from "@/lib/ipfs/client";
import { getMintFeeDestination } from "@/lib/contracts/nft";
import { BASE_MINT_STARS_COST, payStarsFee, type StarsWalletSigner } from "@/lib/contracts/stars";
import {
  createSwapClient,
  type SwapTeaMetadata,
} from "@/lib/contracts/swap";
import type { TeaMetadata as ChainTeaMetadata } from "tea-nft-client";

const OUTPUT_WIDTH = 485;
const OUTPUT_HEIGHT = 1000;

const randomStat = () => 40 + Math.floor(Math.random() * 40);

const rarityToCode = (rarity: string): number => {
  const normalized = rarity.trim().toLowerCase();
  switch (normalized) {
    case "common":
      return 1;
    case "uncommon":
      return 2;
    case "rare":
      return 3;
    case "epic":
      return 4;
    case "legendary":
      return 5;
    default:
      return 1;
  }
};

const unwrapTokenId = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "unwrap" in value &&
    typeof (value as { unwrap: () => unknown }).unwrap === "function"
  ) {
    try {
      const unwrapped = (value as { unwrap: () => unknown }).unwrap();
      return unwrapTokenId(unwrapped);
    } catch (error) {
      console.error("Failed to unwrap swap mint result", error);
      return undefined;
    }
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof (value as { value: unknown }).value !== "undefined"
  ) {
    return unwrapTokenId((value as { value: unknown }).value);
  }

  return undefined;
};

const MintPage = () => {
  const { address, signTransaction } = useWallet();
  const [isMinting, setIsMinting] = useState(false);
  const [mintedPreview, setMintedPreview] = useState<TeaCardData | null>(null);

  const handleMint = async () => {
    if (!address || !signTransaction) {
      toast({
        title: "Wallet required",
        description: "Connect your wallet to mint brews.",
      });
      return;
    }

    setIsMinting(true);
    try {
      const seed =
        typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const { layers, colorway, flavors } = generateLocalLayers({ forceSolid: true });
      const primaryFlavor = flavors[0];

      await payStarsFee({
        publicKey: address,
        signer: signTransaction as StarsWalletSigner,
        amount: BASE_MINT_STARS_COST,
        destination: getMintFeeDestination(),
      });

      const rendered = await renderTeaImage(layers, {
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
        background: undefined,
        withBlob: true,
      });

      if (!rendered.blob) {
        throw new Error("Failed to prepare PNG for upload.");
      }

      const imageUpload = await uploadBlobToIpfs(rendered.blob, `${seed}.png`, "image/png");

      const template = buildFlavorTemplate(primaryFlavor, seed, "Common");
      const stats = {
        body: randomStat(),
        caffeine: randomStat(),
        sweetness: randomStat(),
      };

      const metadataPayload = buildTeaMetadata({
        name: template.name,
        description: `${template.description} Brewed fresh in the Stellar Tea lab.`,
        imageCid: imageUpload.cid,
        seed,
        rank: 1,
        rarity: template.rarity,
        flavorProfile: template.flavorProfile,
        infusion: template.infusion,
        colorway,
        layers: layers.map((layer) => ({
          categoryId: layer.categoryId,
          variantId: layer.variant.id,
          label: layer.variant.label,
          order: layer.order,
          assetUri: layer.variant.assetCid,
          tint: layer.tint,
        })),
        lineage: { generation: 0, parents: [] },
        stats,
        mixCount: 0,
      });

      const metadataUpload = await uploadJsonToIpfs(metadataPayload);

      const onchainMetadata: SwapTeaMetadata = {
        display_name: template.name,
        flavor_profile: template.flavorProfile,
        rarity: rarityToCode(template.rarity),
        level: 1,
        infusion: template.infusion,
        stats: {
          body: stats.body,
          caffeine: stats.caffeine,
          sweetness: stats.sweetness,
        },
        lineage: [],
        image_uri: metadataPayload.image,
      };

      const swapClient = createSwapClient({
        publicKey: address,
        signer: signTransaction as StarsWalletSigner,
      });

      const mintTx = await swapClient.mint_tea({
        caller: address,
        recipient: address,
        tea_metadata: onchainMetadata,
      });

      const blockers = mintTx.needsNonInvokerSigningBy?.() ?? [];
      if (blockers.length > 0) {
        throw new Error(
          `Additional signatures required for mint: ${blockers.join(", ")}.`,
        );
      }

      const mintReceipt = await mintTx.signAndSend();
      const txHash =
        mintReceipt.getTransactionResponse?.txHash ??
        mintReceipt.sendTransactionResponse?.hash ??
        "";
      const tokenId = unwrapTokenId(mintTx.result);
      const info: string[] = [];
      if (typeof tokenId === "number" && Number.isFinite(tokenId)) {
        info.push(`Token #${tokenId}`);
      }
      if (txHash) {
        info.push(`Tx ${txHash}`);
      }
      if (info.length === 0) {
        info.push(`${BASE_MINT_STARS_COST} STARS debited.`);
      }

      toast({
        title: "Blind brew complete",
        description: info.join(" · "),
        dismissible: true,
      });

      const previewTokenId = typeof tokenId === "number" && Number.isFinite(tokenId) ? tokenId : undefined;
      const previewChainMetadata = {
        display_name: template.name,
        flavor_profile: template.flavorProfile,
        rarity: rarityToCode(template.rarity),
        level: 1,
        infusion: template.infusion,
        stats: {
          body: stats.body,
          caffeine: stats.caffeine,
          sweetness: stats.sweetness,
        },
        lineage: [],
        image_uri: metadataPayload.image,
      } satisfies ChainTeaMetadata;

      setMintedPreview({
        tokenId: previewTokenId,
        chainMetadata: previewChainMetadata,
        offchainMetadata: metadataPayload,
        imageUri: metadataPayload.image,
        tokenUri: metadataUpload.cid,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Mint failed",
        description:
          error instanceof Error ? error.message : "Unexpected error during generative mint.",
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-[#f6f1ff] to-[#fff] pb-24 pt-20">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(157,129,255,0.28),_transparent_75%)]" />
      <div className="relative mx-auto w-full max-w-xl rounded-[32px] border border-white/60 bg-white/85 p-12 text-center shadow-[0_30px_90px_rgba(189,140,255,0.2)] backdrop-blur-2xl">
        <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Blind Mint</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base">
          This is a blind mint. There are no previews, no hints, only the brew the contract serves.
          Tap the button and hope luck sides with you.
        </p>
        <div className="mt-10 flex justify-center">
          <Button
            variant="candy"
            disabled={!address || !signTransaction || isMinting}
            onClick={handleMint}
            className="h-12 rounded-full px-8 text-xs font-semibold uppercase tracking-[0.3em]"
          >
            {isMinting
              ? "Brewing…"
              : address
              ? `Blind Mint · ${BASE_MINT_STARS_COST} STARS`
              : "Connect Wallet"}
          </Button>
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.32em] text-slate-400">
          Blind drop. One shot. Good luck.
        </p>
        {mintedPreview ? (
          <div className="mt-12 text-left">
            <h2 className="text-lg font-semibold text-slate-800">Latest Brew</h2>
            <p className="mt-1 text-sm text-slate-500">
              Freshly minted NFT preview. Actions are coming soon.
            </p>
            <div className="mt-6">
              <TeaCard
                data={mintedPreview}
                onList={() =>
                  console.log("List minted token for sale", mintedPreview.tokenId ?? "unknown")
                }
                onMix={() =>
                  console.log("Send minted token for fusion", mintedPreview.tokenId ?? "unknown")
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default MintPage;


