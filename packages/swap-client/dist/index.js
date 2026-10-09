import { Buffer } from "buffer";
import { Client as ContractClient, Spec as ContractSpec, } from "@stellar/stellar-sdk/contract";
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
};
export const SwapError = {
    1: { message: "AlreadyInitialized" },
    2: { message: "NotInitialized" },
    3: { message: "InvalidAmount" },
    4: { message: "Unauthorized" }
};
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy(null, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAQAAAAAAAAAAAAAABkNvbmZpZwAA",
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
            "AAAAAAAAAAAAAAAQc2V0X3RlYV9jb250cmFjdAAAAAIAAAAAAAAABW93bmVyAAAAAAAAEwAAAAAAAAAMdGVhX2NvbnRyYWN0AAAAEwAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVN3YXBFcnJvcgAAAA=="]), options);
        this.options = options;
    }
    fromJSON = {
        init: (this.txFromJSON),
        get_config: (this.txFromJSON),
        swap: (this.txFromJSON),
        mint_tea: (this.txFromJSON),
        set_token: (this.txFromJSON),
        set_treasury: (this.txFromJSON),
        set_xlm_token: (this.txFromJSON),
        set_tea_contract: (this.txFromJSON)
    };
}
