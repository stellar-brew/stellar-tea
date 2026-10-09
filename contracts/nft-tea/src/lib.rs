#![no_std]

pub mod admin;
pub mod error;
pub mod metadata;
pub mod storage;
pub mod tea;

mod contract;

pub use contract::TeaNftContract;

#[cfg(test)]
mod tests {
    extern crate std;

    use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

    use crate::contract::TeaNftContractClient;
    use crate::error::Error;
    use crate::metadata;
    use crate::tea::{TeaMetadata, TeaStats};
    use crate::TeaNftContract;

    fn init_client<'a>(env: &'a Env, admin: &Address) -> TeaNftContractClient<'a> {
        let contract_id = env.register(TeaNftContract, (admin.clone(), None::<String>));
        TeaNftContractClient::new(env, &contract_id)
    }

    fn sample_metadata(env: &Env) -> TeaMetadata {
        TeaMetadata {
            display_name: String::from_str(env, "Lunar Assam"),
            flavor_profile: String::from_str(env, "citrus"),
            rarity: 1,
            level: 1,
            infusion: String::from_str(env, "base"),
            stats: TeaStats {
                sweetness: 5,
                body: 7,
                caffeine: 3,
            },
            lineage: {
                let mut lineage = Vec::new(env);
                lineage.push_back(10);
                lineage
            },
            image_uri: String::from_str(env, "ipfs://example-lunar"),
        }
    }

    #[test]
    fn mint_and_level_up() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let operator = Address::generate(&env);
        let owner = Address::generate(&env);
        let client = init_client(&env, &admin);

        client.set_game_operator(&operator);
        let metadata = sample_metadata(&env);
        let token_id = client.mint(&operator, &owner, &metadata);

        let metadata = client.get_metadata(&token_id);
        assert_eq!(metadata.display_name, String::from_str(&env, "Lunar Assam"));

        client.set_level(&operator, &token_id, &5);
        let updated = client.get_metadata(&token_id);
        assert_eq!(updated.level, 5);
    }

    #[test]
    fn reading_metadata_for_an_unknown_token_returns_a_typed_error() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let client = init_client(&env, &admin);

        assert!(matches!(
            client.try_get_metadata(&999),
            Err(Ok(Error::MetadataNotFound))
        ));
    }

    #[test]
    fn reading_metadata_after_burn_returns_a_typed_error() {
    fn admin_can_sweep_tokens_sent_to_the_contract() {
        use soroban_sdk::token;

    fn constructor_without_base_uri_reports_defaults() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let client = init_client(&env, &admin);

        let token_id = client.mint(&admin, &owner, &sample_metadata(&env));
        client.burn_token(&admin, &owner, &token_id);

        assert!(matches!(
            client.try_get_metadata(&token_id),
            Err(Ok(Error::MetadataNotFound))
        ));
    }

    #[test]
    fn updating_the_level_of_an_unknown_token_returns_a_typed_error() {
        let client = init_client(&env, &admin);

        assert_eq!(client.name(), String::from_str(&env, metadata::NAME));
        assert_eq!(client.symbol(), String::from_str(&env, metadata::SYMBOL));

        let token_id = client.mint(&admin, &admin, &sample_metadata(&env));
        let expected = std::format!("{}{}", metadata::DEFAULT_BASE_URI, token_id);
        assert_eq!(
            client.token_uri(&(token_id as u32)),
            String::from_str(&env, &expected)
        );
    }

    #[test]
    fn constructor_with_explicit_base_uri_reports_it() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let client = init_client(&env, &admin);

        assert!(matches!(
            client.try_set_level(&admin, &999, &5),
            Err(Ok(Error::MetadataNotFound))
        ));
        let recipient = Address::generate(&env);
        let contract_id = env.register(TeaNftContract, (admin.clone(), None::<String>));
        let client = TeaNftContractClient::new(&env, &contract_id);

        let asset = env.register_stellar_asset_contract_v2(admin.clone());
        let asset_address = asset.address();
        token::StellarAssetClient::new(&env, &asset_address).mint(&contract_id, &1_000);

        client.sweep(&asset_address, &recipient, &400);

        let token_client = token::TokenClient::new(&env, &asset_address);
        assert_eq!(token_client.balance(&contract_id), 600);
        assert_eq!(token_client.balance(&recipient), 400);
        let base_uri = String::from_str(&env, "ipfs://custom-tea/");
        let contract_id = env.register(TeaNftContract, (admin.clone(), Some(base_uri.clone())));
        let client = TeaNftContractClient::new(&env, &contract_id);

        assert_eq!(client.name(), String::from_str(&env, metadata::NAME));
        assert_eq!(client.symbol(), String::from_str(&env, metadata::SYMBOL));

        let token_id = client.mint(&admin, &admin, &sample_metadata(&env));
        let expected = std::format!("ipfs://custom-tea/{}", token_id);
        assert_eq!(
            client.token_uri(&(token_id as u32)),
            String::from_str(&env, &expected)
        );
    }
}
