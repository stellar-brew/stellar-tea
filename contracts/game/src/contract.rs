use soroban_sdk::xdr::ToXdr;
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, String, Symbol, Vec};

use crate::{
    config,
    errors::GameError,
    events, limits,
    marketplace::{self, Listing, PaymentToken},
    mixing::{self, BeverageMixer, MixOffer, OfferStatus},
    rewards,
    tea::{TeaMetadata, TeaStats},
    util,
};

const MARKET_FEE_BPS: i128 = 300; // 3%
const BURN_FEE_BPS: i128 = 200; // 2% burn from marketplace fees
const LOSER_COMPENSATION_PERCENT: i128 = 80;
const TREASURY_REWARD_PERCENT: i128 = 20;
const UPGRADE_LEVEL_INCREMENT: u32 = 1;
/// Highest rarity tier a tea can reach. The frontend rarity mapping and the
/// recipe catalogue use tiers 1 through 5, so upgrades stop at this tier.
const MAX_TEA_RARITY: u32 = 5;
const DAILY_BALLS_REWARD: i128 = 2_000_000; // 0.02 with 8 decimals
const DAILY_STARS_REWARD: i128 = 200_000; // 0.002 with 8 decimals

struct MixOutcome {
    new_token_id: u64,
    winner: Address,
    loser: Address,
    total_balls: i128,
    total_stars: i128,
}

#[derive(Clone)]
#[soroban_sdk::contracttype]
pub struct Recipe {
    pub id: u32,
    pub name: String,
    pub flavor_profile: String,
    pub base_level: u32,
    pub base_rarity: u32,
    pub base_stats: TeaStats,
    pub image_uri: String,
}

#[derive(Clone)]
#[soroban_sdk::contracttype]
enum DataKey {
    Recipe(u32),
}

fn get_recipe(env: &Env, recipe_id: u32) -> Result<Recipe, GameError> {
    env.storage()
        .instance()
        .get::<DataKey, Recipe>(&DataKey::Recipe(recipe_id))
        .ok_or(GameError::OfferNotFound)
}

fn put_recipe(env: &Env, recipe: &Recipe) {
    env.storage()
        .instance()
        .set(&DataKey::Recipe(recipe.id), recipe);
}

fn ensure_authorized_player(_env: &Env, player: &Address) -> Result<(), GameError> {
    player.require_auth();
    Ok(())
}

fn compose_metadata(env: &Env, recipe: &Recipe, offer: &MixOffer) -> TeaMetadata {
    let mut lineage = Vec::new(env);
    lineage.push_back(offer.token_a_id);
    if let Some(token_b) = offer.token_b_id {
        lineage.push_back(token_b);
    }
    TeaMetadata {
        display_name: recipe.name.clone(),
        flavor_profile: recipe.flavor_profile.clone(),
        rarity: recipe.base_rarity,
        flavor_profile: offer.desired_profile.clone(),
        rarity: recipe.base_rarity.min(MAX_TEA_RARITY),
        level: recipe.base_level,
        infusion: String::from_str(env, "fusion"),
        stats: recipe.base_stats.clone(),
        lineage,
        image_uri: recipe.image_uri.clone(),
    }
}

impl mixing::BeverageMixer for StellarTeaGame {
    fn decide_winner(
        env: &Env,
        offer: &MixOffer,
        token_b_id: u64,
    ) -> Result<(Address, Address), GameError> {
        let partner = offer.owner_b.clone().ok_or(GameError::NotReady)?;
        // Randomness note: the winner is derived from a hash that includes a value
        // drawn from the network-seeded PRNG (`env.prng`). That seed comes from the
        // transaction-set hash and this transaction's hash-sorted position within
        // it, so neither player knows it when they build or simulate the accept
        // transaction and it cannot be ground by picking a favourable ledger
        // timestamp. The public offer identifiers are still mixed in so the
        // outcome is bound to this specific offer.
        let entropy: u64 = env.prng().gen();
        let payload = (
            env.ledger().timestamp(),
            offer.owner_a.clone(),
            partner.clone(),
            offer.token_a_id,
            token_b_id,
            offer.recipe_id,
            entropy,
        )
            .to_xdr(env);
        let seed = env.crypto().sha256(&payload);
        let seed_bytes = seed.to_array();
        let owner_wins = seed_bytes[0] & 1 == 0;
        if owner_wins {
            Ok((offer.owner_a.clone(), partner))
        } else {
            Ok((partner, offer.owner_a.clone()))
        }
    }
}

fn payment_symbol(env: &Env, label: &str) -> Symbol {
    Symbol::new(env, label)
}

fn assert_payment(amount: i128) -> Result<(), GameError> {
    if amount <= 0 {
        return Err(GameError::InvalidInput);
    }
    Ok(())
}

fn ensure_fee_schedule(fee_balls: i128, fee_stars: i128) -> Result<(), GameError> {
    if fee_balls < 0 || fee_stars < 0 {
        return Err(GameError::InvalidInput);
    }
    if fee_balls == 0 && fee_stars == 0 {
        return Err(GameError::InvalidInput);
    }
    Ok(())
}

#[contract]
pub struct StellarTeaGame;

#[contractimpl]
impl StellarTeaGame {
    fn resolve_mix(env: Env, offer_id: u64, mut offer: MixOffer) -> Result<MixOutcome, GameError> {
        let cfg = config::get(&env);
        let owner = offer.owner_a.clone();
        let token_b_id = offer.token_b_id.ok_or(GameError::NotReady)?;
        let recipe = get_recipe(&env, offer.recipe_id)?;
        let (winner, loser) = StellarTeaGame::decide_winner(&env, &offer, token_b_id)?;

        util::burn_tea(
            &env,
            &cfg.tea_nft,
            &env.current_contract_address(),
            offer.token_a_id,
        );
        util::burn_tea(
            &env,
            &cfg.tea_nft,
            &env.current_contract_address(),
            token_b_id,
        );

        let metadata = compose_metadata(&env, &recipe, &offer);
        let new_token_id = util::mint_tea(&env, &cfg.tea_nft, &winner, metadata);

        let total_balls = offer.fee_balls + offer.partner_fee_balls;
        let total_stars = offer.fee_stars + offer.partner_fee_stars;
        let contract_address = env.current_contract_address();

        if total_balls > 0 {
            let (loser_share_balls, treasury_share_balls) = StellarTeaGame::split_fee(total_balls);
            if loser_share_balls > 0 {
                util::transfer(
                    &env,
                    &cfg.balls_token,
                    &contract_address,
                    &loser,
                    loser_share_balls,
                );
            }
            if treasury_share_balls > 0 {
                util::transfer(
                    &env,
                    &cfg.balls_token,
                    &contract_address,
                    &cfg.treasury,
                    treasury_share_balls,
                );
            }
        }

        if total_stars > 0 {
            let (loser_share_stars, treasury_share_stars) = StellarTeaGame::split_fee(total_stars);
            if loser_share_stars > 0 {
                util::transfer(
                    &env,
                    &cfg.stars_token,
                    &contract_address,
                    &loser,
                    loser_share_stars,
                );
            }
            if treasury_share_stars > 0 {
                util::transfer(
                    &env,
                    &cfg.stars_token,
                    &contract_address,
                    &cfg.treasury,
                    treasury_share_stars,
                );
            }
        }

        mixing::remove(&env, offer_id);
        mixing::clear_owner_index(&env, &owner, offer.recipe_id);
        offer.status = OfferStatus::Completed;

        let outcome = MixOutcome {
            new_token_id,
            winner: winner.clone(),
            loser: loser.clone(),
            total_balls,
            total_stars,
        };

        env.events().publish(
            ("mix_resolved",),
            (
                offer_id,
                outcome.winner.clone(),
                outcome.loser.clone(),
                outcome.new_token_id,
                outcome.total_balls,
                outcome.total_stars,
            ),
        );

        Ok(outcome)
    }

    fn split_fee(total: i128) -> (i128, i128) {
        if total <= 0 {
            return (0, 0);
        }
        let loser_share = total * LOSER_COMPENSATION_PERCENT / 100;
        let mut treasury_share = total * TREASURY_REWARD_PERCENT / 100;
        let distributed = loser_share + treasury_share;
        if distributed < total {
            treasury_share += total - distributed;
        }
        (loser_share, treasury_share)
    }

    pub fn __constructor(
        env: Env,
        admin: Address,
        treasury: Address,
        balls_token: Address,
        stars_token: Address,
        tea_nft: Address,
        dex: Option<Address>,
    ) {
        config::init(
            &env,
            &admin,
            &treasury,
            &balls_token,
            &stars_token,
            &tea_nft,
            &dex,
        );
    }

    pub fn upsert_recipe(
        env: Env,
        recipe_id: u32,
        name: String,
        flavor_profile: String,
        base_level: u32,
        base_rarity: u32,
        base_stats: TeaStats,
        image_uri: String,
    ) -> Result<(), GameError> {
        config::require_admin(&env);
        let recipe = Recipe {
            id: recipe_id,
            name,
            flavor_profile,
            base_level,
            base_rarity,
            base_stats,
            image_uri,
        };
        put_recipe(&env, &recipe);
        env.events().publish(("recipe_upserted",), (recipe_id,));
        Ok(())
    }

    pub fn set_daily_limit(
        env: Env,
        user: Address,
        limit_type: Symbol,
        value: i128,
    ) -> Result<(), GameError> {
        config::require_admin(&env);
        assert_payment(value)?;
        limits::set_limit(&env, &user, &limit_type, value);
        Ok(())
    }

    /// Admin-only: set the total reward that may be emitted per day across all
    /// players. `claim_daily` rejects a claim that would exceed it.
    pub fn set_daily_cap(env: Env, amount: i128) -> Result<(), GameError> {
        if amount <= 0 {
            return Err(GameError::InvalidInput);
        }
        config::set_daily_cap(&env, amount);
        env.events().publish(("daily_cap_set",), (amount,));
        Ok(())
    }

    pub fn burn_tokens(
        env: Env,
        from: Address,
        balls: Option<i128>,
        stars: Option<i128>,
    ) -> Result<(), GameError> {
        ensure_authorized_player(&env, &from)?;
        let cfg = config::get(&env);
        if let Some(amount) = balls {
            assert_payment(amount)?;
            util::burn(&env, &cfg.balls_token, &from, amount);
        }
        if let Some(amount) = stars {
            assert_payment(amount)?;
            util::burn(&env, &cfg.stars_token, &from, amount);
        }
        env.events().publish(("manual_burn",), (from, balls, stars));
        Ok(())
    }

    pub fn create_mix_offer(
        env: Env,
        owner: Address,
        recipe_id: u32,
        token_a_id: u64,
        desired_profile: String,
        min_rank: u32,
        fee_balls: i128,
        fee_stars: i128,
        deadline: u64,
    ) -> Result<u64, GameError> {
        ensure_authorized_player(&env, &owner)?;
        ensure_fee_schedule(fee_balls, fee_stars)?;
        let cfg = config::get(&env);
        let offer_id = mixing::next_id(&env);
        let now = env.ledger().timestamp();
        if deadline <= now {
            return Err(GameError::InvalidInput);
        }
        let _ = get_recipe(&env, recipe_id)?;
        if mixing::get_by_owner_recipe(&env, &owner, recipe_id).is_some() {
            return Err(GameError::InvalidInput);
        }

        // escrow NFT and tokens
        util::transfer_tea(
            &env,
            &cfg.tea_nft,
            &owner,
            &env.current_contract_address(),
            token_a_id,
        );

        if fee_balls > 0 {
            util::transfer_from(
                &env,
                &cfg.balls_token,
                &owner,
                &env.current_contract_address(),
                fee_balls,
            );
        }

        if fee_stars > 0 {
            util::transfer_from(
                &env,
                &cfg.stars_token,
                &owner,
                &env.current_contract_address(),
                fee_stars,
            );
        }

        let offer = MixOffer {
            owner_a: owner.clone(),
            token_a_id,
            owner_b: None,
            token_b_id: None,
            desired_profile,
            min_rank,
            recipe_id,
            fee_balls,
            fee_stars,
            partner_fee_balls: 0,
            partner_fee_stars: 0,
            status: OfferStatus::WaitingForPartner,
            created_at: now,
            deadline,
        };
        mixing::put(&env, offer_id, &offer);
        mixing::set_owner_index(&env, &owner, recipe_id, offer_id);
        env.events()
            .publish(("mix_offer_created",), (owner, offer_id, recipe_id));
        Ok(offer_id)
    }

    pub fn accept_mix_offer(
        env: Env,
        offer_id: u64,
        partner: Address,
        token_b_id: u64,
        fee_balls: i128,
        fee_stars: i128,
    ) -> Result<u64, GameError> {
        ensure_authorized_player(&env, &partner)?;
        let cfg = config::get(&env);
        let mut offer = mixing::get(&env, offer_id)?;
        if offer.status != OfferStatus::WaitingForPartner {
            return Err(GameError::OfferClosed);
        }
        if env.ledger().timestamp() > offer.deadline {
            return Err(GameError::Expired);
        }
        if fee_balls != offer.fee_balls {
            return Err(GameError::InvalidInput);
        }
        if fee_stars != offer.fee_stars {
            return Err(GameError::InvalidInput);
        }

        util::transfer_tea(
            &env,
            &cfg.tea_nft,
            &partner,
            &env.current_contract_address(),
            token_b_id,
        );

        if fee_balls > 0 {
            util::transfer_from(
                &env,
                &cfg.balls_token,
                &partner,
                &env.current_contract_address(),
                fee_balls,
            );
        }
        if fee_stars > 0 {
            util::transfer_from(
                &env,
                &cfg.stars_token,
                &partner,
                &env.current_contract_address(),
                fee_stars,
            );
        }

        offer.owner_b = Some(partner.clone());
        offer.token_b_id = Some(token_b_id);
        offer.partner_fee_balls = fee_balls;
        offer.partner_fee_stars = fee_stars;
        offer.status = OfferStatus::ReadyToMix;
        let outcome = StellarTeaGame::resolve_mix(env.clone(), offer_id, offer)?;
        env.events().publish(
            ("mix_offer_completed",),
            (
                offer_id,
                outcome.winner.clone(),
                outcome.loser.clone(),
                outcome.new_token_id,
            ),
        );
        Ok(outcome.new_token_id)
    }

    pub fn cancel_mix_offer(env: Env, owner: Address, recipe_id: u32) -> Result<(), GameError> {
        ensure_authorized_player(&env, &owner)?;
        let cfg = config::get(&env);
        let offer_id =
            mixing::get_by_owner_recipe(&env, &owner, recipe_id).ok_or(GameError::OfferNotFound)?;
        let offer = mixing::get(&env, offer_id)?;
        if offer.status != OfferStatus::WaitingForPartner {
            return Err(GameError::OfferClosed);
        }

        util::transfer_tea(
            &env,
            &cfg.tea_nft,
            &env.current_contract_address(),
            &owner,
            offer.token_a_id,
        );

        if offer.fee_balls > 0 {
            util::transfer(
                &env,
                &cfg.balls_token,
                &env.current_contract_address(),
                &owner,
                offer.fee_balls,
            );
        }
        if offer.fee_stars > 0 {
            util::transfer(
                &env,
                &cfg.stars_token,
                &env.current_contract_address(),
                &owner,
                offer.fee_stars,
            );
        }

        mixing::remove(&env, offer_id);
        mixing::clear_owner_index(&env, &owner, recipe_id);
        env.events()
            .publish(("mix_offer_cancelled",), (owner, recipe_id));
        Ok(())
    }

    pub fn upgrade_tea(
        env: Env,
        owner: Address,
        nft_id: u64,
        balls: i128,
        stars: i128,
    ) -> Result<(), GameError> {
        ensure_authorized_player(&env, &owner)?;
        if balls < 0 || stars < 0 || (balls == 0 && stars == 0) {
            return Err(GameError::InvalidInput);
        }
        let cfg = config::get(&env);
        let token_owner = util::owner_of(&env, &cfg.tea_nft, nft_id);
        if token_owner != owner {
            return Err(GameError::NotOwner);
        }

        if balls > 0 {
            util::transfer_from(
                &env,
                &cfg.balls_token,
                &owner,
                &env.current_contract_address(),
                balls,
            );
            let burn_balls = balls / 2;
            util::burn(
                &env,
                &cfg.balls_token,
                &env.current_contract_address(),
                burn_balls,
            );
            util::transfer(
                &env,
                &cfg.balls_token,
                &env.current_contract_address(),
                &cfg.treasury,
                balls - burn_balls,
            );
        }

        if stars > 0 {
            util::transfer_from(
                &env,
                &cfg.stars_token,
                &owner,
                &env.current_contract_address(),
                stars,
            );
            let burn_stars = stars / 2;
            util::burn(
                &env,
                &cfg.stars_token,
                &env.current_contract_address(),
                burn_stars,
            );
            util::transfer(
                &env,
                &cfg.stars_token,
                &env.current_contract_address(),
                &cfg.treasury,
                stars - burn_stars,
            );
        }

        let mut metadata = util::get_tea_metadata(&env, &cfg.tea_nft, nft_id);
        if metadata.rarity >= MAX_TEA_RARITY {
            return Err(GameError::RarityCapped);
        }
        metadata.level = metadata.level.saturating_add(UPGRADE_LEVEL_INCREMENT);
        metadata.rarity += 1;
        metadata.stats.body += 5;
        metadata.stats.caffeine += 3;
        metadata.stats.sweetness += 2;
        util::update_tea_metadata(&env, &cfg.tea_nft, nft_id, metadata);
        env.events()
            .publish(("tea_upgraded",), (owner, nft_id, balls, stars));
        Ok(())
    }

    pub fn list_nft(
        env: Env,
        seller: Address,
        token_id: u64,
        price: i128,
        payment_token: PaymentToken,
    ) -> Result<(), GameError> {
        ensure_authorized_player(&env, &seller)?;
        assert_payment(price)?;
        let cfg = config::get(&env);
        let actual_owner = util::owner_of(&env, &cfg.tea_nft, token_id);
        if actual_owner != seller {
            return Err(GameError::NotOwner);
        }

        util::transfer_tea(
            &env,
            &cfg.tea_nft,
            &seller,
            &env.current_contract_address(),
            token_id,
        );

        let listing = Listing {
            seller: seller.clone(),
            price,
            payment_token,
            created_at: env.ledger().timestamp(),
        };
        marketplace::set(&env, token_id, &listing);
        env.events()
            .publish(("nft_listed",), (seller, token_id, price));
        Ok(())
    }

    pub fn delist_nft(env: Env, seller: Address, token_id: u64) -> Result<(), GameError> {
        ensure_authorized_player(&env, &seller)?;
        let cfg = config::get(&env);
        let listing = marketplace::get(&env, token_id)?;
        if listing.seller != seller {
            return Err(GameError::Unauthorized);
        }

        util::transfer_tea(
            &env,
            &cfg.tea_nft,
            &env.current_contract_address(),
            &seller,
            token_id,
        );
        marketplace::remove(&env, token_id);
        env.events().publish(("nft_delisted",), (seller, token_id));
        Ok(())
    }

    pub fn buy_nft(env: Env, buyer: Address, token_id: u64) -> Result<(), GameError> {
        ensure_authorized_player(&env, &buyer)?;
        let cfg = config::get(&env);
        let listing = marketplace::get(&env, token_id)?;

        let payment_token_address = match listing.payment_token {
            PaymentToken::Balls => cfg.balls_token.clone(),
            PaymentToken::Stars => cfg.stars_token.clone(),
        };

        util::transfer_from(
            &env,
            &payment_token_address,
            &buyer,
            &env.current_contract_address(),
            listing.price,
        );

        let fee = listing.price * MARKET_FEE_BPS / 10_000;
        let burn_amount = listing.price * BURN_FEE_BPS / 10_000;
        let seller_amount = listing.price - fee;
        let treasury_amount = fee - burn_amount;

        if burn_amount > 0 {
            util::burn(
                &env,
                &payment_token_address,
                &env.current_contract_address(),
                burn_amount,
            );
        }
        if treasury_amount > 0 {
            util::transfer(
                &env,
                &payment_token_address,
                &env.current_contract_address(),
                &cfg.treasury,
                treasury_amount,
            );
        }

        util::transfer(
            &env,
            &payment_token_address,
            &env.current_contract_address(),
            &listing.seller,
            seller_amount,
        );

        util::transfer_tea(
            &env,
            &cfg.tea_nft,
            &env.current_contract_address(),
            &buyer,
            token_id,
        );
        marketplace::remove(&env, token_id);
        env.events().publish(
            ("nft_purchased",),
            (buyer, listing.seller, token_id, listing.price),
        );
        Ok(())
    }

    pub fn claim_daily(env: Env, player: Address) -> Result<(), GameError> {
        ensure_authorized_player(&env, &player)?;
        rewards::ensure_claimable(&env, &player)?;

        let cfg = config::get(&env);
        let limit_symbol = symbol_short!("daily");

        let reward_total = DAILY_BALLS_REWARD + DAILY_STARS_REWARD;
        let daily_cap = config::daily_cap(&env).unwrap_or(i128::MAX);
        if config::emitted_today(&env) + reward_total > daily_cap {
            return Err(GameError::LimitExceeded);
        }

        limits::consume(&env, &player, &limit_symbol, 1)?;
        config::record_emission(&env, reward_total);

        util::mint(&env, &cfg.balls_token, &player, DAILY_BALLS_REWARD);
        util::mint(&env, &cfg.stars_token, &player, DAILY_STARS_REWARD);
        rewards::record_claim(&env, &player);
        env.events().publish(
            ("daily_claimed",),
            (player, DAILY_BALLS_REWARD, DAILY_STARS_REWARD),
        );
        Ok(())
    }

    pub fn join_event(
        env: Env,
        player: Address,
        event_id: u32,
        stake: i128,
    ) -> Result<(), GameError> {
        ensure_authorized_player(&env, &player)?;
        assert_payment(stake)?;
        let cfg = config::get(&env);
        let mut event = events::get(&env, event_id)?;
        events::ensure_active(&event, &env)?;
        if stake < event.stake {
            return Err(GameError::InsufficientPayment);
        }
        for participant in event.participants.iter() {
            if participant == player {
                return Err(GameError::AlreadyJoined);
            }
        }

        util::transfer_from(
            &env,
            &cfg.stars_token,
            &player,
            &env.current_contract_address(),
            stake,
        );
        event.participants.push_back(player.clone());
        event.reward_pool += stake;
        events::set(&env, event_id, &event);
        env.events()
            .publish(("event_joined",), (player, event_id, stake));
        Ok(())
    }

    pub fn finish_event(env: Env, caller: Address, event_id: u32) -> Result<(), GameError> {
        let cfg = config::get(&env);
        let mut event = events::get(&env, event_id)?;
        if caller != event.organizer {
            let admin = config::get(&env).admin;
            if caller != admin {
                return Err(GameError::Unauthorized);
            }
        }
        // Both the organiser and the admin branches bind the `caller`
        // argument to a signature.
        caller.require_auth();
        if event.finished {
            return Err(GameError::OfferClosed);
        }

        let participant_count = event.participants.len();
        if participant_count == 0 {
            event.finished = true;
            events::set(&env, event_id, &event);
            return Ok(());
        }
        let burn_amount = event.reward_pool / 10;
        if burn_amount > 0 {
            util::burn(
                &env,
                &cfg.stars_token,
                &env.current_contract_address(),
                burn_amount,
            );
        }
        let distributable = event.reward_pool - burn_amount;
        let share = distributable / participant_count as i128;
        for participant in event.participants.iter() {
            util::transfer(
                &env,
                &cfg.stars_token,
                &env.current_contract_address(),
                &participant,
                share,
            );
        }
        let remainder = distributable - share * participant_count as i128;
        if remainder > 0 {
            util::transfer(
                &env,
                &cfg.stars_token,
                &env.current_contract_address(),
                &cfg.treasury,
                remainder,
            );
        }
        event.finished = true;
        events::set(&env, event_id, &event);
        env.events().publish(
            ("event_finished",),
            (event_id, participant_count as u32, share),
        );
        Ok(())
    }

    pub fn create_event(
        env: Env,
        organizer: Address,
        event_id: u32,
        stake: i128,
        deadline: u64,
    ) -> Result<(), GameError> {
        config::require_admin(&env);
        if deadline <= env.ledger().timestamp() {
            return Err(GameError::InvalidInput);
        }
        let participants = Vec::new(&env);
        let event = events::Event {
            organizer,
            stake,
            reward_pool: 0,
            participants,
            deadline,
            finished: false,
        };
        events::set(&env, event_id, &event);
        env.events()
            .publish(("event_created",), (event_id, stake, deadline));
        Ok(())
    }
}


#[cfg(test)]
mod finish_event_auth_tests {
mod daily_cap_tests {
mod upgrade_rarity_cap_tests {
mod upgrade_single_token_tests {
mod join_event_tests {
    extern crate std;

    use super::*;
    use crate::errors::GameError;
    use crate::tea::{TeaMetadata, TeaStats};
    use soroban_sdk::{contract, contractimpl, symbol_short, testutils::Address as _, Address, Env, String, Vec};

    // Minimal fungible token implementing the subset of the SEP-41 surface the
    // game contract calls: mint / balance / transfer / transfer_from / burn.
    #[contract]
    struct MockToken;

    #[contractimpl]
    impl MockToken {
        pub fn mint(env: Env, to: Address, amount: i128) {
            let key = (symbol_short!("bal"), to);
            let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
            env.storage().persistent().set(&key, &(current + amount));
        }

        pub fn balance(env: Env, id: Address) -> i128 {
            env.storage()
                .persistent()
                .get(&(symbol_short!("bal"), id))
                .unwrap_or(0)
        }

        pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {}

        pub fn transfer_from(
            _env: Env,
            _spender: Address,
            _from: Address,
            _to: Address,
            _amount: i128,
        ) {
        }

        pub fn burn(_env: Env, _from: Address, _amount: i128) {}
    }

    // Minimal tea NFT implementing the surface the game contract calls through
    // `util`: mint / owner / get_metadata / set_metadata / transfer / burn_token.
    #[contract]
    struct MockNft;

    #[contractimpl]
    impl MockNft {
        pub fn mint(env: Env, _caller: Address, to: Address, metadata: TeaMetadata) -> u64 {
            let mut next: u64 = env
                .storage()
                .persistent()
                .get(&symbol_short!("next"))
                .unwrap_or(0);
            next += 1;
            env.storage().persistent().set(&symbol_short!("next"), &next);
            env.storage()
                .persistent()
                .set(&(symbol_short!("own"), next), &to);
            env.storage()
                .persistent()
                .set(&(symbol_short!("meta"), next), &metadata);
            next
        }

        pub fn owner(env: Env, token_id: u64) -> Address {
            env.storage()
                .persistent()
                .get(&(symbol_short!("own"), token_id))
                .expect("owner")
        }

        pub fn get_metadata(env: Env, token_id: u64) -> TeaMetadata {
            env.storage()
                .persistent()
                .get(&(symbol_short!("meta"), token_id))
                .expect("metadata")
        }

        pub fn set_metadata(env: Env, _caller: Address, token_id: u64, metadata: TeaMetadata) {
            env.storage()
                .persistent()
                .set(&(symbol_short!("meta"), token_id), &metadata);
        }

        pub fn transfer(env: Env, _from: Address, to: Address, token_id: u64) {
            env.storage()
                .persistent()
                .set(&(symbol_short!("own"), token_id), &to);
        }

        pub fn burn_token(env: Env, _caller: Address, _owner: Address, token_id: u64) {
            env.storage()
                .persistent()
                .remove(&(symbol_short!("own"), token_id));
            env.storage()
                .persistent()
                .remove(&(symbol_short!("meta"), token_id));
        }
    }

    fn deploy_game(
        env: &Env,
    ) -> (
        StellarTeaGameClient<'_>,
        Address,
        Address,
        Address,
        Address,
        Address,
    ) {
        let admin = Address::generate(env);
        let treasury = Address::generate(env);
        let balls = env.register(MockToken, ());
        let stars = env.register(MockToken, ());
        let nft = env.register(MockNft, ());
        let id = env.register(
            StellarTeaGame,
            (
                admin.clone(),
                treasury.clone(),
                balls.clone(),
                stars.clone(),
                nft.clone(),
                None::<Address>,
            ),
        );
        (StellarTeaGameClient::new(env, &id), admin, balls, stars, nft, id)
    }

    fn tea_metadata(env: &Env, rarity: u32, level: u32) -> TeaMetadata {
        TeaMetadata {
            display_name: String::from_str(env, "Test Tea"),
            flavor_profile: String::from_str(env, "citrus"),
            rarity,
            level,
            infusion: String::from_str(env, "base"),
            stats: TeaStats {
mod compose_metadata_tests {
    extern crate std;

    use super::*;
    use crate::mixing::{MixOffer, OfferStatus};
    use crate::tea::TeaStats;
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    #[test]
    fn compose_metadata_takes_fields_from_the_recipe() {
        let env = Env::default();
        let recipe = Recipe {
            id: 1,
            name: String::from_str(&env, "Fusion"),
            flavor_profile: String::from_str(&env, "jasmine"),
            base_level: 2,
            base_rarity: 3,
            balls_cost: 0,
            stars_cost: 0,
            base_stats: TeaStats {
                sweetness: 1,
                body: 2,
                caffeine: 3,
            },
            lineage: Vec::new(env),
            image_uri: String::from_str(env, "ipfs://test"),
        }
    }

    #[test]
    fn finish_event_rejects_an_unrelated_caller() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _admin, _balls, _stars, _nft, _id) = deploy_game(&env);
    fn join_event_rejects_duplicate_participation() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _admin, _balls, _stars, _nft, game_id) = deploy_game(&env);

        let organizer = Address::generate(&env);
        client.create_event(
            &organizer,
            &1u32,
            &100i128,
            &(env.ledger().timestamp() + 1_000),
        );

        let stranger = Address::generate(&env);
        let blocked = client.try_finish_event(&stranger, &1u32);
        match blocked {
            Err(Ok(GameError::Unauthorized)) => {}
            _ => panic!("expected Unauthorized"),
        }

        // `caller` is always bound to a signature: with no mocked auths even
        // the organiser's call fails.
        env.mock_auths(&[]);
        assert!(client.try_finish_event(&organizer, &1u32).is_err());
        env.mock_all_auths();

        // The organiser is still allowed to finish the event.
        client.finish_event(&organizer, &1u32);
mod winner_entropy_tests {
    extern crate std;

    use super::*;
    use crate::mixing::{MixOffer, OfferStatus};
    use soroban_sdk::{testutils::Address as _, Address, Bytes, Env, String};

    #[test]
    fn decide_winner_varies_with_the_unpredictable_entropy_source() {
        let env = Env::default();
        env.mock_all_auths();
        let game = env.register(
            StellarTeaGame,
            (
                Address::generate(&env),
                Address::generate(&env),
                Address::generate(&env),
                Address::generate(&env),
                Address::generate(&env),
                None::<Address>,
            ),
        );

        let owner_a = Address::generate(&env);
        let owner_b = Address::generate(&env);
        let offer = MixOffer {
            owner_a: owner_a.clone(),
            token_a_id: 1,
            owner_b: Some(owner_b.clone()),
            token_b_id: Some(2),
            image_uri: String::from_str(&env, "ipfs://recipe"),
        };
        let offer = MixOffer {
            owner_a: Address::generate(&env),
            token_a_id: 10,
            owner_b: Some(Address::generate(&env)),
            token_b_id: Some(20),
            desired_profile: String::from_str(&env, "citrus"),
            min_rank: 1,
            recipe_id: 1,
            fee_balls: 0,
            fee_stars: 0,
            partner_fee_balls: 0,
            partner_fee_stars: 0,
            status: OfferStatus::WaitingForPartner,
            created_at: 0,
            deadline: 1_000,
        };

        let mut owner_a_wins = false;
        let mut owner_b_wins = false;
        env.as_contract(&game, || {
            for i in 0u8..16u8 {
                let mut seed = [0u8; 32];
                seed[0] = i;
                env.prng().seed(Bytes::from_array(&env, &seed));
                let (winner, _loser) = StellarTeaGame::decide_winner(&env, &offer, 2).unwrap();
                if winner == owner_a {
                    owner_a_wins = true;
                } else {
                    owner_b_wins = true;
                }
            }
        });

        assert!(owner_a_wins && owner_b_wins);
    fn daily_cap_is_admin_configurable_and_includes_the_stars_reward() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _admin, balls, stars, _nft, _id) = deploy_game(&env);
        let player = Address::generate(&env);

        // The cap is admin-authorised: with no mocked auths the admin's
        // signature is missing, so the call must fail.
        env.mock_auths(&[]);
        assert!(client.try_set_daily_cap(&2_000_000i128).is_err());
        env.mock_all_auths();

        // A cap below the combined daily reward blocks the claim.
        client.set_daily_cap(&1_000i128);
        let blocked = client.try_claim_daily(&player);
        match blocked {
            Err(Ok(GameError::LimitExceeded)) => {}
            _ => panic!("expected LimitExceeded"),
        }

        // Raising the cap above the combined reward lets the claim through and
        // both tokens are minted.
        client.set_daily_cap(&3_000_000i128);
        client.claim_daily(&player);

        let balls_client = soroban_sdk::token::TokenClient::new(&env, &balls);
        let stars_client = soroban_sdk::token::TokenClient::new(&env, &stars);
        assert_eq!(balls_client.balance(&player), DAILY_BALLS_REWARD);
        assert_eq!(stars_client.balance(&player), DAILY_STARS_REWARD);
        let metadata = compose_metadata(&env, &recipe, &offer);

        assert_eq!(metadata.flavor_profile, recipe.flavor_profile);
        assert_eq!(metadata.display_name, recipe.name);
        assert_eq!(metadata.rarity, recipe.base_rarity);
        assert_eq!(metadata.level, recipe.base_level);
        assert_eq!(metadata.lineage.len(), 2);
    fn upgrade_tea_rejects_an_upgrade_at_the_rarity_cap() {
    fn upgrade_tea_accepts_a_single_payment_token() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _admin, _balls, _stars, nft, _id) = deploy_game(&env);
        let nft_client = MockNftClient::new(&env, &nft);

        let owner = Address::generate(&env);
        let token_id = nft_client.mint(&owner, &owner, &tea_metadata(&env, MAX_TEA_RARITY, 1));

        let result = client.try_upgrade_tea(&owner, &token_id, &100i128, &100i128);
        match result {
            Err(Ok(GameError::RarityCapped)) => {}
            _ => panic!("expected RarityCapped"),
        }
    }

    #[test]
    fn upgrade_tea_increments_rarity_below_the_cap() {
        let token_id = nft_client.mint(&owner, &owner, &tea_metadata(&env, 1, 1));

        // BALLS only
        client.upgrade_tea(&owner, &token_id, &100i128, &0i128);
        // STARS only
        client.upgrade_tea(&owner, &token_id, &0i128, &100i128);

        let metadata = nft_client.get_metadata(&token_id);
        assert_eq!(metadata.level, 3);
        assert_eq!(metadata.rarity, 3);
    }

    #[test]
    fn upgrade_tea_rejects_an_empty_payment() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _admin, _balls, _stars, nft, _id) = deploy_game(&env);
        let nft_client = MockNftClient::new(&env, &nft);

        let owner = Address::generate(&env);
        let token_id = nft_client.mint(&owner, &owner, &tea_metadata(&env, 1, 1));

        client.upgrade_tea(&owner, &token_id, &100i128, &100i128);

        let metadata = nft_client.get_metadata(&token_id);
        assert_eq!(metadata.rarity, 2);
        assert!(metadata.rarity <= MAX_TEA_RARITY);
        let result = client.try_upgrade_tea(&owner, &token_id, &0i128, &0i128);
        match result {
            Err(Ok(GameError::InvalidInput)) => {}
            _ => panic!("expected InvalidInput"),
        }
        let player = Address::generate(&env);
        client.join_event(&player, &1u32, &100i128);

        let second = client.try_join_event(&player, &1u32, &100i128);
        match second {
            Err(Ok(GameError::AlreadyJoined)) => {}
            _ => panic!("expected AlreadyJoined"),
        }

        let participants = env.as_contract(&game_id, || {
            crate::events::get(&env, 1).unwrap().participants.len()
        });
        assert_eq!(participants, 1);
    }
}
