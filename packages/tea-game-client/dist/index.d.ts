import { Buffer } from "buffer";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
} from "@stellar/stellar-sdk/contract";
import type { u32, u64, i128, Option } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export declare const networks: {
  readonly testnet: {
    readonly networkPassphrase: "Test SDF Network ; September 2015";
    readonly contractId: "CA634CSZEDDAMZMATYM6ACY4M6HYTJFUINWHF3O5G7THWWTKXJD77FTH";
  };
};
export interface Config {
  admin: string;
  balls_token: string;
  dex: Option<string>;
  stars_token: string;
  tea_nft: string;
  treasury: string;
}
export type DataKey =
  | {
      tag: "Config";
      values: void;
    }
  | {
      tag: "DailyEmissionCap";
      values: void;
    }
  | {
      tag: "Event";
      values: readonly [u32];
    }
  | {
      tag: "Limit";
      values: readonly [string, string];
    }
  | {
      tag: "Listing";
      values: readonly [u64];
    }
  | {
      tag: "Offer";
      values: readonly [u64];
    }
  | {
      tag: "Sequence";
      values: void;
    }
  | {
      tag: "OwnerIndex";
      values: readonly [string, u32];
    }
  | {
      tag: "LastClaim";
      values: readonly [string];
    };
export declare const GameError: {
  1: {
    message: string;
  };
  2: {
    message: string;
  };
  3: {
    message: string;
  };
  4: {
    message: string;
  };
  5: {
    message: string;
  };
  6: {
    message: string;
  };
  7: {
    message: string;
  };
  8: {
    message: string;
  };
  9: {
    message: string;
  };
  10: {
    message: string;
  };
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
  | {
      tag: "Balls";
      values: void;
    }
  | {
      tag: "Stars";
      values: void;
    };
export interface Listing {
  created_at: u64;
  payment_token: PaymentToken;
  price: i128;
  seller: string;
}
export type OfferStatus =
  | {
      tag: "WaitingForPartner";
      values: void;
    }
  | {
      tag: "ReadyToMix";
      values: void;
    }
  | {
      tag: "Completed";
      values: void;
    }
  | {
      tag: "Cancelled";
      values: void;
    };
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
    }: {
      user: string;
      limit_type: string;
      value: i128;
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
   * Construct and simulate a burn_tokens transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  burn_tokens: (
    {
      from,
      balls,
      stars,
    }: {
      from: string;
      balls: Option<i128>;
      stars: Option<i128>;
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
    {
      owner,
      recipe_id,
    }: {
      owner: string;
      recipe_id: u32;
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
  /**
   * Construct and simulate a upgrade_tea transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  upgrade_tea: (
    {
      owner,
      nft_id,
      balls,
      stars,
    }: {
      owner: string;
      nft_id: u64;
      balls: i128;
      stars: i128;
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
    {
      seller,
      token_id,
    }: {
      seller: string;
      token_id: u64;
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
   * Construct and simulate a buy_nft transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  buy_nft: (
    {
      buyer,
      token_id,
    }: {
      buyer: string;
      token_id: u64;
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
   * Construct and simulate a claim_daily transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claim_daily: (
    {
      player,
    }: {
      player: string;
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
   * Construct and simulate a join_event transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  join_event: (
    {
      player,
      event_id,
      stake,
    }: {
      player: string;
      event_id: u32;
      stake: i128;
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
   * Construct and simulate a finish_event transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  finish_event: (
    {
      caller,
      event_id,
    }: {
      caller: string;
      event_id: u32;
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
   * Construct and simulate a create_event transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_event: (
    {
      organizer,
      event_id,
      stake,
      deadline,
    }: {
      organizer: string;
      event_id: u32;
      stake: i128;
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
  ) => Promise<AssembledTransaction<Result<void>>>;
}
export declare class Client extends ContractClient {
  readonly options: ContractClientOptions;
  static deploy<T = Client>(
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
  ): Promise<AssembledTransaction<T>>;
  constructor(options: ContractClientOptions);
  readonly fromJSON: {
    upsert_recipe: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    set_daily_limit: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    burn_tokens: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    create_mix_offer: (
      json: string,
    ) => AssembledTransaction<
      Result<bigint, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    accept_mix_offer: (
      json: string,
    ) => AssembledTransaction<
      Result<bigint, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    cancel_mix_offer: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    upgrade_tea: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    list_nft: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    delist_nft: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    buy_nft: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    claim_daily: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    join_event: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    finish_event: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
    create_event: (
      json: string,
    ) => AssembledTransaction<
      Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>
    >;
  };
}
