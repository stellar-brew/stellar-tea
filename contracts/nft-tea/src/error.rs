use soroban_sdk::contracterror;

/// Errors returned by the tea NFT contract.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// No metadata is stored for the requested token id: the token was never
    /// minted, or its metadata was removed by `burn_token`.
    MetadataNotFound = 1,
}
