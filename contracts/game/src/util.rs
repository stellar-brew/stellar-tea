use soroban_sdk::{Address, Env, IntoVal, Symbol};

use crate::tea::TeaMetadata;

pub fn symbol(env: &Env, name: &str) -> Symbol {
    Symbol::new(env, name)
}

pub fn transfer_from(env: &Env, token: &Address, from: &Address, to: &Address, amount: i128) {
    let call = (
        env.current_contract_address(),
        from.clone(),
        to.clone(),
        amount,
    );
    let _ = env.invoke_contract::<()>(&token, &symbol(env, "transfer_from"), call.into_val(env));
}

pub fn transfer(env: &Env, token: &Address, from: &Address, to: &Address, amount: i128) {
    let call = (from.clone(), to.clone(), amount);
    let _ = env.invoke_contract::<()>(&token, &symbol(env, "transfer"), call.into_val(env));
}

pub fn mint(env: &Env, token: &Address, to: &Address, amount: i128) {
    let call = (to.clone(), amount);
    let _ = env.invoke_contract::<()>(&token, &symbol(env, "mint"), call.into_val(env));
}

pub fn burn(env: &Env, token: &Address, from: &Address, amount: i128) {
    let call = (from.clone(), amount);
    let _ = env.invoke_contract::<()>(&token, &symbol(env, "burn"), call.into_val(env));
}

pub fn mint_tea(env: &Env, tea_contract: &Address, to: &Address, metadata: TeaMetadata) -> u64 {
    let call = (env.current_contract_address(), to.clone(), metadata);
    env.invoke_contract::<u64>(&tea_contract, &symbol(env, "mint"), call.into_val(env))
}

pub fn update_tea_metadata(
    env: &Env,
    tea_contract: &Address,
    token_id: u64,
    metadata: TeaMetadata,
) {
    let call = (env.current_contract_address(), token_id, metadata);
    let _ = env.invoke_contract::<()>(
        &tea_contract,
        &symbol(env, "set_metadata"),
        call.into_val(env),
    );
}

pub fn burn_tea(env: &Env, tea_contract: &Address, owner: &Address, token_id: u64) {
    let call = (env.current_contract_address(), owner.clone(), token_id);
    let _ = env.invoke_contract::<()>(
        &tea_contract,
        &symbol(env, "burn_token"),
        call.into_val(env),
    );
}

pub fn get_tea_metadata(env: &Env, tea_contract: &Address, token_id: u64) -> TeaMetadata {
    let call = (token_id,);
    env.invoke_contract::<TeaMetadata>(
        &tea_contract,
        &symbol(env, "get_metadata"),
        call.into_val(env),
    )
}

pub fn owner_of(env: &Env, tea_contract: &Address, token_id: u64) -> Address {
    let call = (token_id,);
    env.invoke_contract::<Address>(&tea_contract, &symbol(env, "owner"), call.into_val(env))
}

pub fn transfer_tea(
    env: &Env,
    tea_contract: &Address,
    from: &Address,
    to: &Address,
    token_id: u64,
) {
    let call = (from.clone(), to.clone(), token_id);
    let _ = env.invoke_contract::<()>(&tea_contract, &symbol(env, "transfer"), call.into_val(env));
}
