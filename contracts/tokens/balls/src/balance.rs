use soroban_sdk::{Address, Env};
use stellar_tokens::fungible::Base;

pub fn balance(env: &Env, owner: &Address) -> i128 {
    Base::balance(env, owner)
}

pub fn transfer(env: &Env, from: Address, to: Address, amount: i128) {
    Base::transfer(env, &from, &to, amount);
}

pub fn transfer_from(env: &Env, spender: Address, from: Address, to: Address, amount: i128) {
    Base::transfer_from(env, &spender, &from, &to, amount);
}
