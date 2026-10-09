use soroban_sdk::{contract, contractimpl, Address, Env, String};
use stellar_tokens::fungible::Base;

use crate::{admin, allowance, balance, burn, metadata};

#[contract]
pub struct StarsToken;

#[contractimpl]
impl StarsToken {
    pub fn __constructor(env: Env, admin_address: Address) {
        admin::set_admin(&env, &admin_address);
        metadata::init_metadata(&env);
        Base::mint(&env, &admin_address, metadata::INITIAL_SUPPLY);
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        let current_admin = admin::require_admin(&env);
        admin::set_admin(&env, &new_admin);
        env.events()
            .publish(("admin_updated",), (current_admin, new_admin));
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        balance::balance(&env, &id)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        balance::transfer(&env, from, to, amount);
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        balance::transfer_from(&env, spender, from, to, amount);
    }

    pub fn approve(
        env: Env,
        from: Address,
        spender: Address,
        amount: i128,
        expiration_ledger: i128,
    ) {
        allowance::approve(&env, from, spender, amount, expiration_ledger);
    }

    pub fn allowance(env: Env, owner: Address, spender: Address) -> i128 {
        allowance::allowance(&env, &owner, &spender)
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin = admin::require_admin(&env);
        Base::mint(&env, &to, amount);
        env.events().publish(("mint",), (admin, to, amount));
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        burn::burn(&env, &from, amount);
        env.events().publish(("burn",), (from, amount));
    }

    pub fn burn_by_admin(env: Env, from: Address, amount: i128) {
        let admin = admin::get_admin(&env);
        burn::burn_by_admin(&env, &from, amount);
        env.events().publish(("burn_admin",), (admin, from, amount));
    }

    pub fn metadata(env: Env) -> (u32, String, String) {
        (
            metadata::DECIMALS,
            String::from_str(&env, metadata::NAME),
            String::from_str(&env, metadata::SYMBOL),
        )
    }
}
