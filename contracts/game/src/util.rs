use soroban_sdk::{Address, Env, IntoVal, Symbol};

use crate::tea::TeaMetadata;

pub fn symbol(env: &Env, name: &str) -> Symbol {
    Symbol::new(env, name)
}

pub fn transfer_from(env: &Env, token: &Address, from: &Address, to: &Address, amount: i128) {
    let call = (
        env.current_contract_address(),
        from.clone(),
        to.clone(),
        amount,
    );
    let _ = env.invoke_contract::<()>(&token, &symbol(env, "transfer_from"), call.into_val(env));
}

pub fn transfer(env: &Env, token: &Address, from: &Address, to: &Address, amount: i128) {
    let call = (from.clone(), to.clone(), amount);
    let _ = env.invoke_contract::<()>(&token, &symbol(env, "transfer"), call.into_val(env));
}

pub fn mint(env: &Env, token: &Address, to: &Address, amount: i128) {
    let call = (to.clone(), amount);
    let _ = env.invoke_contract::<()>(&token, &symbol(env, "mint"), call.into_val(env));
}

pub fn burn(env: &Env, token: &Address, from: &Address, amount: i128) {
    let call = (from.clone(), amount);
    let _ = env.invoke_contract::<()>(&token, &symbol(env, "burn"), call.into_val(env));
}

pub fn burn_by_admin(env: &Env, token: &Address, from: &Address, amount: i128) {
    let call = (from.clone(), amount);
    let _ = env.invoke_contract::<()>(&token, &symbol(env, "burn_by_admin"), call.into_val(env));
}

pub fn allowance(env: &Env, token: &Address, owner: &Address, spender: &Address) -> i128 {
    let call = (owner.clone(), spender.clone());
    env.invoke_contract::<i128>(&token, &symbol(env, "allowance"), call.into_val(env))
}

pub fn balance(env: &Env, token: &Address, owner: &Address) -> i128 {
    let call = (owner.clone(),);
    env.invoke_contract::<i128>(&token, &symbol(env, "balance"), call.into_val(env))
}

pub fn mint_tea(env: &Env, tea_contract: &Address, to: &Address, metadata: TeaMetadata) -> u64 {
    let call = (env.current_contract_address(), to.clone(), metadata);
    env.invoke_contract::<u64>(&tea_contract, &symbol(env, "mint"), call.into_val(env))
}

pub fn update_tea_level(env: &Env, tea_contract: &Address, token_id: u64, level: u32) {
    let call = (env.current_contract_address(), token_id, level);
    let _ = env.invoke_contract::<()>(&tea_contract, &symbol(env, "set_level"), call.into_val(env));
}

pub fn update_tea_metadata(
    env: &Env,
    tea_contract: &Address,
    token_id: u64,
    metadata: TeaMetadata,
) {
    let call = (env.current_contract_address(), token_id, metadata);
    let _ = env.invoke_contract::<()>(
        &tea_contract,
        &symbol(env, "set_metadata"),
        call.into_val(env),
    );
}

pub fn burn_tea(env: &Env, tea_contract: &Address, owner: &Address, token_id: u64) {
    let call = (env.current_contract_address(), owner.clone(), token_id);
    let _ = env.invoke_contract::<()>(
        &tea_contract,
        &symbol(env, "burn_token"),
        call.into_val(env),
    );
}

pub fn get_tea_metadata(env: &Env, tea_contract: &Address, token_id: u64) -> TeaMetadata {
    let call = (token_id,);
    env.invoke_contract::<TeaMetadata>(
        &tea_contract,
        &symbol(env, "get_metadata"),
        call.into_val(env),
    )
}

pub fn owner_of(env: &Env, tea_contract: &Address, token_id: u64) -> Address {
    let call = (token_id,);
    env.invoke_contract::<Address>(&tea_contract, &symbol(env, "owner"), call.into_val(env))
}

pub fn transfer_tea(
    env: &Env,
    tea_contract: &Address,
    from: &Address,
    to: &Address,
    token_id: u64,
) {
    let call = (from.clone(), to.clone(), token_id);
    let _ = env.invoke_contract::<()>(&tea_contract, &symbol(env, "transfer"), call.into_val(env));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tea::{TeaMetadata, TeaStats};
    use soroban_sdk::{
        contract, contractimpl, contracttype, testutils::Address as _, Address, Env, String, Vec,
    };

    #[contracttype]
    #[derive(Clone)]
    pub struct Call {
        pub spender: Address,
        pub from: Address,
        pub to: Address,
        pub amount: i128,
    }

    #[contracttype]
    enum TokenKey {
        LastTransferFrom,
        LastTransfer,
        LastMint,
        LastBurn,
        Balance(Address),
    }

    #[contracttype]
    enum NftKey {
        Owner(u64),
        Metadata(u64),
        NextId,
    }

    #[contract]
    struct Dummy;

    #[contract]
    struct StubToken;

    #[contractimpl]
    impl StubToken {
        pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
            env.storage().instance().set(
                &TokenKey::LastTransferFrom,
                &Call {
                    spender,
                    from: from.clone(),
                    to: to.clone(),
                    amount,
                },
            );
            move_balance(&env, &from, &to, amount);
        }

        pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
            env.storage().instance().set(
                &TokenKey::LastTransfer,
                &Call {
                    spender: from.clone(),
                    from: from.clone(),
                    to: to.clone(),
                    amount,
                },
            );
            move_balance(&env, &from, &to, amount);
        }

        pub fn mint(env: Env, to: Address, amount: i128) {
            env.storage().instance().set(
                &TokenKey::LastMint,
                &Call {
                    spender: to.clone(),
                    from: to.clone(),
                    to: to.clone(),
                    amount,
                },
            );
            set_balance(&env, &to, balance_of(&env, &to) + amount);
        }

        pub fn burn(env: Env, from: Address, amount: i128) {
            env.storage().instance().set(
                &TokenKey::LastBurn,
                &Call {
                    spender: from.clone(),
                    from: from.clone(),
                    to: from.clone(),
                    amount,
                },
            );
            set_balance(&env, &from, balance_of(&env, &from) - amount);
        }
    }

    #[contract]
    struct StubNft;

    #[contractimpl]
    impl StubNft {
        pub fn mint(env: Env, _caller: Address, to: Address, metadata: TeaMetadata) -> u64 {
            let id: u64 = env
                .storage()
                .instance()
                .get(&NftKey::NextId)
                .unwrap_or(0)
                + 1;
            env.storage().instance().set(&NftKey::NextId, &id);
            env.storage().instance().set(&NftKey::Owner(id), &to);
            env.storage().instance().set(&NftKey::Metadata(id), &metadata);
            id
        }

        pub fn owner(env: Env, token_id: u64) -> Address {
            env.storage()
                .instance()
                .get(&NftKey::Owner(token_id))
                .unwrap()
        }

        pub fn get_metadata(env: Env, token_id: u64) -> TeaMetadata {
            env.storage()
                .instance()
                .get(&NftKey::Metadata(token_id))
                .unwrap()
        }

        pub fn set_metadata(env: Env, _caller: Address, token_id: u64, metadata: TeaMetadata) {
            env.storage()
                .instance()
                .set(&NftKey::Metadata(token_id), &metadata);
        }

        pub fn burn_token(env: Env, _caller: Address, _owner: Address, token_id: u64) {
            env.storage().instance().remove(&NftKey::Owner(token_id));
            env.storage()
                .instance()
                .remove(&NftKey::Metadata(token_id));
        }

        pub fn transfer(env: Env, _from: Address, to: Address, token_id: u64) {
            env.storage().instance().set(&NftKey::Owner(token_id), &to);
        }
    }

    fn balance_of(env: &Env, id: &Address) -> i128 {
        env.storage()
            .instance()
            .get(&TokenKey::Balance(id.clone()))
            .unwrap_or(0)
    }

    fn set_balance(env: &Env, id: &Address, value: i128) {
        env.storage()
            .instance()
            .set(&TokenKey::Balance(id.clone()), &value);
    }

    fn move_balance(env: &Env, from: &Address, to: &Address, amount: i128) {
        set_balance(env, from, balance_of(env, from) - amount);
        set_balance(env, to, balance_of(env, to) + amount);
    }

    fn read_call(env: &Env, token: &Address, key: TokenKey) -> Option<Call> {
        env.as_contract(token, || env.storage().instance().get(&key))
    }

    fn sample_metadata(env: &Env) -> TeaMetadata {
        let mut lineage = Vec::new(env);
        lineage.push_back(7);
        TeaMetadata {
            display_name: String::from_str(env, "Stub Tea"),
            flavor_profile: String::from_str(env, "floral"),
            rarity: 3,
            level: 2,
            infusion: String::from_str(env, "fusion"),
            stats: TeaStats {
                sweetness: 4,
                body: 6,
                caffeine: 8,
            },
            lineage,
            image_uri: String::from_str(env, "ipfs://stub"),
        }
    }

    #[test]
    fn transfer_records_from_to_and_amount() {
        let env = Env::default();
        let token = env.register(StubToken, ());
        let caller = env.register_contract(None, Dummy);
        let from = Address::generate(&env);
        let to = Address::generate(&env);

        env.as_contract(&caller, || {
            transfer(&env, &token, &from, &to, 500);
        });

        let call = read_call(&env, &token, TokenKey::LastTransfer).unwrap();
        assert_eq!(call.from, from);
        assert_eq!(call.to, to);
        assert_eq!(call.amount, 500);
    }

    #[test]
    fn transfer_from_places_the_spender_first() {
        let env = Env::default();
        let token = env.register(StubToken, ());
        let caller = env.register_contract(None, Dummy);
        let from = Address::generate(&env);
        let to = Address::generate(&env);

        env.as_contract(&caller, || {
            transfer_from(&env, &token, &from, &to, 250);
        });

        let call = read_call(&env, &token, TokenKey::LastTransferFrom).unwrap();
        // `transfer_from` is invoked as (current_contract_address, from, to, amount),
        // which is the token contract's (spender, from, to, amount) order.
        assert_eq!(call.spender, caller);
        assert_eq!(call.from, from);
        assert_eq!(call.to, to);
        assert_eq!(call.amount, 250);
    }

    #[test]
    fn mint_and_burn_record_their_arguments() {
        let env = Env::default();
        let token = env.register(StubToken, ());
        let caller = env.register_contract(None, Dummy);
        let account = Address::generate(&env);

        env.as_contract(&caller, || {
            mint(&env, &token, &account, 1_000);
            burn(&env, &token, &account, 400);
        });

        let minted = read_call(&env, &token, TokenKey::LastMint).unwrap();
        assert_eq!(minted.to, account);
        assert_eq!(minted.amount, 1_000);

        let burned = read_call(&env, &token, TokenKey::LastBurn).unwrap();
        assert_eq!(burned.from, account);
        assert_eq!(burned.amount, 400);

        let remaining = env.as_contract(&token, || balance_of(&env, &account));
        assert_eq!(remaining, 600);
    }

    #[test]
    fn owner_of_decodes_the_nft_owner() {
        let env = Env::default();
        let nft = env.register(StubNft, ());
        let caller = env.register_contract(None, Dummy);
        let owner = Address::generate(&env);
        let client = StubNftClient::new(&env, &nft);
        let token_id = client.mint(&caller, &owner, &sample_metadata(&env));

        let decoded = env.as_contract(&caller, || owner_of(&env, &nft, token_id));
        assert_eq!(decoded, owner);
    }

    #[test]
    fn get_tea_metadata_decodes_the_full_struct() {
        let env = Env::default();
        let nft = env.register(StubNft, ());
        let caller = env.register_contract(None, Dummy);
        let owner = Address::generate(&env);
        let client = StubNftClient::new(&env, &nft);
        let metadata = sample_metadata(&env);
        let token_id = client.mint(&caller, &owner, &metadata);

        let decoded = env.as_contract(&caller, || get_tea_metadata(&env, &nft, token_id));
        assert_eq!(decoded.display_name, metadata.display_name);
        assert_eq!(decoded.rarity, metadata.rarity);
        assert_eq!(decoded.level, metadata.level);
        assert_eq!(decoded.stats.body, metadata.stats.body);
        assert_eq!(decoded.lineage.get(0).unwrap(), 7);
    }

    #[test]
    fn mint_tea_and_transfer_tea_move_nft_ownership() {
        let env = Env::default();
        let nft = env.register(StubNft, ());
        let caller = env.register_contract(None, Dummy);
        let owner = Address::generate(&env);
        let new_owner = Address::generate(&env);
        let client = StubNftClient::new(&env, &nft);

        let token_id =
            env.as_contract(&caller, || mint_tea(&env, &nft, &owner, sample_metadata(&env)));
        assert_eq!(client.owner(&token_id), owner);

        env.as_contract(&caller, || {
            transfer_tea(&env, &nft, &owner, &new_owner, token_id)
        });
        assert_eq!(client.owner(&token_id), new_owner);
    }

    #[test]
    fn update_tea_metadata_writes_through() {
        let env = Env::default();
        let nft = env.register(StubNft, ());
        let caller = env.register_contract(None, Dummy);
        let owner = Address::generate(&env);
        let client = StubNftClient::new(&env, &nft);
        let token_id = client.mint(&caller, &owner, &sample_metadata(&env));

        let mut updated = sample_metadata(&env);
        updated.level = 9;
        env.as_contract(&caller, || {
            update_tea_metadata(&env, &nft, token_id, updated.clone())
        });

        assert_eq!(client.get_metadata(&token_id).level, 9);
    }
}
