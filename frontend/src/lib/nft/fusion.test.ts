import { describe, expect, it } from "vitest";

import {
  buildLineage,
  deriveFusionColorway,
  deriveFusionStats,
  toLayerAssetUri,
} from "@/lib/nft/fusion-helpers";
import {
  buildTeaMetadata,
  type TeaColorway,
  type FlavorStats,
  type TeaMetadata,
} from "@/lib/nft";

const baseLayer = {
  categoryId: "base",
  variantId: "classic",
  label: "Classic Base",
  order: 0,
  assetUri: "ipfs://base",
} as const;

const createMetadata = ({
  colorway,
  stats,
  seed,
}: {
  colorway: TeaColorway;
  stats: FlavorStats;
  seed: string;
}): TeaMetadata =>
  buildTeaMetadata({
    name: `Tea ${seed}`,
    description: "Test tea metadata",
    imageCid: "placeholder",
    seed,
    rank: 1,
    rarity: "Common",
    flavorProfile: "Floral",
    infusion: "Aurora",
    colorway,
    layers: [baseLayer],
    lineage: { generation: 0, parents: [] },
    stats,
    mixCount: 0,
  });

describe("fusion helpers", () => {
  it("creates a gradient when two solid parents have different colours", () => {
    const parentA = createMetadata({
      colorway: { mode: "solid", color: "#ff0000" },
      stats: { body: 40, caffeine: 30, sweetness: 50 },
      seed: "aaa",
    });
    const parentB = createMetadata({
      colorway: { mode: "solid", color: "#0000ff" },
      stats: { body: 70, caffeine: 60, sweetness: 30 },
      seed: "bbb",
    });

    const fusion = deriveFusionColorway([parentA, parentB]);

    expect(fusion.mode).toBe("linear-gradient");
    if (fusion.mode === "linear-gradient") {
      expect(fusion.stops.map((stop) => stop.color)).toEqual(["#ff0000", "#0000ff"]);
    }
  });

  it("falls back to solid colour when parent palettes are identical", () => {
    const parent = createMetadata({
      colorway: { mode: "solid", color: "#34d399" },
      stats: { body: 20, caffeine: 10, sweetness: 80 },
      seed: "ccc",
    });

    const fusion = deriveFusionColorway([parent, parent]);
    expect(fusion.mode).toBe("solid");
    if (fusion.mode === "solid") {
      expect(fusion.color.startsWith("#")).toBe(true);
    }
  });

  it("averages flavor stats across parents", () => {
    const parentA = createMetadata({
      colorway: { mode: "solid", color: "#ff0000" },
      stats: { body: 40, caffeine: 20, sweetness: 80 },
      seed: "ddd",
    });
    const parentB = createMetadata({
      colorway: { mode: "solid", color: "#0000ff" },
      stats: { body: 60, caffeine: 80, sweetness: 40 },
      seed: "eee",
    });

    const stats = deriveFusionStats([parentA, parentB]);
    expect(stats).toEqual({ body: 50, caffeine: 50, sweetness: 60 });
  });

  it("builds lineage with incremented generation and palette references", () => {
    const parentA = createMetadata({
      colorway: { mode: "solid", color: "#ff0000" },
      stats: { body: 40, caffeine: 20, sweetness: 80 },
      seed: "fff",
    });
    parentA.properties.lineage.generation = 2;

    const lineage = buildLineage([
      { tokenId: "1", metadata: parentA, weight: 60, imageCid: "cidA" },
      {
        tokenId: "2",
        metadata: createMetadata({
          colorway: {
            mode: "linear-gradient",
            angleDeg: 90,
            stops: [
              { offset: 0, color: "#ff00ff" },
              { offset: 1, color: "#00ffff" },
            ],
          },
          stats: { body: 60, caffeine: 40, sweetness: 20 },
          seed: "ggg",
        }),
        weight: 40,
        imageCid: "cidB",
      },
    ]);

    expect(lineage.generation).toBe(3);
    expect(lineage.parents).toHaveLength(2);
    expect(lineage.parents[0].palette).toContain("#ff0000");
    expect(lineage.parents[1].palette).toEqual(["#ff00ff", "#00ffff"]);
  });
});
describe("toLayerAssetUri", () => {
  it("preserves local /-rooted layer paths", () => {
    expect(toLayerAssetUri("/nft/generate/0001.png")).toBe("/nft/generate/0001.png");
    expect(toLayerAssetUri("/nft/generate/0010.svg")).toBe("/nft/generate/0010.svg");
  });

  it("prefixes bare CIDs and leaves ipfs:// URIs untouched", () => {
    expect(toLayerAssetUri("bafybeihunter12345")).toBe("ipfs://bafybeihunter12345");
    expect(toLayerAssetUri("ipfs://bafy123")).toBe("ipfs://bafy123");
  });
});
