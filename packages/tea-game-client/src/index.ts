import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}

export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CA634CSZEDDAMZMATYM6ACY4M6HYTJFUINWHF3O5G7THWWTKXJD77FTH",
  },
} as const;

export interface Config {
  admin: string;
  balls_token: string;
  dex: Option<string>;
  stars_token: string;
  tea_nft: string;
  treasury: string;
}

export type DataKey =
  | { tag: "Config"; values: void }
  | { tag: "DailyEmissionCap"; values: void }
  | { tag: "Event"; values: readonly [u32] }
  | { tag: "Limit"; values: readonly [string, string] }
  | { tag: "Listing"; values: readonly [u64] }
  | { tag: "Offer"; values: readonly [u64] }
  | { tag: "Sequence"; values: void }
  | { tag: "OwnerIndex"; values: readonly [string, u32] }
  | { tag: "LastClaim"; values: readonly [string] };

export const GameError = {
  1: { message: "Unauthorized" },
  2: { message: "OfferNotFound" },
  3: { message: "OfferClosed" },
  4: { message: "LimitExceeded" },
  5: { message: "AlreadyClaimed" },
  6: { message: "InsufficientPayment" },
  7: { message: "InvalidInput" },
  8: { message: "NotOwner" },
  9: { message: "Expired" },
  10: { message: "NotReady" },
};

export interface Event {
  deadline: u64;
  finished: boolean;
  organizer: string;
  participants: Array<string>;
  reward_pool: i128;
  stake: i128;
}

export interface DailyLimit {
  day: u64;
  used: i128;
  value: i128;
}

export type PaymentToken =
  | { tag: "Balls"; values: void }
  | { tag: "Stars"; values: void };

export interface Listing {
  created_at: u64;
  payment_token: PaymentToken;
  price: i128;
  seller: string;
}

export type OfferStatus =
  | { tag: "WaitingForPartner"; values: void }
  | { tag: "ReadyToMix"; values: void }
  | { tag: "Completed"; values: void }
  | { tag: "Cancelled"; values: void };

export interface MixOffer {
  created_at: u64;
  deadline: u64;
  desired_profile: string;
  fee_balls: i128;
  fee_stars: i128;
  min_rank: u32;
  owner_a: string;
  owner_b: Option<string>;
  partner_fee_balls: i128;
  partner_fee_stars: i128;
  recipe_id: u32;
  status: OfferStatus;
  token_a_id: u64;
  token_b_id: Option<u64>;
}

export interface TeaStats {
  body: u32;
  caffeine: u32;
  sweetness: u32;
}

export interface TeaMetadata {
  display_name: string;
  flavor_profile: string;
  image_uri: string;
  infusion: string;
  level: u32;
  lineage: Array<u64>;
  rarity: u32;
  stats: TeaStats;
}

export interface Recipe {
  base_level: u32;
  base_rarity: u32;
  base_stats: TeaStats;
  flavor_profile: string;
  id: u32;
  image_uri: string;
  name: string;
}

export interface Client {
  /**
   * Construct and simulate a upsert_recipe transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  upsert_recipe: (
    {
      recipe_id,
      name,
      flavor_profile,
      base_level,
      base_rarity,
      base_stats,
      image_uri,
    }: {
      recipe_id: u32;
      name: string;
      flavor_profile: string;
      base_level: u32;
      base_rarity: u32;
      base_stats: TeaStats;
      image_uri: string;
    },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a set_daily_limit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_daily_limit: (
    {
      user,
      limit_type,
      value,
    }: { user: string; limit_type: string; value: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a burn_tokens transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  burn_tokens: (
    {
      from,
      balls,
      stars,
    }: { from: string; balls: Option<i128>; stars: Option<i128> },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a create_mix_offer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_mix_offer: (
    {
      owner,
      recipe_id,
      token_a_id,
      desired_profile,
      min_rank,
      fee_balls,
      fee_stars,
      deadline,
    }: {
      owner: string;
      recipe_id: u32;
      token_a_id: u64;
      desired_profile: string;
      min_rank: u32;
      fee_balls: i128;
      fee_stars: i128;
      deadline: u64;
    },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a accept_mix_offer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  accept_mix_offer: (
    {
      offer_id,
      partner,
      token_b_id,
      fee_balls,
      fee_stars,
    }: {
      offer_id: u64;
      partner: string;
      token_b_id: u64;
      fee_balls: i128;
      fee_stars: i128;
    },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<u64>>>;

  /**
   * Construct and simulate a cancel_mix_offer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_mix_offer: (
    { owner, recipe_id }: { owner: string; recipe_id: u32 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
  /**
   * Construct and simulate a upgrade_tea transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  upgrade_tea: (
    {
      owner,
      nft_id,
      balls,
      stars,
    }: { owner: string; nft_id: u64; balls: i128; stars: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a list_nft transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  list_nft: (
    {
      seller,
      token_id,
      price,
      payment_token,
    }: {
      seller: string;
      token_id: u64;
      price: i128;
      payment_token: PaymentToken;
    },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a delist_nft transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  delist_nft: (
    { seller, token_id }: { seller: string; token_id: u64 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a buy_nft transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  buy_nft: (
    { buyer, token_id }: { buyer: string; token_id: u64 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a claim_daily transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim_daily: (
    { player }: { player: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a join_event transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  join_event: (
    { player, event_id, stake }: { player: string; event_id: u32; stake: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a finish_event transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  finish_event: (
    { caller, event_id }: { caller: string; event_id: u32 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a create_event transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_event: (
    {
      organizer,
      event_id,
      stake,
      deadline,
    }: { organizer: string; event_id: u32; stake: i128; deadline: u64 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    },
  ) => Promise<AssembledTransaction<Result<void>>>;
}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    {
      admin,
      treasury,
      balls_token,
      stars_token,
      tea_nft,
      dex,
    }: {
      admin: string;
      treasury: string;
      balls_token: string;
      stars_token: string;
      tea_nft: string;
      dex: Option<string>;
    },
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      },
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(
      { admin, treasury, balls_token, stars_token, tea_nft, dex },
      options,
    );
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        "AAAAAQAAAAAAAAAAAAAABkNvbmZpZwAAAAAABgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAtiYWxsc190b2tlbgAAAAATAAAAAAAAAANkZXgAAAAD6AAAABMAAAAAAAAAC3N0YXJzX3Rva2VuAAAAABMAAAAAAAAAB3RlYV9uZnQAAAAAEwAAAAAAAAAIdHJlYXN1cnkAAAAT",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAgAAAAAAAAAAAAAABkNvbmZpZwAAAAAAAAAAAAAAAAAQRGFpbHlFbWlzc2lvbkNhcA==",
        "AAAABAAAAAAAAAAAAAAACUdhbWVFcnJvcgAAAAAAAAoAAAAAAAAADFVuYXV0aG9yaXplZAAAAAEAAAAAAAAADU9mZmVyTm90Rm91bmQAAAAAAAACAAAAAAAAAAtPZmZlckNsb3NlZAAAAAADAAAAAAAAAA1MaW1pdEV4Y2VlZGVkAAAAAAAABAAAAAAAAAAOQWxyZWFkeUNsYWltZWQAAAAAAAUAAAAAAAAAE0luc3VmZmljaWVudFBheW1lbnQAAAAABgAAAAAAAAAMSW52YWxpZElucHV0AAAABwAAAAAAAAAITm90T3duZXIAAAAIAAAAAAAAAAdFeHBpcmVkAAAAAAkAAAAAAAAACE5vdFJlYWR5AAAACg==",
        "AAAAAQAAAAAAAAAAAAAABUV2ZW50AAAAAAAABgAAAAAAAAAIZGVhZGxpbmUAAAAGAAAAAAAAAAhmaW5pc2hlZAAAAAEAAAAAAAAACW9yZ2FuaXplcgAAAAAAABMAAAAAAAAADHBhcnRpY2lwYW50cwAAA+oAAAATAAAAAAAAAAtyZXdhcmRfcG9vbAAAAAALAAAAAAAAAAVzdGFrZQAAAAAAAAs=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAQAAAAEAAAAAAAAABUV2ZW50AAAAAAAAAQAAAAQ=",
        "AAAAAQAAAAAAAAAAAAAACkRhaWx5TGltaXQAAAAAAAMAAAAAAAAAA2RheQAAAAAGAAAAAAAAAAR1c2VkAAAACwAAAAAAAAAFdmFsdWUAAAAAAAAL",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAQAAAAEAAAAAAAAABUxpbWl0AAAAAAAAAgAAABMAAAAR",
        "AAAAAgAAAAAAAAAAAAAADFBheW1lbnRUb2tlbgAAAAIAAAAAAAAAAAAAAAVCYWxscwAAAAAAAAAAAAAAAAAABVN0YXJzAAAA",
        "AAAAAQAAAAAAAAAAAAAAB0xpc3RpbmcAAAAABAAAAAAAAAAKY3JlYXRlZF9hdAAAAAAABgAAAAAAAAANcGF5bWVudF90b2tlbgAAAAAAB9AAAAAMUGF5bWVudFRva2VuAAAAAAAAAAVwcmljZQAAAAAAAAsAAAAAAAAABnNlbGxlcgAAAAAAEw==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAQAAAAEAAAAAAAAAB0xpc3RpbmcAAAAAAQAAAAY=",
        "AAAAAgAAAAAAAAAAAAAAC09mZmVyU3RhdHVzAAAAAAQAAAAAAAAAAAAAABFXYWl0aW5nRm9yUGFydG5lcgAAAAAAAAAAAAAAAAAAClJlYWR5VG9NaXgAAAAAAAAAAAAAAAAACUNvbXBsZXRlZAAAAAAAAAAAAAAAAAAACUNhbmNlbGxlZAAAAA==",
        "AAAAAQAAAAAAAAAAAAAACE1peE9mZmVyAAAADgAAAAAAAAAKY3JlYXRlZF9hdAAAAAAABgAAAAAAAAAIZGVhZGxpbmUAAAAGAAAAAAAAAA9kZXNpcmVkX3Byb2ZpbGUAAAAAEAAAAAAAAAAJZmVlX2JhbGxzAAAAAAAACwAAAAAAAAAJZmVlX3N0YXJzAAAAAAAACwAAAAAAAAAIbWluX3JhbmsAAAAEAAAAAAAAAAdvd25lcl9hAAAAABMAAAAAAAAAB293bmVyX2IAAAAD6AAAABMAAAAAAAAAEXBhcnRuZXJfZmVlX2JhbGxzAAAAAAAACwAAAAAAAAARcGFydG5lcl9mZWVfc3RhcnMAAAAAAAALAAAAAAAAAAlyZWNpcGVfaWQAAAAAAAAEAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAALT2ZmZXJTdGF0dXMAAAAAAAAAAAp0b2tlbl9hX2lkAAAAAAAGAAAAAAAAAAp0b2tlbl9iX2lkAAAAAAPoAAAABg==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAwAAAAEAAAAAAAAABU9mZmVyAAAAAAAAAQAAAAYAAAAAAAAAAAAAAAhTZXF1ZW5jZQAAAAEAAAAAAAAACk93bmVySW5kZXgAAAAAAAIAAAATAAAABA==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAQAAAAEAAAAAAAAACUxhc3RDbGFpbQAAAAAAAAEAAAAT",
        "AAAAAQAAAAAAAAAAAAAACFRlYVN0YXRzAAAAAwAAAAAAAAAEYm9keQAAAAQAAAAAAAAACGNhZmZlaW5lAAAABAAAAAAAAAAJc3dlZXRuZXNzAAAAAAAABA==",
        "AAAAAQAAAAAAAAAAAAAAC1RlYU1ldGFkYXRhAAAAAAgAAAAAAAAADGRpc3BsYXlfbmFtZQAAABAAAAAAAAAADmZsYXZvcl9wcm9maWxlAAAAAAAQAAAAAAAAAAlpbWFnZV91cmkAAAAAAAAQAAAAAAAAAAhpbmZ1c2lvbgAAABAAAAAAAAAABWxldmVsAAAAAAAABAAAAAAAAAAHbGluZWFnZQAAAAPqAAAABgAAAAAAAAAGcmFyaXR5AAAAAAAEAAAAAAAAAAVzdGF0cwAAAAAAB9AAAAAIVGVhU3RhdHM=",
        "AAAAAQAAAAAAAAAAAAAABlJlY2lwZQAAAAAABwAAAAAAAAAKYmFzZV9sZXZlbAAAAAAABAAAAAAAAAALYmFzZV9yYXJpdHkAAAAABAAAAAAAAAAKYmFzZV9zdGF0cwAAAAAH0AAAAAhUZWFTdGF0cwAAAAAAAAAOZmxhdm9yX3Byb2ZpbGUAAAAAABAAAAAAAAAAAmlkAAAAAAAEAAAAAAAAAAlpbWFnZV91cmkAAAAAAAAQAAAAAAAAAARuYW1lAAAAEA==",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAYAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIdHJlYXN1cnkAAAATAAAAAAAAAAtiYWxsc190b2tlbgAAAAATAAAAAAAAAAtzdGFyc190b2tlbgAAAAATAAAAAAAAAAd0ZWFfbmZ0AAAAABMAAAAAAAAAA2RleAAAAAPoAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAANdXBzZXJ0X3JlY2lwZQAAAAAAAAcAAAAAAAAACXJlY2lwZV9pZAAAAAAAAAQAAAAAAAAABG5hbWUAAAAQAAAAAAAAAA5mbGF2b3JfcHJvZmlsZQAAAAAAEAAAAAAAAAAKYmFzZV9sZXZlbAAAAAAABAAAAAAAAAALYmFzZV9yYXJpdHkAAAAABAAAAAAAAAAKYmFzZV9zdGF0cwAAAAAH0AAAAAhUZWFTdGF0cwAAAAAAAAAJaW1hZ2VfdXJpAAAAAAAAEAAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACUdhbWVFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAPc2V0X2RhaWx5X2xpbWl0AAAAAAMAAAAAAAAABHVzZXIAAAATAAAAAAAAAApsaW1pdF90eXBlAAAAAAARAAAAAAAAAAV2YWx1ZQAAAAAAAAsAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlHYW1lRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAALYnVybl90b2tlbnMAAAAAAwAAAAAAAAAEZnJvbQAAABMAAAAAAAAABWJhbGxzAAAAAAAD6AAAAAsAAAAAAAAABXN0YXJzAAAAAAAD6AAAAAsAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlHYW1lRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAQY3JlYXRlX21peF9vZmZlcgAAAAgAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAJcmVjaXBlX2lkAAAAAAAABAAAAAAAAAAKdG9rZW5fYV9pZAAAAAAABgAAAAAAAAAPZGVzaXJlZF9wcm9maWxlAAAAABAAAAAAAAAACG1pbl9yYW5rAAAABAAAAAAAAAAJZmVlX2JhbGxzAAAAAAAACwAAAAAAAAAJZmVlX3N0YXJzAAAAAAAACwAAAAAAAAAIZGVhZGxpbmUAAAAGAAAAAQAAA+kAAAAGAAAH0AAAAAlHYW1lRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAQYWNjZXB0X21peF9vZmZlcgAAAAUAAAAAAAAACG9mZmVyX2lkAAAABgAAAAAAAAAHcGFydG5lcgAAAAATAAAAAAAAAAp0b2tlbl9iX2lkAAAAAAAGAAAAAAAAAAlmZWVfYmFsbHMAAAAAAAALAAAAAAAAAAlmZWVfc3RhcnMAAAAAAAALAAAAAQAAA+kAAAAGAAAH0AAAAAlHYW1lRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAQY2FuY2VsX21peF9vZmZlcgAAAAIAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAJcmVjaXBlX2lkAAAAAAAABAAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACUdhbWVFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAALdXBncmFkZV90ZWEAAAAABAAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAZuZnRfaWQAAAAAAAYAAAAAAAAABWJhbGxzAAAAAAAACwAAAAAAAAAFc3RhcnMAAAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJR2FtZUVycm9yAAAA",
        "AAAAAAAAAAAAAAAIbGlzdF9uZnQAAAAEAAAAAAAAAAZzZWxsZXIAAAAAABMAAAAAAAAACHRva2VuX2lkAAAABgAAAAAAAAAFcHJpY2UAAAAAAAALAAAAAAAAAA1wYXltZW50X3Rva2VuAAAAAAAH0AAAAAxQYXltZW50VG9rZW4AAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlHYW1lRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAKZGVsaXN0X25mdAAAAAAAAgAAAAAAAAAGc2VsbGVyAAAAAAATAAAAAAAAAAh0b2tlbl9pZAAAAAYAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlHYW1lRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAHYnV5X25mdAAAAAACAAAAAAAAAAVidXllcgAAAAAAABMAAAAAAAAACHRva2VuX2lkAAAABgAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACUdhbWVFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAALY2xhaW1fZGFpbHkAAAAAAQAAAAAAAAAGcGxheWVyAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJR2FtZUVycm9yAAAA",
        "AAAAAAAAAAAAAAAKam9pbl9ldmVudAAAAAAAAwAAAAAAAAAGcGxheWVyAAAAAAATAAAAAAAAAAhldmVudF9pZAAAAAQAAAAAAAAABXN0YWtlAAAAAAAACwAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACUdhbWVFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAMZmluaXNoX2V2ZW50AAAAAgAAAAAAAAAGY2FsbGVyAAAAAAATAAAAAAAAAAhldmVudF9pZAAAAAQAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlHYW1lRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAMY3JlYXRlX2V2ZW50AAAABAAAAAAAAAAJb3JnYW5pemVyAAAAAAAAEwAAAAAAAAAIZXZlbnRfaWQAAAAEAAAAAAAAAAVzdGFrZQAAAAAAAAsAAAAAAAAACGRlYWRsaW5lAAAABgAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACUdhbWVFcnJvcgAAAA==",
      ]),
      options,
    );
  }
  public readonly fromJSON = {
    upsert_recipe: this.txFromJSON<Result<void>>,
    set_daily_limit: this.txFromJSON<Result<void>>,
    burn_tokens: this.txFromJSON<Result<void>>,
    create_mix_offer: this.txFromJSON<Result<u64>>,
    accept_mix_offer: this.txFromJSON<Result<u64>>,
    cancel_mix_offer: this.txFromJSON<Result<void>>,
    upgrade_tea: this.txFromJSON<Result<void>>,
    list_nft: this.txFromJSON<Result<void>>,
    delist_nft: this.txFromJSON<Result<void>>,
    buy_nft: this.txFromJSON<Result<void>>,
    claim_daily: this.txFromJSON<Result<void>>,
    join_event: this.txFromJSON<Result<void>>,
    finish_event: this.txFromJSON<Result<void>>,
    create_event: this.txFromJSON<Result<void>>,
  };
}
