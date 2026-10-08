import { describe, expect, it } from "vitest";

import {
  asSorobanResult,
  extractSorobanErrorMessage,
} from "@/lib/util/soroban";

describe("extractSorobanErrorMessage", () => {
  it("returns the fallback for falsy reasons", () => {
    expect(extractSorobanErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(extractSorobanErrorMessage(null, "fallback")).toBe("fallback");
    expect(extractSorobanErrorMessage("", "fallback")).toBe("fallback");
    expect(extractSorobanErrorMessage(0, "fallback")).toBe("fallback");
    expect(extractSorobanErrorMessage(false, "fallback")).toBe("fallback");
  });

  it("returns the message of an Error instance", () => {
    expect(extractSorobanErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("falls back when an Error carries an empty message", () => {
    expect(extractSorobanErrorMessage(new Error(""), "fallback")).toBe("fallback");
  });

  it("reads a non-empty string message from a plain object", () => {
    expect(extractSorobanErrorMessage({ message: "simulation failed" }, "fallback")).toBe(
      "simulation failed",
    );
  });

  it("falls back when the object message is empty or not a string", () => {
    expect(extractSorobanErrorMessage({ message: "" }, "fallback")).toBe("fallback");
    expect(extractSorobanErrorMessage({ message: 42 }, "fallback")).toBe("fallback");
  });

  it("returns a raw string reason as-is", () => {
    expect(extractSorobanErrorMessage("host error", "fallback")).toBe("host error");
  });

  it("falls back for values it cannot interpret", () => {
    expect(extractSorobanErrorMessage(42, "fallback")).toBe("fallback");
    expect(extractSorobanErrorMessage({}, "fallback")).toBe("fallback");
  });
});

describe("asSorobanResult", () => {
  it("returns the payload when all three methods are functions", () => {
    const result = {
      isErr: () => false,
      unwrap: () => "ok",
      unwrapErr: () => "err",
    };

    expect(asSorobanResult<string>(result)).toBe(result);
    expect(asSorobanResult<string>(result)?.unwrap()).toBe("ok");
    expect(asSorobanResult<string>(result)?.unwrapErr()).toBe("err");
  });

  it("returns null for non-result values", () => {
    expect(asSorobanResult(null)).toBeNull();
    expect(asSorobanResult(undefined)).toBeNull();
    expect(asSorobanResult("string")).toBeNull();
    expect(asSorobanResult(42)).toBeNull();
    expect(asSorobanResult({})).toBeNull();
  });

  it("returns null when any of the three methods is missing or not a function", () => {
    expect(asSorobanResult({ isErr: () => false, unwrap: () => "ok" })).toBeNull();
    expect(
      asSorobanResult({ isErr: true, unwrap: () => "ok", unwrapErr: () => "err" }),
    ).toBeNull();
  });
});
