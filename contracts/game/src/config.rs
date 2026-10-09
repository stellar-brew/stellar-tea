use soroban_sdk::{contracttype, Address, Env};

#[derive(Clone)]
#[contracttype]
pub struct Config {
    pub admin: Address,
    pub treasury: Address,
    pub balls_token: Address,
    pub stars_token: Address,
    pub tea_nft: Address,
    pub dex: Option<Address>,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Config,
    DailyEmissionCap,
}

pub fn init(
    env: &Env,
    admin: &Address,
    treasury: &Address,
    balls_token: &Address,
    stars_token: &Address,
    tea_nft: &Address,
    dex: &Option<Address>,
) {
    let config = Config {
        admin: admin.clone(),
        treasury: treasury.clone(),
        balls_token: balls_token.clone(),
        stars_token: stars_token.clone(),
        tea_nft: tea_nft.clone(),
        dex: dex.clone(),
    };
    env.storage().instance().set(&DataKey::Config, &config);
}

pub fn require_admin(env: &Env) -> Address {
    let admin = get(env).admin;
    admin.require_auth();
    admin
}

pub fn get(env: &Env) -> Config {
    env.storage()
        .instance()
        .get::<DataKey, Config>(&DataKey::Config)
        .expect("config not set")
}

pub fn update_treasury(env: &Env, treasury: Address) {
    require_admin(env);
    let mut config = get(env);
    config.treasury = treasury.clone();
    env.storage().instance().set(&DataKey::Config, &config);
    env.events().publish(("treasury_updated",), (treasury,));
}

pub fn set_daily_cap(env: &Env, amount: i128) {
    require_admin(env);
    env.storage()
        .instance()
        .set(&DataKey::DailyEmissionCap, &amount);
}

pub fn daily_cap(env: &Env) -> Option<i128> {
    env.storage()
        .instance()
        .get::<DataKey, i128>(&DataKey::DailyEmissionCap)
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{contract, testutils::Address as _, Address, Env};

    #[contract]
    struct Dummy;

    fn setup() -> (Env, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, Dummy);
        (env, contract_id)
    }

    fn addresses(env: &Env) -> (Address, Address, Address, Address, Address) {
        (
            Address::generate(env),
            Address::generate(env),
            Address::generate(env),
            Address::generate(env),
            Address::generate(env),
        )
    }

    #[test]
    fn init_stores_the_full_config() {
        let (env, contract_id) = setup();
        let (admin, treasury, balls, stars, nft) = addresses(&env);
        env.as_contract(&contract_id, || {
            init(&env, &admin, &treasury, &balls, &stars, &nft, &None);
            let config = get(&env);
            assert_eq!(config.admin, admin);
            assert_eq!(config.treasury, treasury);
            assert_eq!(config.balls_token, balls);
            assert_eq!(config.stars_token, stars);
            assert_eq!(config.tea_nft, nft);
            assert_eq!(config.dex, None);
        });
    }

    #[test]
    fn require_admin_returns_the_configured_admin() {
        let (env, contract_id) = setup();
        let (admin, treasury, balls, stars, nft) = addresses(&env);
        env.as_contract(&contract_id, || {
            init(&env, &admin, &treasury, &balls, &stars, &nft, &None);
            // require_auth is satisfied by mock_all_auths; the returned address
            // must be the configured admin.
            assert_eq!(require_admin(&env), admin);
        });
    }

    #[test]
    fn daily_cap_is_none_before_set_and_round_trips() {
        let (env, contract_id) = setup();
        let (admin, treasury, balls, stars, nft) = addresses(&env);
        env.as_contract(&contract_id, || {
            init(&env, &admin, &treasury, &balls, &stars, &nft, &None);
            assert_eq!(daily_cap(&env), None);
            set_daily_cap(&env, 5_000_000);
            assert_eq!(daily_cap(&env), Some(5_000_000));
        });
    }

    #[test]
    fn update_treasury_leaves_every_other_field_untouched() {
        let (env, contract_id) = setup();
        let (admin, treasury, balls, stars, nft) = addresses(&env);
        let new_treasury = Address::generate(&env);
        env.as_contract(&contract_id, || {
            init(&env, &admin, &treasury, &balls, &stars, &nft, &None);
            update_treasury(&env, new_treasury.clone());
            let config = get(&env);
            assert_eq!(config.treasury, new_treasury);
            assert_eq!(config.admin, admin);
            assert_eq!(config.balls_token, balls);
            assert_eq!(config.stars_token, stars);
            assert_eq!(config.tea_nft, nft);
        });
    }
}
