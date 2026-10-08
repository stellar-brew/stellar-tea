use soroban_sdk::{contracttype, Env};

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

pub fn get_metadata(env: &Env, token_id: u64) -> TeaMetadata {
    env.storage()
        .persistent()
        .get::<DataKey, TeaMetadata>(&DataKey::Token(token_id))
        .expect("metadata missing")
}

pub fn remove_metadata(env: &Env, token_id: u64) {
    env.storage().persistent().remove(&DataKey::Token(token_id));
}

#[cfg(test)]
mod tests {
    extern crate std;

    use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

    use super::*;
    use crate::tea::{TeaMetadata, TeaStats};
    use crate::TeaNftContract;

    fn setup() -> (Env, Address) {
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(TeaNftContract, (admin, None::<String>));
        (env, contract_id)
    }

    fn sample_metadata(env: &Env) -> TeaMetadata {
        let mut lineage = Vec::new(env);
        lineage.push_back(1);
        lineage.push_back(2);
        lineage.push_back(3);
        TeaMetadata {
            display_name: String::from_str(env, "Lunar Assam"),
            flavor_profile: String::from_str(env, "citrus"),
            rarity: 3,
            level: 4,
            infusion: String::from_str(env, "oolong"),
            stats: TeaStats {
                sweetness: 11,
                body: 22,
                caffeine: 33,
            },
            lineage,
            image_uri: String::from_str(env, "ipfs://lunar"),
        }
    }

    #[test]
    fn metadata_round_trips_field_for_field() {
        let (env, contract_id) = setup();
        let metadata = sample_metadata(&env);

        let stored = env.as_contract(&contract_id, || {
            set_metadata(&env, 7, &metadata);
            get_metadata(&env, 7)
        });

        assert_eq!(stored.display_name, metadata.display_name);
        assert_eq!(stored.flavor_profile, metadata.flavor_profile);
        assert_eq!(stored.rarity, metadata.rarity);
        assert_eq!(stored.level, metadata.level);
        assert_eq!(stored.infusion, metadata.infusion);
        assert_eq!(stored.stats.sweetness, metadata.stats.sweetness);
        assert_eq!(stored.stats.body, metadata.stats.body);
        assert_eq!(stored.stats.caffeine, metadata.stats.caffeine);
        assert_eq!(stored.lineage, metadata.lineage);
        assert_eq!(stored.image_uri, metadata.image_uri);
    }

    #[test]
    fn empty_lineage_is_preserved() {
        let (env, contract_id) = setup();
        let mut metadata = sample_metadata(&env);
        metadata.lineage = Vec::new(&env);

        let stored = env.as_contract(&contract_id, || {
            set_metadata(&env, 9, &metadata);
            get_metadata(&env, 9)
        });

        assert_eq!(stored.lineage.len(), 0);
    }

    #[test]
    fn set_metadata_overwrites_the_previous_value() {
        let (env, contract_id) = setup();
        let mut metadata = sample_metadata(&env);
        let updated = metadata.clone();
        metadata.rarity = 99;

        let stored = env.as_contract(&contract_id, || {
            set_metadata(&env, 13, &updated);
            set_metadata(&env, 13, &metadata);
            get_metadata(&env, 13)
        });

        assert_eq!(stored.rarity, 99);
    }

    #[test]
    fn remove_metadata_makes_the_token_key_absent() {
        let (env, contract_id) = setup();
        let metadata = sample_metadata(&env);

        env.as_contract(&contract_id, || {
            set_metadata(&env, 11, &metadata);
            assert!(env.storage().persistent().has(&DataKey::Token(11)));

            remove_metadata(&env, 11);
            assert!(!env.storage().persistent().has(&DataKey::Token(11)));
        });
    }
}
