import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `frontend/src/lib/storage.ts` reads `window.localStorage` once, at module
 * load, via the module-level `isBrowser` constant. To exercise both the browser
 * and SSR branches we therefore stub `globalThis.window` and re-import the
 * module with `vi.resetModules()`, rather than relying on a DOM environment
 * (the repo's vitest config runs in the `node` environment).
 */
const globalScope = globalThis as Record<string, unknown>;

const createBackingStore = () => {
  const entries = new Map<string, string>();
  const api: Storage = {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key: string) => (entries.has(key) ? entries.get(key) ?? null : null),
    key: (index: number) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key: string) => {
      entries.delete(key);
    },
    setItem: (key: string, value: string) => {
      entries.set(key, String(value));
    },
  };
  return { api, entries };
};

const loadStorageWithBrowser = async () => {
  vi.resetModules();
  const { api, entries } = createBackingStore();
  globalScope.window = { localStorage: api };
  const module = await import("@/lib/storage");
  return { storage: module.default, entries };
};

const loadStorageWithoutBrowser = async () => {
  vi.resetModules();
  delete globalScope.window;
  const module = await import("@/lib/storage");
  return module.default;
};

afterEach(() => {
  vi.resetModules();
  delete globalScope.window;
});

describe("TypedStorage", () => {
  it("round-trips a string through setItem/getItem", async () => {
    const { storage } = await loadStorageWithBrowser();

    storage.setItem("walletId", "wallet-123");
    storage.setItem("walletNetwork", "TESTNET");

    expect(storage.getItem("walletId")).toBe("wallet-123");
    expect(storage.getItem("walletNetwork")).toBe("TESTNET");
  });

  it("round-trips an object through setItem/getItem", async () => {
    const { storage } = await loadStorageWithBrowser();
    const value = { address: "GABCDEF", network: "TESTNET" };

    storage.setItem("walletAddress", value as unknown as string);

    expect(storage.getItem("walletAddress")).toEqual(value);
  });

  it("returns null for a key that has never been set", async () => {
    const { storage } = await loadStorageWithBrowser();

    expect(storage.getItem("walletId")).toBeNull();
  });

  it("returns null for malformed JSON in 'safe' mode", async () => {
    const { storage, entries } = await loadStorageWithBrowser();
    entries.set("walletId", "{not-json");

    expect(storage.getItem("walletId", "safe")).toBeNull();
  });

  it("returns the raw string for malformed JSON in 'raw' mode", async () => {
    const { storage, entries } = await loadStorageWithBrowser();
    entries.set("walletId", "{not-json");

    expect(storage.getItem("walletId", "raw")).toBe("{not-json");
  });

  it("throws for malformed JSON in the default 'fail' mode", async () => {
    const { storage, entries } = await loadStorageWithBrowser();
    entries.set("walletId", "{not-json");

    expect(() => storage.getItem("walletId")).toThrow();
  });

  it("removes a stored value with removeItem", async () => {
    const { storage } = await loadStorageWithBrowser();

    storage.setItem("walletId", "wallet-123");
    storage.removeItem("walletId");

    expect(storage.getItem("walletId")).toBeNull();
  });

  it("exposes the backing store length and key lookup", async () => {
    const { storage } = await loadStorageWithBrowser();

    storage.setItem("walletId", "wallet-123");
    storage.setItem("walletNetwork", "TESTNET");

    expect(storage.length).toBe(2);
    expect(storage.key(0)).toBe("walletId");
  });

  it("is a no-op when window/localStorage is unavailable (SSR)", async () => {
    const storage = await loadStorageWithoutBrowser();

    expect(storage.length).toBe(0);
    expect(storage.key(0)).toBeNull();
    expect(storage.getItem("walletId")).toBeNull();
    expect(() => storage.setItem("walletId", "wallet-123")).not.toThrow();
    expect(() => storage.removeItem("walletId")).not.toThrow();
    expect(() => storage.clear()).not.toThrow();
  });
});
