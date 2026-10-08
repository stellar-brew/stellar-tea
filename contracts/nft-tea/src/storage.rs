use soroban_sdk::{contracttype, Env};

use crate::error::Error;
use crate::tea::TeaMetadata;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Token(u64),
}

pub fn set_metadata(env: &Env, token_id: u64, metadata: &TeaMetadata) {
    env.storage()
        .persistent()
        .set(&DataKey::Token(token_id), metadata);
}

pub fn get_metadata(env: &Env, token_id: u64) -> Result<TeaMetadata, Error> {
    env.storage()
        .persistent()
        .get::<DataKey, TeaMetadata>(&DataKey::Token(token_id))
        .ok_or(Error::MetadataNotFound)
}

pub fn remove_metadata(env: &Env, token_id: u64) {
    env.storage().persistent().remove(&DataKey::Token(token_id));
}
