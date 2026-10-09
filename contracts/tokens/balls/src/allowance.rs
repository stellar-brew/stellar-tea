use core::convert::TryFrom;

use soroban_sdk::{Address, Env};
use stellar_tokens::fungible::Base;

pub fn approve(env: &Env, from: Address, spender: Address, amount: i128, expiration_ledger: i128) {
    let expiration =
        u32::try_from(expiration_ledger).expect("expiration ledger must be a non-negative u32");
    Base::approve(env, &from, &spender, amount, expiration);
}

pub fn allowance(env: &Env, owner: &Address, spender: &Address) -> i128 {
    Base::allowance(env, owner, spender)
}
