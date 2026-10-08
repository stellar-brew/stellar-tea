#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
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

        env.events().publish(
            ("swap_init",),
            (owner, stars_token, treasury, xlm_token, tea_contract),
        );

        Ok(())
    }

    pub fn get_config(env: Env) -> Result<Config, SwapError> {
        Self::config(&env)
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

    /// Helper: build a fresh Env with mock auth, then call init with the
    /// given owner + token addresses. Returns the (env, owner) tuple so
    /// the test can call subsequent contract methods.
    fn env_with_init() -> (Env, Address, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let stars_token = Address::generate(&env);
        let treasury = Address::generate(&env);
        let xlm_token = Address::generate(&env);
        let tea_contract = Address::generate(&env);

        let result = Swap::init(
            env.clone(),
            owner.clone(),
            stars_token.clone(),
            treasury.clone(),
            xlm_token.clone(),
            tea_contract.clone(),
        );
        assert!(result.is_ok());

        (env, owner, stars_token, treasury, xlm_token, tea_contract)
    }

    // -----------------------------------------------------------------------
    // init
    // -----------------------------------------------------------------------

    #[test]
    fn init_called_twice_returns_already_initialized() {
        // The bounty spec: "init twice returns Err(SwapError::AlreadyInitialized)."
        // Note: the check `if storage.has(&DataKey::Config)` happens BEFORE
        // `owner.require_auth()`, so the second call short-circuits with
        // AlreadyInitialized regardless of auth state.
        let (env, owner, stars_token, treasury, xlm_token, tea_contract) = env_with_init();

        // Second call — same owner, same args — should return AlreadyInitialized.
        let second = Swap::init(
            env.clone(),
            owner.clone(),
            stars_token.clone(),
            treasury.clone(),
            xlm_token.clone(),
            tea_contract.clone(),
        );
        assert_eq!(second, Err(SwapError::AlreadyInitialized));
    }

    // -----------------------------------------------------------------------
    // swap — InvalidAmount checks (before require_auth and before config())
    // -----------------------------------------------------------------------

    #[test]
    fn swap_with_zero_xlm_amount_returns_invalid_amount() {
        // The bounty spec: "swap with a non-positive xlm_amount returns Err(SwapError::InvalidAmount)."
        // The check is the FIRST line of swap(), so we don't need init/config/auth.
        let env = Env::default();
        let initiator = Address::generate(&env);
        let recipient = Address::generate(&env);

        let result = Swap::swap(
            env.clone(),
            initiator,
            recipient,
            100,   // stars_amount — non-zero
            0,     // xlm_amount — zero
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
            0,     // stars_amount — zero
            100,   // xlm_amount — non-zero (so the xlm check passes)
        );
        assert_eq!(result, Err(SwapError::InvalidAmount));
    }

    #[test]
    fn swap_with_negative_xlm_amount_returns_invalid_amount() {
        // The bounty spec: "non-positive" includes negatives.
        let env = Env::default();
        let initiator = Address::generate(&env);
        let recipient = Address::generate(&env);

        let result = Swap::swap(
            env.clone(),
            initiator,
            recipient,
            100,
            -50,   // xlm_amount — negative
        );
        assert_eq!(result, Err(SwapError::InvalidAmount));
    }

    #[test]
    fn swap_with_negative_stars_amount_returns_invalid_amount() {
        let env = Env::default();
        let initiator = Address::generate(&env);
        let recipient = Address::generate(&env);

        let result = Swap::swap(
            env.clone(),
            initiator,
            recipient,
            -50,   // stars_amount — negative
            100,
        );
        assert_eq!(result, Err(SwapError::InvalidAmount));
    }

    // -----------------------------------------------------------------------
    // set_token / set_treasury / set_xlm_token — Unauthorized checks
    // -----------------------------------------------------------------------

    #[test]
    fn set_token_with_non_owner_returns_unauthorized() {
        // The bounty spec: "Each set_* setter rejects a caller that is not config.owner with Unauthorized."
        // The check `if owner != config.owner` happens BEFORE `owner.require_auth()`,
        // so a non-owner caller gets Unauthorized without triggering auth.
        let (env, _owner, _stars_token, _treasury, _xlm_token, _tea_contract) = env_with_init();

        // A non-owner address (different from the owner used in init)
        let non_owner = Address::generate(&env);
        let new_stars_token = Address::generate(&env);

        let result = Swap::set_token(
            env.clone(),
            non_owner,            // not the configured owner
            new_stars_token,
        );
        assert_eq!(result, Err(SwapError::Unauthorized));
    }

    #[test]
    fn set_treasury_with_non_owner_returns_unauthorized() {
        let (env, _owner, _stars_token, _treasury, _xlm_token, _tea_contract) = env_with_init();

        let non_owner = Address::generate(&env);
        let new_treasury = Address::generate(&env);

        let result = Swap::set_treasury(
            env.clone(),
            non_owner,
            new_treasury,
        );
        assert_eq!(result, Err(SwapError::Unauthorized));
    }

    #[test]
    fn set_xlm_token_with_non_owner_returns_unauthorized() {
        let (env, _owner, _stars_token, _treasury, _xlm_token, _tea_contract) = env_with_init();

        let non_owner = Address::generate(&env);
        let new_xlm_token = Address::generate(&env);

        let result = Swap::set_xlm_token(
            env.clone(),
            non_owner,
            new_xlm_token,
        );
        assert_eq!(result, Err(SwapError::Unauthorized));
    }

    // -----------------------------------------------------------------------
    // get_config — confirms init worked
    // -----------------------------------------------------------------------

    #[test]
    fn get_config_after_init_returns_the_stored_config() {
        // Sanity: after init, get_config returns the Config we stored — confirms
        // the init in env_with_init() actually persisted.
        let (env, owner, stars_token, treasury, xlm_token, tea_contract) = env_with_init();

        let config = Swap::get_config(env.clone()).expect("config should be set after init");
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
        let result = Swap::get_config(env.clone());
        assert_eq!(result, Err(SwapError::NotInitialized));
    }

    // -----------------------------------------------------------------------
    // set_* with the actual owner succeeds (mock_all_auths lets require_auth through)
    // -----------------------------------------------------------------------

    #[test]
    fn set_token_with_owner_succeeds_and_updates_config() {
        let (env, owner, _stars_token, _treasury, _xlm_token, _tea_contract) = env_with_init();
        let new_stars_token = Address::generate(&env);

        let result = Swap::set_token(env.clone(), owner.clone(), new_stars_token.clone());
        assert!(result.is_ok());

        let config = Swap::get_config(env.clone()).unwrap();
        assert_eq!(config.stars_token, new_stars_token);
    }
}
