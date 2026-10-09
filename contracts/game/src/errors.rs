use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum GameError {
    Unauthorized = 1,
    OfferNotFound = 2,
    OfferClosed = 3,
    LimitExceeded = 4,
    AlreadyClaimed = 5,
    InsufficientPayment = 6,
    InvalidInput = 7,
    NotOwner = 8,
    Expired = 9,
    NotReady = 10,
    RarityCapped = 13,
}
