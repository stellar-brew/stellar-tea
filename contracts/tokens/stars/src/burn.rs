use soroban_sdk::{Address, Env};
use stellar_tokens::fungible::Base;

use crate::admin;

pub fn burn(env: &Env, from: &Address, amount: i128) {
    Base::burn(env, from, amount);
}

pub fn burn_by_admin(env: &Env, from: &Address, amount: i128) {
    let _ = admin::require_admin(env);
    Base::burn(env, from, amount);
}
