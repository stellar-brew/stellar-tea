import { describe, expect, it } from "vitest";
import { formatTokenAmount, parseAmountToI128 } from "./tokenMath";

describe("parseAmountToI128", () => {
  it("scales whole and fractional amounts", () => {
    expect(parseAmountToI128("1.5", 8)).toBe(150000000n);
    expect(parseAmountToI128("0", 8)).toBe(0n);
    expect(parseAmountToI128("12", 7)).toBe(120000000n);
    expect(parseAmountToI128("0.001", 7)).toBe(10000n);
  });

  it("pads fractional digits without changing the value", () => {
    expect(parseAmountToI128("1.2", 4)).toBe(12000n);
    expect(parseAmountToI128("1.002", 4)).toBe(10020n);
    expect(parseAmountToI128(" 2.5 ", 2)).toBe(250n);
  });

  it("accepts exactly the maximum number of decimal places", () => {
    expect(parseAmountToI128("1.12345678", 8)).toBe(112345678n);
    expect(parseAmountToI128("1", 0)).toBe(1n);
  });

  it("rejects too many fractional digits", () => {
    expect(() => parseAmountToI128("1.123", 2)).toThrow("Use at most 2 decimal places.");
    expect(() => parseAmountToI128("0.1", 0)).toThrow("Use at most 0 decimal places.");
  });

  it.each(["abc", "1e3", "-1", "+1", "1,2", "1.", ".5", "1.2.3"])(
    "rejects invalid format %s",
    (input) => {
      expect(() => parseAmountToI128(input, 7)).toThrow("Invalid amount format.");
    },
  );

  it("rejects empty and whitespace-only input", () => {
    expect(() => parseAmountToI128("", 7)).toThrow("Enter an amount.");
    expect(() => parseAmountToI128("   ", 7)).toThrow("Enter an amount.");
  });
});

describe("formatTokenAmount", () => {
  it("returns a placeholder for undefined", () => {
    expect(formatTokenAmount(undefined, 7)).toBe("-");
  });

  it("formats whole numbers and trims trailing fractional zeros", () => {
    expect(formatTokenAmount(150000000n, 8)).toBe("1.5");
    expect(formatTokenAmount(100000000n, 8)).toBe("1");
    expect(formatTokenAmount(10020n, 4)).toBe("1.002");
    expect(formatTokenAmount(0n, 7)).toBe("0");
  });

  it("round-trips representative nonnegative values", () => {
    for (const decimals of [0, 2, 7, 8]) {
      for (const input of decimals === 0
        ? ["0", "1", "123456"]
        : ["0", "1", "1.5", "12.01", "999.12345678"].filter(
            (value) => (value.split(".")[1]?.length ?? 0) <= decimals,
          )) {
        const parsed = parseAmountToI128(input, decimals);
        expect(parseAmountToI128(formatTokenAmount(parsed, decimals), decimals)).toBe(parsed);
      }
    }
  });
});
import { describe, expect, it } from "vitest";

import { formatTokenAmount, parseAmountToI128 } from "@/lib/util/tokenMath";

describe("parseAmountToI128", () => {
  it("returns 0n for "0" at any decimal count", () => {
    expect(parseAmountToI128("0", 8)).toBe(0n);
    expect(parseAmountToI128("0", 7)).toBe(0n);
    expect(parseAmountToI128("0", 0)).toBe(0n);
  });

  it("scales a whole number by 10**decimals", () => {
    expect(parseAmountToI128("1", 8)).toBe(100000000n);
    expect(parseAmountToI128("1", 7)).toBe(10000000n);
    expect(parseAmountToI128("42", 2)).toBe(4200n);
  });

  it("pads a fractional part to the requested decimals", () => {
    expect(parseAmountToI128("1.5", 8)).toBe(150000000n);
    expect(parseAmountToI128("0.5", 8)).toBe(50000000n);
    expect(parseAmountToI128("0.05", 8)).toBe(5000000n);
    expect(parseAmountToI128("1.25", 2)).toBe(125n);
  });

  it("pads a short fractional part with trailing zeros", () => {
    expect(parseAmountToI128("1.5", 7)).toBe(15000000n);
    expect(parseAmountToI128("0.1", 6)).toBe(100000n);
  });

  it("truncates (does NOT round) when the fractional part has fewer digits than decimals", () => {
    // The implementation slices fractionalPart to `decimals` after padding,
    // so a 2-char fraction with decimals=4 yields 2 chars padded to 4 (no truncation here).
    // The headline behaviour is: no rounding up of digits beyond `decimals`.
    expect(parseAmountToI128("0.999", 2)).toBe(99n);  // 0.99 -> 99, NOT 100 (no round-up)
    expect(parseAmountToI128("1.999", 2)).toBe(199n); // 1.99 -> 199, NOT 200
  });

  it("throws when the fractional part has MORE digits than `decimals`", () => {
    expect(() => parseAmountToI128("1.12345678", 4)).toThrow();
    expect(() => parseAmountToI128("0.123", 2)).toThrow();
    expect(() => parseAmountToI128("1.001", 2)).toThrow();
  });

  it("rejects non-numeric input", () => {
    expect(() => parseAmountToI128("abc", 8)).toThrow();
    expect(() => parseAmountToI128("1.2.3", 8)).toThrow();
    expect(() => parseAmountToI128("1e5", 8)).toThrow();
    expect(() => parseAmountToI128("-1", 8)).toThrow();
    expect(() => parseAmountToI128("0x123", 8)).toThrow();
    expect(() => parseAmountToI128("12abc", 8)).toThrow();
  });

  it("rejects empty input (after trim)", () => {
    expect(() => parseAmountToI128("", 8)).toThrow();
    expect(() => parseAmountToI128("   ", 8)).toThrow();
    expect(() => parseAmountToI128("\t", 8)).toThrow();
  });

  it("trims surrounding whitespace before validating", () => {
    expect(parseAmountToI128("  1.5  ", 8)).toBe(150000000n);
    expect(parseAmountToI128("\t0.25\n", 8)).toBe(25000000n);
  });
});

describe("formatTokenAmount", () => {
  it("returns "-" for undefined", () => {
    expect(formatTokenAmount(undefined, 7)).toBe("-");
  });

  it("returns the whole part with no fractional suffix when the value is an exact multiple of the scale", () => {
    expect(formatTokenAmount(100000000n, 8)).toBe("1");
    expect(formatTokenAmount(0n, 8)).toBe("0");
    expect(formatTokenAmount(50000000n, 8)).toBe("0.5");
  });

  it("strips trailing zeros from the fractional part", () => {
    expect(formatTokenAmount(150000000n, 8)).toBe("1.5");
    expect(formatTokenAmount(105000000n, 8)).toBe("1.05");
    expect(formatTokenAmount(100500000n, 8)).toBe("1.005");
  });

  it("uses the configured decimals (default 7)", () => {
    expect(formatTokenAmount(15000000n, 7)).toBe("1.5");
    expect(formatTokenAmount(15000000n, 8)).toBe("0.15");
  });
});

describe("formatTokenAmount ∘ parseAmountToI128 round-trip", () => {
  const cases: Array<[string, number]> = [
    ["0", 8],
    ["1", 8],
    ["1.5", 8],
    ["0.5", 8],
    ["0.05", 8],
    ["1.25", 2],
    ["42", 0],
    ["1.00000001", 8],
    ["0.123456", 6],
    ["0.99999999", 8],
    ["123456789.00000001", 8],
  ];

  for (const [input, decimals] of cases) {
    it(`round-trips ${input} at ${decimals} decimals`, () => {
      const parsed = parseAmountToI128(input, decimals);
      const formatted = formatTokenAmount(parsed, decimals);
      // Re-parse the formatted output and compare — the canonical form
      // might strip trailing zeros (1.50 -> 1.5), so compare numerically.
      expect(parseAmountToI128(formatted, decimals)).toBe(parsed);
    });
  }

  it("round-trips a value with all-zero fractional part as a bare integer", () => {
    const parsed = parseAmountToI128("1.0", 8);
    expect(formatTokenAmount(parsed, 8)).toBe("1");
    expect(parseAmountToI128(formatTokenAmount(parsed, 8), 8)).toBe(parsed);
  });
});
