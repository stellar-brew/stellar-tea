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
    fn admin_can_sweep_tokens_sent_to_the_contract() {
        use soroban_sdk::token;

        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
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
    }
}
