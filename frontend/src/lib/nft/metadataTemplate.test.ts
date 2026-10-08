import { describe, expect, it } from "vitest";

import { FLAVOR_SWATCHES } from "@/lib/nft/flavors";
import {
  buildFlavorTemplate,
  getDefaultFlavor,
  getFlavorById,
  getRandomFlavor,
} from "@/lib/nft/metadataTemplate";

describe("getFlavorById", () => {
  it("returns the matching swatch for a known id", () => {
    const swatch = getFlavorById("galactic-guava");

    expect(swatch).toBeDefined();
    expect(swatch).toEqual(FLAVOR_SWATCHES.find((candidate) => candidate.id === "galactic-guava"));
  });

  it("returns undefined for an unknown id", () => {
    expect(getFlavorById("not-a-flavour")).toBeUndefined();
  });
});

describe("getDefaultFlavor", () => {
  it("equals the first entry in the swatch catalogue", () => {
    expect(getDefaultFlavor()).toBe(FLAVOR_SWATCHES[0]);
  });
});

describe("getRandomFlavor", () => {
  it("always returns a member of FLAVOR_SWATCHES", () => {
    for (let iteration = 0; iteration < 200; iteration += 1) {
      expect(FLAVOR_SWATCHES).toContain(getRandomFlavor());
    }
  });
});

describe("buildFlavorTemplate", () => {
  const swatch = FLAVOR_SWATCHES[0];

  it("upper-cases the first six seed characters in the name suffix", () => {
    const template = buildFlavorTemplate(swatch, "abc123def");

    expect(template.name).toBe(`${swatch.name} Brew #ABC123`);
  });

  it("derives the infusion, flavour profile, rarity and description", () => {
    const template = buildFlavorTemplate(swatch, "seed-value", "Rare");

    expect(template.swatch).toBe(swatch);
    expect(template.infusion).toBe(`${swatch.name} Infusion`);
    expect(template.flavorProfile).toBe(swatch.name);
    expect(template.rarity).toBe("Rare");
    expect(template.description).toBe(
      `A ${swatch.description.toLowerCase()} Crafted for the Stellar Tea collection.`,
    );
  });

  it("defaults rarity to Common and handles a seed shorter than six characters", () => {
    const template = buildFlavorTemplate(swatch, "ab");

    expect(template.rarity).toBe("Common");
    expect(template.name).toBe(`${swatch.name} Brew #AB`);
  });
});
