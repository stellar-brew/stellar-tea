use soroban_sdk::{contracttype, Address, Env};

use crate::errors::GameError;

#[derive(Clone)]
#[contracttype]
pub enum PaymentToken {
    Balls,
    Stars,
}

#[derive(Clone)]
#[contracttype]
pub struct Listing {
    pub seller: Address,
    pub price: i128,
    pub payment_token: PaymentToken,
    pub created_at: u64,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Listing(u64),
}

pub fn set(env: &Env, token_id: u64, listing: &Listing) {
    env.storage()
        .persistent()
        .set(&DataKey::Listing(token_id), listing);
}

pub fn get(env: &Env, token_id: u64) -> Result<Listing, GameError> {
    env.storage()
        .persistent()
        .get::<DataKey, Listing>(&DataKey::Listing(token_id))
        .ok_or(GameError::OfferNotFound)
}

pub fn remove(env: &Env, token_id: u64) {
    env.storage()
        .persistent()
        .remove(&DataKey::Listing(token_id));
}


#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    /// Helper: build a Listing with the given seller and payment token.
    fn listing(env: &Env, seller: &Address, price: i128, token: PaymentToken) -> Listing {
        Listing {
            seller: seller.clone(),
            price,
            payment_token: token,
            created_at: env.ledger().timestamp(),
        }
    }

    // -----------------------------------------------------------------------
    // set / get round-trip
    // -----------------------------------------------------------------------

    #[test]
    fn get_after_set_returns_the_stored_listing_for_payment_token_balls() {
        let env = Env::default();
        let seller = Address::generate(&env);
        let original = listing(&env, &seller, 5_000, PaymentToken::Balls);

        set(&env, 1, &original);
        let fetched = get(&env, 1).expect("listing should be retrievable after set");

        // The bounty spec: "get after set returns the stored Listing including price, seller and payment_token."
        assert_eq!(fetched.price, 5_000);
        assert_eq!(fetched.seller, seller);
        assert_eq!(fetched.payment_token, PaymentToken::Balls);
        // created_at round-trips too
        assert_eq!(fetched.created_at, original.created_at);
    }

    #[test]
    fn get_after_set_returns_the_stored_listing_for_payment_token_stars() {
        // The bounty spec covers both PaymentToken::Balls and PaymentToken::Stars.
        let env = Env::default();
        let seller = Address::generate(&env);
        let original = listing(&env, &seller, 7_500, PaymentToken::Stars);

        set(&env, 2, &original);
        let fetched = get(&env, 2).expect("listing should be retrievable after set");

        assert_eq!(fetched.price, 7_500);
        assert_eq!(fetched.seller, seller);
        assert_eq!(fetched.payment_token, PaymentToken::Stars);
    }

    // -----------------------------------------------------------------------
    // not-found error (with OfferNotFound reuse documented)
    // -----------------------------------------------------------------------

    #[test]
    fn get_for_an_unknown_token_id_returns_offer_not_found() {
        // The bounty spec: "get for an unknown token_id returns Err(GameError::OfferNotFound)."
        // Note the reuse: marketplace::get reuses GameError::OfferNotFound (an
        // offer-oriented variant) for a missing listing — a marketplace lookup
        // miss is indistinguishable from a missing mix offer. A future cleanup
        // should add a dedicated ListingNotFound variant, but this test pins
        // the current contract.
        let env = Env::default();
        let result = get(&env, 999);
        assert_eq!(result, Err(GameError::OfferNotFound));
    }

    // -----------------------------------------------------------------------
    // remove
    // -----------------------------------------------------------------------

    #[test]
    fn remove_after_set_makes_a_subsequent_get_fail() {
        // The bounty spec: "remove after set makes a subsequent get fail."
        let env = Env::default();
        let seller = Address::generate(&env);
        let original = listing(&env, &seller, 3_000, PaymentToken::Balls);

        set(&env, 5, &original);
        // sanity: get works
        assert!(get(&env, 5).is_ok());

        remove(&env, 5);
        // after remove, get should fail with OfferNotFound (the same reuse as above)
        let result = get(&env, 5);
        assert_eq!(result, Err(GameError::OfferNotFound));
    }

    #[test]
    fn remove_for_an_unknown_token_id_is_a_no_op() {
        // remove on a token_id that was never set should not panic and should
        // leave storage in the same state.
        let env = Env::default();
        // No set call — token_id 99 was never set.
        remove(&env, 99); // should not panic
        // get still returns OfferNotFound
        assert_eq!(get(&env, 99), Err(GameError::OfferNotFound));
    }

    // -----------------------------------------------------------------------
    // set overwrites a previous value
    // -----------------------------------------------------------------------

    #[test]
    fn set_overwrites_a_previous_listing_for_the_same_token_id() {
        let env = Env::default();
        let seller1 = Address::generate(&env);
        let seller2 = Address::generate(&env);

        // First listing with seller1 and Balls
        let first = listing(&env, &seller1, 100, PaymentToken::Balls);
        set(&env, 7, &first);
        assert_eq!(get(&env, 7).unwrap().seller, seller1);
        assert_eq!(get(&env, 7).unwrap().payment_token, PaymentToken::Balls);

        // Overwrite with seller2 and Stars
        let second = listing(&env, &seller2, 200, PaymentToken::Stars);
        set(&env, 7, &second);
        let fetched = get(&env, 7).unwrap();
        assert_eq!(fetched.seller, seller2);
        assert_eq!(fetched.price, 200);
        assert_eq!(fetched.payment_token, PaymentToken::Stars);
    }
}
