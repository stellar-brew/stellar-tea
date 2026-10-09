use soroban_sdk::{Env, String};
use stellar_tokens::non_fungible::Base;

pub const NAME: &str = "Stellar Tea Collection";
pub const SYMBOL: &str = "TEA";
pub const DEFAULT_BASE_URI: &str = "ipfs://stellar-tea/";

pub fn init_metadata(env: &Env) {
    Base::set_metadata(
        env,
        String::from_str(env, DEFAULT_BASE_URI),
        String::from_str(env, NAME),
        String::from_str(env, SYMBOL),
    );
}

pub fn set_metadata(env: &Env, base_uri: String, name: String, symbol: String) {
    Base::set_metadata(env, base_uri, name, symbol);
}

#[cfg(test)]
mod tests {
    extern crate std;

    use soroban_sdk::{testutils::Address as _, Address, Env, String};
    use stellar_tokens::non_fungible::Base;

    use super::*;
    use crate::TeaNftContract;

    fn init_contract(env: &Env) -> Address {
        let admin = Address::generate(env);
        env.register(TeaNftContract, (admin, None::<String>))
    }

    #[test]
    fn init_metadata_installs_default_name_symbol_and_base_uri() {
        let env = Env::default();
        let contract_id = init_contract(&env);

        let (base_uri, name, symbol) = env.as_contract(&contract_id, || {
            init_metadata(&env);
            (Base::base_uri(&env), Base::name(&env), Base::symbol(&env))
        });

        assert_eq!(base_uri, String::from_str(&env, DEFAULT_BASE_URI));
        assert_eq!(name, String::from_str(&env, NAME));
        assert_eq!(symbol, String::from_str(&env, SYMBOL));
    }

    #[test]
    fn set_metadata_overrides_every_field() {
        let env = Env::default();
        let contract_id = init_contract(&env);
        let custom_uri = String::from_str(&env, "ipfs://custom-tea/");

        let (base_uri, name, symbol) = env.as_contract(&contract_id, || {
            set_metadata(
                &env,
                custom_uri.clone(),
                String::from_str(&env, "Custom Collection"),
                String::from_str(&env, "CSTM"),
            );
            (Base::base_uri(&env), Base::name(&env), Base::symbol(&env))
        });

        assert_eq!(base_uri, custom_uri);
        assert_eq!(name, String::from_str(&env, "Custom Collection"));
        assert_eq!(symbol, String::from_str(&env, "CSTM"));
    }
}
