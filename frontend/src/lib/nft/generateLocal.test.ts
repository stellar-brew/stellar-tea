import { describe, expect, it } from "vitest";

import { generateLocalLayers } from "@/lib/nft/generateLocal";
import type { SelectedLayer } from "@/lib/nft/generator";

const layerByCategory = (layers: SelectedLayer[], categoryId: string): SelectedLayer => {
  const layer = layers.find((candidate) => candidate.categoryId === categoryId);
  if (!layer) {
    throw new Error(`Expected a "${categoryId}" layer in the generated stack.`);
  }
  return layer;
};

const numericPngIndex = (layer: SelectedLayer): number => {
  const match = layer.variant.id.match(/(\d+)\.png$/);
  if (!match) {
    throw new Error(`Expected a numeric .png index in "${layer.variant.id}".`);
  }
  return Number(match[1]);
};

describe("generateLocalLayers", () => {
  it("returns exactly five layers in ascending order", () => {
    const { layers } = generateLocalLayers();

    expect(layers).toHaveLength(5);
    expect(layers.map((layer) => layer.order)).toEqual([0, 1, 2, 3, 4]);
    expect(layers.map((layer) => layer.categoryId)).toEqual([
      "base-foreground",
      "gradient-fill",
      "mid-topper",
      "glass-frame",
      "highlights",
    ]);
  });

  it("keeps base indices in 1..9 and topper indices in 20..29 across 200 runs", () => {
    for (let iteration = 0; iteration < 200; iteration += 1) {
      const { layers } = generateLocalLayers();
      const baseIndex = numericPngIndex(layerByCategory(layers, "base-foreground"));
      const topperIndex = numericPngIndex(layerByCategory(layers, "mid-topper"));

      expect(baseIndex).toBeGreaterThanOrEqual(1);
      expect(baseIndex).toBeLessThanOrEqual(9);
      expect(topperIndex).toBeGreaterThanOrEqual(20);
      expect(topperIndex).toBeLessThanOrEqual(29);
    }
  });

  it("references the fixed gradient, frame and highlight assets", () => {
    const { layers } = generateLocalLayers();

    expect(layerByCategory(layers, "gradient-fill").variant.id).toBe(
      "/nft/generate/0010.svg",
    );
    expect(layerByCategory(layers, "glass-frame").variant.id).toBe("/nft/generate/0030.png");
    expect(layerByCategory(layers, "highlights").variant.id).toBe("/nft/generate/0040.png");
  });

  it("gives the gradient mask layer a tint matching the colourway", () => {
    const { layers, colorway } = generateLocalLayers();
    const mask = layerByCategory(layers, "gradient-fill");

    expect(mask.variant.format).toBe("svg-gradient");
    expect(mask.tint).toEqual(colorway);
  });

  it("forces a solid colourway with identical flavours when forceSolid is set", () => {
    const { layers, colorway, flavors } = generateLocalLayers({ forceSolid: true });

    expect(colorway.mode).toBe("solid");
    expect(flavors[0]).toBe(flavors[1]);
    expect(layerByCategory(layers, "gradient-fill").tint).toEqual(colorway);
  });
});
