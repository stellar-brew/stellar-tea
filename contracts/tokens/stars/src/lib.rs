#![no_std]

pub mod admin;
pub mod allowance;
pub mod balance;
pub mod burn;
pub mod metadata;

mod contract;

pub use contract::StarsToken;

#[cfg(test)]
mod tests {
    extern crate std;

    use soroban_sdk::{testutils::Address as _, Address, Env};

    use crate::contract::{StarsToken, StarsTokenClient};
    use crate::metadata;

    fn init_client<'a>(e: &'a Env, admin: &Address) -> StarsTokenClient<'a> {
        let contract_id = e.register(StarsToken, (admin.clone(),));
        StarsTokenClient::new(e, &contract_id)
    }

    #[test]
    fn constructor_assigns_supply() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let client = init_client(&env, &admin);

        assert_eq!(client.balance(&admin), metadata::INITIAL_SUPPLY);
    }

    #[test]
    fn burn_reduces_the_caller_balance_by_exactly_the_amount() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let holder = Address::generate(&env);
        let client = init_client(&env, &admin);

        client.mint(&holder, &1_000);
        assert_eq!(client.balance(&holder), 1_000);

        client.burn(&holder, &400);

        assert_eq!(client.balance(&holder), 600);
    }

    #[test]
    #[should_panic]
    fn burn_requires_the_holders_authorization() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let holder = Address::generate(&env);
        let client = init_client(&env, &admin);

        // No authorization is mocked, so `Base::burn`'s `require_auth` cannot pass.
        client.burn(&holder, &1);
    }

    #[test]
    fn burn_by_admin_reduces_the_target_balance() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let holder = Address::generate(&env);
        let client = init_client(&env, &admin);

        client.mint(&holder, &500);
        client.burn_by_admin(&holder, &200);

        assert_eq!(client.balance(&holder), 300);
    }

    #[test]
    #[should_panic]
    fn burn_by_admin_requires_admin_authorization() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let holder = Address::generate(&env);
        let client = init_client(&env, &admin);

        // No authorization is mocked, so `require_admin`'s `require_auth` cannot pass.
        client.burn_by_admin(&holder, &1);
    }

    #[test]
    fn approve_and_allowance_round_trip_the_granted_value() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        let client = init_client(&env, &admin);

        client.approve(&owner, &spender, &1_234, &1_000);

        assert_eq!(client.allowance(&owner, &spender), 1_234);
    }

    #[test]
    #[should_panic]
    fn approve_requires_the_owners_authorization() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        let client = init_client(&env, &admin);

        client.approve(&owner, &spender, &1, &1_000);
    }

    #[test]
    #[should_panic]
    fn approve_with_a_negative_expiration_ledger_panics() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        let client = init_client(&env, &admin);

        client.approve(&owner, &spender, &1, &-1);
    }
}
