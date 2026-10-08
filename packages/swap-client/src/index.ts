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
  Timepoint,
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
    contractId: "CB3J4Y2FOZJZXEQRU5RUZWKNU4FTZWHONTS6LZAMBLNB7MP6FKFO6QOG",
  },
} as const;




export type DataKey = {tag: "Config", values: void};


export interface Config {
  owner: string;
  stars_token: string;
  tea_contract: string;
  treasury: string;
  xlm_token: string;
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

export const SwapError = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"InvalidAmount"},
  4: {message:"Unauthorized"}
}

export interface Client {
  /**
   * Construct and simulate a init transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  init: ({owner, stars_token, treasury, xlm_token, tea_contract}: {owner: string, stars_token: string, treasury: string, xlm_token: string, tea_contract: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_config: (options?: MethodOptions) => Promise<AssembledTransaction<Result<Config>>>

  /**
   * Construct and simulate a swap transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  swap: ({initiator, recipient, stars_amount, xlm_amount}: {initiator: string, recipient: string, stars_amount: i128, xlm_amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a mint_tea transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  mint_tea: ({caller, recipient, tea_metadata}: {caller: string, recipient: string, tea_metadata: TeaMetadata}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a set_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_token: ({owner, stars_token}: {owner: string, stars_token: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_treasury transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_treasury: ({owner, treasury}: {owner: string, treasury: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_xlm_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_xlm_token: ({owner, xlm_token}: {owner: string, xlm_token: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_tea_contract transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_tea_contract: ({owner, tea_contract}: {owner: string, tea_contract: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAQAAAAAAAAAAAAAABkNvbmZpZwAA",
        "AAAAAQAAAAAAAAAAAAAABkNvbmZpZwAAAAAABQAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAtzdGFyc190b2tlbgAAAAATAAAAAAAAAAx0ZWFfY29udHJhY3QAAAATAAAAAAAAAAh0cmVhc3VyeQAAABMAAAAAAAAACXhsbV90b2tlbgAAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAACFRlYVN0YXRzAAAAAwAAAAAAAAAEYm9keQAAAAQAAAAAAAAACGNhZmZlaW5lAAAABAAAAAAAAAAJc3dlZXRuZXNzAAAAAAAABA==",
        "AAAAAQAAAAAAAAAAAAAAC1RlYU1ldGFkYXRhAAAAAAgAAAAAAAAADGRpc3BsYXlfbmFtZQAAABAAAAAAAAAADmZsYXZvcl9wcm9maWxlAAAAAAAQAAAAAAAAAAlpbWFnZV91cmkAAAAAAAAQAAAAAAAAAAhpbmZ1c2lvbgAAABAAAAAAAAAABWxldmVsAAAAAAAABAAAAAAAAAAHbGluZWFnZQAAAAPqAAAABgAAAAAAAAAGcmFyaXR5AAAAAAAEAAAAAAAAAAVzdGF0cwAAAAAAB9AAAAAIVGVhU3RhdHM=",
        "AAAABAAAAAAAAAAAAAAACVN3YXBFcnJvcgAAAAAAAAQAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAAQAAAAAAAAAOTm90SW5pdGlhbGl6ZWQAAAAAAAIAAAAAAAAADUludmFsaWRBbW91bnQAAAAAAAADAAAAAAAAAAxVbmF1dGhvcml6ZWQAAAAE",
        "AAAAAAAAAAAAAAAEaW5pdAAAAAUAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAALc3RhcnNfdG9rZW4AAAAAEwAAAAAAAAAIdHJlYXN1cnkAAAATAAAAAAAAAAl4bG1fdG9rZW4AAAAAAAATAAAAAAAAAAx0ZWFfY29udHJhY3QAAAATAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJU3dhcEVycm9yAAAA",
        "AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAPpAAAH0AAAAAZDb25maWcAAAAAB9AAAAAJU3dhcEVycm9yAAAA",
        "AAAAAAAAAAAAAAAEc3dhcAAAAAQAAAAAAAAACWluaXRpYXRvcgAAAAAAABMAAAAAAAAACXJlY2lwaWVudAAAAAAAABMAAAAAAAAADHN0YXJzX2Ftb3VudAAAAAsAAAAAAAAACnhsbV9hbW91bnQAAAAAAAsAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlTd2FwRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAIbWludF90ZWEAAAADAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAACXJlY2lwaWVudAAAAAAAABMAAAAAAAAADHRlYV9tZXRhZGF0YQAAB9AAAAALVGVhTWV0YWRhdGEAAAAAAQAAA+kAAAAGAAAH0AAAAAlTd2FwRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAJc2V0X3Rva2VuAAAAAAAAAgAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAtzdGFyc190b2tlbgAAAAATAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJU3dhcEVycm9yAAAA",
        "AAAAAAAAAAAAAAAMc2V0X3RyZWFzdXJ5AAAAAgAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAh0cmVhc3VyeQAAABMAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlTd2FwRXJyb3IAAAA=",
        "AAAAAAAAAAAAAAANc2V0X3hsbV90b2tlbgAAAAAAAAIAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAJeGxtX3Rva2VuAAAAAAAAEwAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVN3YXBFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAQc2V0X3RlYV9jb250cmFjdAAAAAIAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAMdGVhX2NvbnRyYWN0AAAAEwAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVN3YXBFcnJvcgAAAA==" ]),
      options
    )
  }
  public readonly fromJSON = {
    init: this.txFromJSON<Result<void>>,
        get_config: this.txFromJSON<Result<Config>>,
        swap: this.txFromJSON<Result<void>>,
        mint_tea: this.txFromJSON<Result<u64>>,
        set_token: this.txFromJSON<Result<void>>,
        set_treasury: this.txFromJSON<Result<void>>,
        set_xlm_token: this.txFromJSON<Result<void>>,
        set_tea_contract: this.txFromJSON<Result<void>>
  }
}