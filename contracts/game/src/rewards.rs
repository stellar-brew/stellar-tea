use soroban_sdk::{contracttype, Address, Env};

use crate::errors::GameError;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    LastClaim(Address),
}

pub const CLAIM_INTERVAL: u64 = 86_400;

pub fn ensure_claimable(env: &Env, player: &Address) -> Result<(), GameError> {
    let now = env.ledger().timestamp();
    if let Some(last) = env
        .storage()
        .persistent()
        .get::<DataKey, u64>(&DataKey::LastClaim(player.clone()))
    {
        if now.saturating_sub(last) < CLAIM_INTERVAL {
            return Err(GameError::AlreadyClaimed);
        }
    }
    Ok(())
}

pub fn record_claim(env: &Env, player: &Address) {
    let now = env.ledger().timestamp();
    env.storage()
        .persistent()
        .set(&DataKey::LastClaim(player.clone()), &now);
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        contract,
        testutils::{Address as _, Ledger as _},
        Address, Env,
    };

    #[contract]
    struct Dummy;

    fn setup() -> (Env, Address, Address) {
        let env = Env::default();
        let contract_id = env.register_contract(None, Dummy);
        let player = Address::generate(&env);
        (env, contract_id, player)
    }

    #[test]
    fn first_claim_without_a_stored_key_succeeds() {
        let (env, contract_id, player) = setup();
        env.as_contract(&contract_id, || {
            assert!(ensure_claimable(&env, &player).is_ok());
        });
    }

    #[test]
    fn second_claim_one_second_before_the_interval_is_rejected() {
        let (env, contract_id, player) = setup();
        env.as_contract(&contract_id, || {
            record_claim(&env, &player);
            env.ledger().set_timestamp(CLAIM_INTERVAL - 1);
            assert_eq!(
                ensure_claimable(&env, &player),
                Err(GameError::AlreadyClaimed)
            );
        });
    }

    #[test]
    fn claim_at_exactly_the_interval_succeeds() {
        let (env, contract_id, player) = setup();
        env.as_contract(&contract_id, || {
            record_claim(&env, &player);
            env.ledger().set_timestamp(CLAIM_INTERVAL);
            assert!(ensure_claimable(&env, &player).is_ok());
        });
    }

    #[test]
    fn claim_after_the_interval_succeeds() {
        let (env, contract_id, player) = setup();
        env.as_contract(&contract_id, || {
            record_claim(&env, &player);
            env.ledger().set_timestamp(CLAIM_INTERVAL + 1);
            assert!(ensure_claimable(&env, &player).is_ok());
        });
    }

    #[test]
    fn backwards_clock_is_handled_by_saturating_subtraction() {
        let (env, contract_id, player) = setup();
        env.as_contract(&contract_id, || {
            env.ledger().set_timestamp(CLAIM_INTERVAL * 2);
            record_claim(&env, &player);
            // The ledger moves backwards; saturating_sub yields 0, which is
            // still below the interval, so the claim must be rejected rather
            // than underflowing.
            env.ledger().set_timestamp(10);
            assert_eq!(
                ensure_claimable(&env, &player),
                Err(GameError::AlreadyClaimed)
            );
        });
    }

    #[test]
    fn record_claim_stores_the_ledger_timestamp() {
        let (env, contract_id, player) = setup();
        env.as_contract(&contract_id, || {
            env.ledger().set_timestamp(12_345);
            record_claim(&env, &player);
            let stored = env
                .storage()
                .persistent()
                .get::<DataKey, u64>(&DataKey::LastClaim(player.clone()));
            assert_eq!(stored, Some(12_345u64));
        });
    }
}
