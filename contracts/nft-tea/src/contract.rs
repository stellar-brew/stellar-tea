use soroban_sdk::{contract, contractimpl, token, Address, Env, String, Vec};
use stellar_macros::default_impl;
use stellar_tokens::non_fungible::{
    burnable::NonFungibleBurnable,
    enumerable::{Enumerable, NonFungibleEnumerable},
    Base, NonFungibleToken,
};

use crate::{admin, error::Error, metadata, storage, tea::TeaMetadata};

fn as_nft_id(id: u64) -> u32 {
    u32::try_from(id).expect("token id exceeds enumerated range")
}

#[contract]
pub struct TeaNftContract;

fn or_default(env: &Env, value: Option<String>, default: &str) -> String {
    value.unwrap_or_else(|| String::from_str(env, default))
}

#[contractimpl]
impl TeaNftContract {
    pub fn __constructor(env: Env, admin_address: Address, base_uri: Option<String>) {
        admin::set_admin(&env, &admin_address);
        let uri = or_default(&env, base_uri, metadata::DEFAULT_BASE_URI);
        metadata::set_metadata(
            &env,
            uri,
            String::from_str(&env, metadata::NAME),
            String::from_str(&env, metadata::SYMBOL),
        );
    }

    pub fn admin(env: Env) -> Address {
        admin::get_admin(&env)
    }

    pub fn game_operator(env: Env) -> Option<Address> {
        admin::get_game_operator(&env)
    }

    pub fn set_game_operator(env: Env, operator: Address) {
        admin::set_game_operator(&env, &operator);
        env.events().publish(("operator_set",), (operator,));
    }

    pub fn update_contract_metadata(
        env: Env,
        base_uri: Option<String>,
        name: Option<String>,
        symbol: Option<String>,
    ) {
        admin::require_admin(&env);
        let uri = or_default(&env, base_uri, metadata::DEFAULT_BASE_URI);
        let name_value = or_default(&env, name, metadata::NAME);
        let symbol_value = or_default(&env, symbol, metadata::SYMBOL);
        metadata::set_metadata(&env, uri, name_value, symbol_value);
    }

    pub fn mint(env: Env, caller: Address, to: Address, tea_metadata: TeaMetadata) -> u64 {
        admin::require_operator_or_admin(&env, &caller);
        let raw_id = Enumerable::sequential_mint(&env, &to);
        let id = u64::from(raw_id);
        storage::set_metadata(&env, id, &tea_metadata);
        env.events().publish(
            ("tea_minted",),
            (to, id, tea_metadata.rarity, tea_metadata.level),
        );
        id
    }

    pub fn get_metadata(env: Env, token_id: u64) -> Result<TeaMetadata, Error> {
        storage::get_metadata(&env, token_id)
    }

    pub fn set_metadata(env: Env, caller: Address, token_id: u64, tea_metadata: TeaMetadata) {
        admin::require_operator_or_admin(&env, &caller);
        storage::set_metadata(&env, token_id, &tea_metadata);
        env.events().publish(
            ("tea_updated",),
            (token_id, tea_metadata.level, tea_metadata.rarity),
        );
    }

    pub fn set_level(
        env: Env,
        caller: Address,
        token_id: u64,
        new_level: u32,
    ) -> Result<(), Error> {
        admin::require_operator_or_admin(&env, &caller);
        let mut metadata_state = storage::get_metadata(&env, token_id)?;
        metadata_state.level = new_level;
        storage::set_metadata(&env, token_id, &metadata_state);
        env.events().publish(("level_up",), (token_id, new_level));
        Ok(())
    }

    pub fn set_lineage(
        env: Env,
        caller: Address,
        token_id: u64,
        lineage: Vec<u64>,
    ) -> Result<(), Error> {
        admin::require_operator_or_admin(&env, &caller);
        let mut metadata_state = storage::get_metadata(&env, token_id)?;
        metadata_state.lineage = lineage;
        storage::set_metadata(&env, token_id, &metadata_state);
        env.events().publish(("lineage_set",), (token_id,));
        Ok(())
    }

    pub fn burn_token(env: Env, caller: Address, owner: Address, token_id: u64) {
        if caller != owner {
            admin::require_operator_or_admin(&env, &caller);
        }
        // `Base::burn` already requires `owner`'s authorization; asking for it
        // again in the same invocation frame is rejected by the host.
        Base::burn(&env, &owner, as_nft_id(token_id));
        storage::remove_metadata(&env, token_id);
        env.events().publish(("tea_burned",), (owner, token_id));
    }

    /// Admin-guarded rescue for tokens held by this contract.
    ///
    /// The STARS mint fee is transferred to this contract before minting, so
    /// without a sweep the accumulated balance would be unrecoverable. The
    /// admin may move any token held here to a destination of their choosing.
    pub fn sweep(env: Env, token: Address, to: Address, amount: i128) {
        admin::require_admin(&env);
        if amount <= 0 {
            panic!("sweep amount must be positive");
        }
        let token_client = token::TokenClient::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &to, &amount);
        env.events().publish(("swept",), (token, to, amount));
    }
}

#[default_impl]
#[contractimpl]
impl NonFungibleToken for TeaNftContract {
    type ContractType = Enumerable;
}

#[default_impl]
#[contractimpl]
impl NonFungibleEnumerable for TeaNftContract {}

#[default_impl]
#[contractimpl]
impl NonFungibleBurnable for TeaNftContract {}
