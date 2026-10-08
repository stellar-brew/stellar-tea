#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol,
    IntoVal, String, Vec,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
}

#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub owner: Address,
    pub stars_token: Address,
    pub treasury: Address,
    pub xlm_token: Address,
    pub tea_contract: Address,
}

/// Default XLM -> STARS rate (24.5 STARS per XLM), matching the value the
/// frontend previously hard-coded. Stored on-chain so it can be governed.
const DEFAULT_STARS_PER_XLM_NUM: i128 = 245;
const DEFAULT_STARS_PER_XLM_DEN: i128 = 10;

#[contracttype]
#[derive(Clone)]
pub struct TeaStats {
    pub sweetness: u32,
    pub body: u32,
    pub caffeine: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct TeaMetadata {
    pub display_name: String,
    pub flavor_profile: String,
    pub rarity: u32,
    pub level: u32,
    pub infusion: String,
    pub stats: TeaStats,
    pub lineage: Vec<u64>,
    pub image_uri: String,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum SwapError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    Unauthorized = 4,
}

#[contract]
pub struct Swap;

#[contractimpl]
impl Swap {
    pub fn init(
        env: Env,
        owner: Address,
        stars_token: Address,
        treasury: Address,
        xlm_token: Address,
        tea_contract: Address,
    ) -> Result<(), SwapError> {
        let storage = env.storage().instance();
        if storage.has(&DataKey::Config) {
            return Err(SwapError::AlreadyInitialized);
        }

        owner.require_auth();

        let config = Config {
            owner: owner.clone(),
            stars_token: stars_token.clone(),
            treasury: treasury.clone(),
            xlm_token: xlm_token.clone(),
            tea_contract: tea_contract.clone(),
        };

        storage.set(&DataKey::Config, &config);
        env.storage().persistent().set(
            &symbol_short!("rate"),
            &(DEFAULT_STARS_PER_XLM_NUM, DEFAULT_STARS_PER_XLM_DEN),
        );

        env.events().publish(
            ("swap_init",),
            (owner, stars_token, treasury, xlm_token, tea_contract),
        );

        Ok(())
    }

    pub fn get_config(env: Env) -> Result<Config, SwapError> {
        Self::config(&env)
    }

    /// The admin-configured XLM -> STARS rate as a `(num, den)` pair.
    pub fn rate(env: Env) -> (i128, i128) {
        env.storage()
            .persistent()
            .get::<Symbol, (i128, i128)>(&symbol_short!("rate"))
            .unwrap_or((DEFAULT_STARS_PER_XLM_NUM, DEFAULT_STARS_PER_XLM_DEN))
    }

    /// Updates the XLM -> STARS rate. Owner-guarded; both parts must be positive.
    pub fn set_rate(
        env: Env,
        owner: Address,
        stars_per_xlm_num: i128,
        stars_per_xlm_den: i128,
    ) -> Result<(), SwapError> {
        let config = Self::config(&env)?;
        if owner != config.owner {
            return Err(SwapError::Unauthorized);
        }
        owner.require_auth();

        if stars_per_xlm_num <= 0 || stars_per_xlm_den <= 0 {
            return Err(SwapError::InvalidAmount);
        }

        env.storage().persistent().set(
            &symbol_short!("rate"),
            &(stars_per_xlm_num, stars_per_xlm_den),
        );

        env.events().publish(
            ("swap_rate_updated",),
            (stars_per_xlm_num, stars_per_xlm_den),
        );

        Ok(())
    }

    pub fn swap(
        env: Env,
        initiator: Address,
        recipient: Address,
        stars_amount: i128,
        xlm_amount: i128,
    ) -> Result<(), SwapError> {
        if xlm_amount <= 0 {
            return Err(SwapError::InvalidAmount);
        }

        if stars_amount <= 0 {
            return Err(SwapError::InvalidAmount);
        }

        initiator.require_auth();

        let config = Self::config(&env)?;
        let treasury = config.treasury.clone();

        let xlm_client = token::TokenClient::new(&env, &config.xlm_token);
        xlm_client.transfer(&initiator, &treasury, &xlm_amount);

        let recipient_clone = recipient.clone();
        let args = (&recipient, stars_amount).into_val(&env);
        env.invoke_contract::<()>(&config.stars_token, &symbol_short!("mint"), args);

        env.events().publish(
            ("swap",),
            (initiator, recipient_clone, stars_amount, xlm_amount),
        );

        Ok(())
    }

    pub fn mint_tea(
        env: Env,
        caller: Address,
        recipient: Address,
        tea_metadata: TeaMetadata,
    ) -> Result<u64, SwapError> {
        caller.require_auth();

        let config = Self::config(&env)?;
        let swap_address = env.current_contract_address();

        let args = (&swap_address, &recipient, tea_metadata.clone()).into_val(&env);

        let token_id: u64 = env.invoke_contract(&config.tea_contract, &symbol_short!("mint"), args);

        env.events()
            .publish(("tea_minted",), (caller, recipient, token_id));

        Ok(token_id)
    }

    pub fn set_token(env: Env, owner: Address, stars_token: Address) -> Result<(), SwapError> {
        let storage = env.storage().instance();
        let mut config = Self::config(&env)?;

        if owner != config.owner {
            return Err(SwapError::Unauthorized);
        }
        owner.require_auth();

        config.stars_token = stars_token.clone();
        storage.set(&DataKey::Config, &config);

        env.events().publish(("swap_token_updated",), stars_token);

        Ok(())
    }

    pub fn set_treasury(env: Env, owner: Address, treasury: Address) -> Result<(), SwapError> {
        let storage = env.storage().instance();
        let mut config = Self::config(&env)?;

        if owner != config.owner {
            return Err(SwapError::Unauthorized);
        }
        owner.require_auth();

        config.treasury = treasury.clone();
        storage.set(&DataKey::Config, &config);

        env.events().publish(("swap_treasury_updated",), treasury);

        Ok(())
    }

    pub fn set_xlm_token(env: Env, owner: Address, xlm_token: Address) -> Result<(), SwapError> {
        let storage = env.storage().instance();
        let mut config = Self::config(&env)?;

        if owner != config.owner {
            return Err(SwapError::Unauthorized);
        }
        owner.require_auth();

        config.xlm_token = xlm_token.clone();
        storage.set(&DataKey::Config, &config);

        env.events().publish(("swap_xlm_token_updated",), xlm_token);

        Ok(())
    }

    pub fn set_tea_contract(
        env: Env,
        owner: Address,
        tea_contract: Address,
    ) -> Result<(), SwapError> {
        let storage = env.storage().instance();
        let mut config = Self::config(&env)?;

        if owner != config.owner {
            return Err(SwapError::Unauthorized);
        }
        owner.require_auth();

        config.tea_contract = tea_contract.clone();
        storage.set(&DataKey::Config, &config);

        env.events()
            .publish(("swap_tea_contract_updated",), tea_contract);

        Ok(())
    }

    fn config(env: &Env) -> Result<Config, SwapError> {
        let storage = env.storage().instance();
        storage
            .get(&DataKey::Config)
            .ok_or(SwapError::NotInitialized)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

    // Contract storage is only reachable from inside a contract frame, so every
    // storage-touching call below is wrapped in `env.as_contract(&contract_id, ..)`.

    /// Registers a fresh Swap contract and initialises it with random addresses.
    /// Returns (env, contract_id, owner, stars_token, treasury, xlm_token, tea_contract).
    fn env_with_init() -> (Env, Address, Address, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let stars_token = Address::generate(&env);
        let treasury = Address::generate(&env);
        let xlm_token = Address::generate(&env);
        let tea_contract = Address::generate(&env);

        let contract_id = env.register(Swap, ());
        env.as_contract(&contract_id, || {
            let result = Swap::init(
                env.clone(),
                owner.clone(),
                stars_token.clone(),
                treasury.clone(),
                xlm_token.clone(),
                tea_contract.clone(),
            );
            assert!(result.is_ok());
        });

        (env, contract_id, owner, stars_token, treasury, xlm_token, tea_contract)
    }

    // -----------------------------------------------------------------------
    // init
    // -----------------------------------------------------------------------

    #[test]
    fn init_called_twice_returns_already_initialized() {
        // The bounty spec: "init twice returns Err(SwapError::AlreadyInitialized)."
        // The `if storage.has(&DataKey::Config)` check runs BEFORE
        // `owner.require_auth()`, so the second call short-circuits with
        // AlreadyInitialized regardless of auth state.
        let (env, contract_id, owner, stars_token, treasury, xlm_token, tea_contract) =
            env_with_init();

        let second = env.as_contract(&contract_id, || {
            Swap::init(
                env.clone(),
                owner.clone(),
                stars_token.clone(),
                treasury.clone(),
                xlm_token.clone(),
                tea_contract.clone(),
            )
        });
        assert_eq!(second, Err(SwapError::AlreadyInitialized));
    }

    // -----------------------------------------------------------------------
    // swap — InvalidAmount checks (before require_auth and before config())
    // -----------------------------------------------------------------------

    #[test]
    fn swap_with_zero_xlm_amount_returns_invalid_amount() {
        // The bounty spec: "swap with a non-positive xlm_amount returns Err(SwapError::InvalidAmount)."
        // The check is the FIRST line of swap(), so no contract frame is needed.
        let env = Env::default();
        let initiator = Address::generate(&env);
        let recipient = Address::generate(&env);

        let result = Swap::swap(
            env.clone(),
            initiator,
            recipient,
            100, // stars_amount — non-zero
            0,   // xlm_amount — zero
        );
        assert_eq!(result, Err(SwapError::InvalidAmount));
    }

    #[test]
    fn swap_with_zero_stars_amount_returns_invalid_amount() {
        // The bounty spec: "swap with a non-positive stars_amount returns Err(SwapError::InvalidAmount)."
        // The xlm_amount check is first; if xlm_amount > 0 we proceed to the stars_amount check.
        let env = Env::default();
        let initiator = Address::generate(&env);
        let recipient = Address::generate(&env);

        let result = Swap::swap(
            env.clone(),
            initiator,
            recipient,
            0,   // stars_amount — zero
            100, // xlm_amount — non-zero (so the xlm check passes)
        );
        assert_eq!(result, Err(SwapError::InvalidAmount));
    }

    #[test]
    fn swap_with_negative_xlm_amount_returns_invalid_amount() {
        // The bounty spec: "non-positive" includes negatives.
        let env = Env::default();
        let initiator = Address::generate(&env);
        let recipient = Address::generate(&env);

        let result = Swap::swap(env.clone(), initiator, recipient, 100, -50);
        assert_eq!(result, Err(SwapError::InvalidAmount));
    }

    #[test]
    fn swap_with_negative_stars_amount_returns_invalid_amount() {
        let env = Env::default();
        let initiator = Address::generate(&env);
        let recipient = Address::generate(&env);

        let result = Swap::swap(env.clone(), initiator, recipient, -50, 100);
        assert_eq!(result, Err(SwapError::InvalidAmount));
    }

    // -----------------------------------------------------------------------
    // set_token / set_treasury / set_xlm_token — Unauthorized checks
    // -----------------------------------------------------------------------

    #[test]
    fn set_token_with_non_owner_returns_unauthorized() {
        // The bounty spec: "Each set_* setter rejects a caller that is not config.owner with Unauthorized."
        let (env, contract_id, _owner, _stars_token, _treasury, _xlm_token, _tea_contract) =
            env_with_init();

        let non_owner = Address::generate(&env);
        let new_stars_token = Address::generate(&env);

        let result = env.as_contract(&contract_id, || {
            Swap::set_token(env.clone(), non_owner.clone(), new_stars_token.clone())
        });
        assert_eq!(result, Err(SwapError::Unauthorized));
    }

    #[test]
    fn set_treasury_with_non_owner_returns_unauthorized() {
        let (env, contract_id, _owner, _stars_token, _treasury, _xlm_token, _tea_contract) =
            env_with_init();

        let non_owner = Address::generate(&env);
        let new_treasury = Address::generate(&env);

        let result = env.as_contract(&contract_id, || {
            Swap::set_treasury(env.clone(), non_owner.clone(), new_treasury.clone())
        });
        assert_eq!(result, Err(SwapError::Unauthorized));
    }

    #[test]
    fn set_xlm_token_with_non_owner_returns_unauthorized() {
        let (env, contract_id, _owner, _stars_token, _treasury, _xlm_token, _tea_contract) =
            env_with_init();

        let non_owner = Address::generate(&env);
        let new_xlm_token = Address::generate(&env);

        let result = env.as_contract(&contract_id, || {
            Swap::set_xlm_token(env.clone(), non_owner.clone(), new_xlm_token.clone())
        });
        assert_eq!(result, Err(SwapError::Unauthorized));
    }

    // -----------------------------------------------------------------------
    // get_config — confirms init worked
    // -----------------------------------------------------------------------

    #[test]
    fn get_config_after_init_returns_the_stored_config() {
        // Sanity: after init, get_config returns the Config we stored.
        let (env, contract_id, owner, stars_token, treasury, xlm_token, tea_contract) =
            env_with_init();

        let config = env
            .as_contract(&contract_id, || Swap::get_config(env.clone()))
            .expect("config should be set after init");
        assert_eq!(config.owner, owner);
        assert_eq!(config.stars_token, stars_token);
        assert_eq!(config.treasury, treasury);
        assert_eq!(config.xlm_token, xlm_token);
        assert_eq!(config.tea_contract, tea_contract);
    }

    #[test]
    fn get_config_before_init_returns_not_initialized() {
        // Without init, get_config returns NotInitialized (config() short-circuits).
        let env = Env::default();
        let contract_id = env.register(Swap, ());
        let result = env.as_contract(&contract_id, || Swap::get_config(env.clone()));
        assert!(matches!(result, Err(SwapError::NotInitialized)));
    }

    // -----------------------------------------------------------------------
    // set_* with the actual owner succeeds (mock_all_auths lets require_auth through)
    // -----------------------------------------------------------------------

    #[test]
    fn set_token_with_owner_succeeds_and_updates_config() {
        let (env, contract_id, owner, _stars_token, _treasury, _xlm_token, _tea_contract) =
            env_with_init();
        let new_stars_token = Address::generate(&env);

        let result = env.as_contract(&contract_id, || {
            Swap::set_token(env.clone(), owner.clone(), new_stars_token.clone())
        });
        assert!(result.is_ok());

        let config = env
            .as_contract(&contract_id, || Swap::get_config(env.clone()))
            .expect("config should be set after init");
        assert_eq!(config.stars_token, new_stars_token);
    }

    // -----------------------------------------------------------------------
    // rate / set_rate
    // -----------------------------------------------------------------------

    #[test]
    fn init_sets_the_default_rate() {
        let (env, contract_id, ..) = env_with_init();
        assert_eq!(
            env.as_contract(&contract_id, || Swap::rate(env.clone())),
            (245, 10)
        );
    }

    #[test]
    fn set_rate_with_non_owner_returns_unauthorized() {
        let (env, contract_id, _owner, _stars_token, _treasury, _xlm_token, _tea_contract) =
            env_with_init();
        let non_owner = Address::generate(&env);

        let result =
            env.as_contract(&contract_id, || Swap::set_rate(env.clone(), non_owner.clone(), 30, 1));
        assert_eq!(result, Err(SwapError::Unauthorized));
    }

    #[test]
    fn set_rate_with_owner_updates_the_rate() {
        let (env, contract_id, owner, _stars_token, _treasury, _xlm_token, _tea_contract) =
            env_with_init();

        let result = env.as_contract(&contract_id, || {
            Swap::set_rate(env.clone(), owner.clone(), 30, 1)
        });
        assert!(result.is_ok());
        assert_eq!(
            env.as_contract(&contract_id, || Swap::rate(env.clone())),
            (30, 1)
        );
    }

    #[test]
    fn set_rate_rejects_non_positive_parts() {
        let (env, contract_id, owner, _stars_token, _treasury, _xlm_token, _tea_contract) =
            env_with_init();

        assert_eq!(
            env.as_contract(&contract_id, || {
                Swap::set_rate(env.clone(), owner.clone(), 0, 1)
            }),
            Err(SwapError::InvalidAmount)
        );
        assert_eq!(
            env.as_contract(&contract_id, || {
                Swap::set_rate(env.clone(), owner.clone(), 10, 0)
            }),
            Err(SwapError::InvalidAmount)
        );
    }
}
