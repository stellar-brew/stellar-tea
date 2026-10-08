use soroban_sdk::{contracttype, Address, Env};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    GameOperator,
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<DataKey, Address>(&DataKey::Admin)
        .expect("admin not initialized")
}

pub fn require_admin(env: &Env) -> Address {
    let admin = get_admin(env);
    admin.require_auth();
    admin
}

pub fn set_game_operator(env: &Env, operator: &Address) {
    require_admin(env);
    env.storage()
        .instance()
        .set(&DataKey::GameOperator, operator);
}

pub fn get_game_operator(env: &Env) -> Option<Address> {
    env.storage()
        .instance()
        .get::<DataKey, Address>(&DataKey::GameOperator)
}

pub fn require_operator_or_admin(env: &Env, invoker: &Address) -> Address {
    if let Some(game_operator) = get_game_operator(env) {
        if invoker == &game_operator {
            invoker.require_auth();
            return invoker.clone();
        }
    }
    require_admin(env)
}

#[cfg(test)]
mod tests {
    extern crate std;

    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    use super::*;
    use crate::TeaNftContract;

    fn setup(env: &Env) -> (Address, Address, Address, Address) {
        let admin = Address::generate(env);
        let operator = Address::generate(env);
        let outsider = Address::generate(env);
        let contract_id = env.register(TeaNftContract, (admin.clone(), None::<String>));
        (contract_id, admin, operator, outsider)
    }

    #[test]
    fn game_operator_is_none_until_set_then_some() {
        let env = Env::default();
        let (contract_id, _admin, operator, _outsider) = setup(&env);

        env.as_contract(&contract_id, || {
            assert_eq!(get_game_operator(&env), None);
        });

        env.mock_all_auths();
        env.as_contract(&contract_id, || {
            set_game_operator(&env, &operator);
        });

        env.as_contract(&contract_id, || {
            assert_eq!(get_game_operator(&env), Some(operator));
        });
    }

    #[test]
    fn admin_passes_the_gate_when_no_operator_is_configured() {
        let env = Env::default();
        let (contract_id, admin, _operator, _outsider) = setup(&env);
        env.mock_all_auths();

        env.as_contract(&contract_id, || {
            assert_eq!(get_game_operator(&env), None);
            assert_eq!(require_operator_or_admin(&env, &admin), admin);
        });
    }

    #[test]
    fn configured_operator_passes_the_gate() {
        let env = Env::default();
        let (contract_id, _admin, operator, _outsider) = setup(&env);
        env.mock_all_auths();

        env.as_contract(&contract_id, || {
            set_game_operator(&env, &operator);
        });

        env.as_contract(&contract_id, || {
            assert_eq!(require_operator_or_admin(&env, &operator), operator);
        });
    }

    #[test]
    #[should_panic]
    fn outsider_is_rejected_when_no_operator_is_configured() {
        let env = Env::default();
        let (contract_id, _admin, _operator, outsider) = setup(&env);

        // Nothing is authorised, so the fallback `require_admin` cannot satisfy
        // the stored admin's `require_auth`.
        env.as_contract(&contract_id, || {
            let _ = require_operator_or_admin(&env, &outsider);
        });
    }

    #[test]
    #[should_panic]
    fn outsider_is_rejected_when_an_operator_is_configured() {
        let env = Env::default();
        let (contract_id, _admin, operator, outsider) = setup(&env);

        // An operator being configured must not let a third address through the
        // gate: it still has to satisfy the stored admin's `require_auth`.
        env.as_contract(&contract_id, || {
            env.storage()
                .instance()
                .set(&DataKey::GameOperator, &operator);
            let _ = require_operator_or_admin(&env, &outsider);
        });
    }
}
