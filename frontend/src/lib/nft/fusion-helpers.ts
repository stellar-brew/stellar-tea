"use client";

import { toIpfsUri, type FlavorStats, type TeaColorway, type TeaMetadata } from "@/lib/nft";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const hexToRgb = (hex: string) => {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  const bigint = Number.parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

export const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

export const averageColors = (colors: string[]) => {
  if (colors.length === 0) return "#ffffff";
  const totals = colors.reduce(
    (acc, color) => {
      const { r, g, b } = hexToRgb(color);
      acc.r += r;
      acc.g += g;
      acc.b += b;
      return acc;
    },
    { r: 0, g: 0, b: 0 },
  );
  return rgbToHex({
    r: totals.r / colors.length,
    g: totals.g / colors.length,
    b: totals.b / colors.length,
  });
};

export const extractPalette = (colorway: TeaColorway): string[] => {
  switch (colorway.mode) {
    case "solid":
      return [colorway.color];
    case "linear-gradient":
      return colorway.stops.map((stop) => stop.color);
    case "radial-gradient":
      return colorway.stops.map((stop) => stop.color);
    default:
      return [];
  }
};

const pickStartColor = (colorway: TeaColorway) => {
  const palette = extractPalette(colorway);
  return palette[0] ?? "#ffffff";
};

const pickEndColor = (colorway: TeaColorway) => {
  const palette = extractPalette(colorway);
  return palette[palette.length - 1] ?? "#ffffff";
};

export const deriveFusionColorway = (parents: TeaMetadata[]): TeaColorway => {
  if (parents.length === 0) {
    return {
      mode: "solid",
      color: "#ffffff",
    };
  }

  const primary = parents[0].properties.colorway;
  const secondary = parents[1]?.properties.colorway ?? primary;

  const start = pickStartColor(primary);
  const end = pickEndColor(secondary);

  if (start.toLowerCase() === end.toLowerCase()) {
    const palette = extractPalette(primary).concat(extractPalette(secondary));
    const averaged = averageColors(palette);
    return {
      mode: "solid",
      color: averaged,
    };
  }

  return {
    mode: "linear-gradient",
    angleDeg: 120,
    stops: [
      { offset: 0, color: start },
      { offset: 1, color: end },
    ],
  };
};

export const deriveFusionStats = (parents: TeaMetadata[]): FlavorStats => {
  if (parents.length === 0) {
    return { body: 50, caffeine: 50, sweetness: 50 };
  }

  const totals = parents.reduce(
    (acc, parent) => {
      const stats = parent.properties.stats;
      acc.body += stats.body;
      acc.caffeine += stats.caffeine;
      acc.sweetness += stats.sweetness;
      return acc;
    },
    { body: 0, caffeine: 0, sweetness: 0 },
  );

  return {
    body: Math.round(totals.body / parents.length),
    caffeine: Math.round(totals.caffeine / parents.length),
    sweetness: Math.round(totals.sweetness / parents.length),
  };
};

/**
 * Layer assets are either absolute `/-rooted` public paths (the bundled layers
 * under `public/nft/generate`) or bare IPFS CIDs. Only bare CIDs should become
 * `ipfs://` URIs; converting a local path would produce `ipfs:///...`, which
 * points at a non-existent IPFS object.
 */
export const toLayerAssetUri = (assetCid: string): string =>
  assetCid.startsWith("/") ? assetCid : toIpfsUri(assetCid);

export interface FusionParentLike {
  tokenId: string;
  imageCid?: string;
  metadata: TeaMetadata;
  weight?: number;
}

export const buildLineage = (parents: FusionParentLike[]) => ({
  generation:
    parents.reduce(
      (acc, parent) => Math.max(acc, parent.metadata.properties.lineage.generation),
      0,
    ) + 1,
  parents: parents.map((parent) => ({
    tokenId: parent.tokenId,
    imageCid: parent.imageCid,
    contribution: parent.weight ?? 50,
    palette: extractPalette(parent.metadata.properties.colorway),
  })),
});


