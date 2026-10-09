import { describe, expect, it } from "vitest";

import { STARS_DECIMALS } from "@/lib/contracts/stars";
import { parseAmountToI128 } from "@/lib/util/tokenMath";

describe("STARS metadata decimals", () => {
  it("matches the on-chain DECIMALS constant (8)", () => {
    expect(STARS_DECIMALS).toBe(8);
  });

  it("scales the 150 STARS mint fee by 10^8 when the metadata read fails", () => {
    // The fallback decimals used by fetchStarsMetadata / payStarsFee must be 8,
    // so a missing metadata response still transfers the intended amount.
    expect(parseAmountToI128("150", STARS_DECIMALS)).toBe(15_000_000_000n);
  });

  it("scales one STARS unit at 8 decimals, not 7", () => {
    expect(parseAmountToI128("1", STARS_DECIMALS)).toBe(100_000_000n);
    expect(parseAmountToI128("0.00000001", STARS_DECIMALS)).toBe(1n);
  });
});
