#![no_std]

pub mod admin;
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
    fn constructor_without_base_uri_reports_defaults() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
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
