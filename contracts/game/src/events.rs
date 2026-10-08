use soroban_sdk::{contracttype, Address, Env, Vec};

use crate::errors::GameError;

#[derive(Clone)]
#[contracttype]
pub struct Event {
    pub organizer: Address,
    pub stake: i128,
    pub reward_pool: i128,
    pub participants: Vec<Address>,
    pub deadline: u64,
    pub finished: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Event(u32),
}

pub fn get(env: &Env, event_id: u32) -> Result<Event, GameError> {
    env.storage()
        .persistent()
        .get::<DataKey, Event>(&DataKey::Event(event_id))
        .ok_or(GameError::OfferNotFound)
}

pub fn set(env: &Env, event_id: u32, event: &Event) {
    env.storage()
        .persistent()
        .set(&DataKey::Event(event_id), event);
}

pub fn ensure_active(event: &Event, env: &Env) -> Result<(), GameError> {
    if event.finished {
        return Err(GameError::OfferClosed);
    }
    if env.ledger().timestamp() > event.deadline {
        return Err(GameError::Expired);
    }
    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, Vec};

    /// Helper: build a live event (not finished, deadline in the future).
    fn live_event(env: &Env, organizer: &Address) -> Event {
        Event {
            organizer: organizer.clone(),
            stake: 100,
            reward_pool: 1_000,
            participants: Vec::new(env),
            deadline: env.ledger().timestamp() + 1_000,
            finished: false,
        }
    }

    /// Helper: build a finished event.
    fn finished_event(env: &Env, organizer: &Address) -> Event {
        Event {
            organizer: organizer.clone(),
            stake: 100,
            reward_pool: 1_000,
            participants: Vec::new(env),
            deadline: env.ledger().timestamp() + 1_000,
            finished: true,
        }
    }

    /// Helper: build an event whose deadline is exactly the current ledger timestamp.
    fn expired_at_deadline_event(env: &Env, organizer: &Address) -> Event {
        Event {
            organizer: organizer.clone(),
            stake: 100,
            reward_pool: 1_000,
            participants: Vec::new(env),
            deadline: env.ledger().timestamp(),
            finished: false,
        }
    }

    // -----------------------------------------------------------------------
    // ensure_active
    // -----------------------------------------------------------------------

    #[test]
    fn ensure_active_passes_for_a_live_event() {
        let env = Env::default();
        let organizer = Address::generate(&env);
        let event = live_event(&env, &organizer);
        // deadline is timestamp + 1_000, current timestamp is below deadline,
        // and finished is false — both guards should pass.
        assert!(ensure_active(&event, &env).is_ok());
    }

    #[test]
    fn ensure_active_fails_with_offer_closed_when_finished_is_true() {
        // The bounty spec: "ensure_active returns Err(GameError::OfferClosed) for a finished event."
        // Note the reuse: this is the OfferClosed variant, not an EventClosed variant —
        // the events module reuses GameError's offer-oriented errors.
        let env = Env::default();
        let organizer = Address::generate(&env);
        let event = finished_event(&env, &organizer);
        let result = ensure_active(&event, &env);
        assert_eq!(result, Err(GameError::OfferClosed));
    }

    #[test]
    fn ensure_active_fails_with_expired_when_timestamp_equals_deadline() {
        // The bounty spec: "ensure_active returns Err(GameError::Expired) when the timestamp equals deadline."
        // Note the boundary: the check is `timestamp > deadline`, so timestamp == deadline
        // is the FIRST timestamp that triggers Expired. The previous test `live_event`
        // sets deadline to timestamp + 1_000 and passes; here we set deadline to the
        // current timestamp and assert Expired is returned.
        let env = Env::default();
        let organizer = Address::generate(&env);
        let event = expired_at_deadline_event(&env, &organizer);
        let result = ensure_active(&event, &env);
        assert_eq!(result, Err(GameError::Expired));
    }

    #[test]
    fn ensure_active_checks_finished_before_deadline() {
        // Order matters: a finished event past its deadline should return OfferClosed
        // (the finished check comes first in the source), not Expired.
        let env = Env::default();
        let organizer = Address::generate(&env);
        // finished AND past deadline
        let event = Event {
            organizer: organizer.clone(),
            stake: 100,
            reward_pool: 1_000,
            participants: Vec::new(&env),
            deadline: 0, // long past
            finished: true,
        };
        let result = ensure_active(&event, &env);
        assert_eq!(result, Err(GameError::OfferClosed));
    }

    // -----------------------------------------------------------------------
    // get / set round-trip
    // -----------------------------------------------------------------------

    #[test]
    fn get_for_an_unset_event_id_returns_offer_not_found() {
        // The bounty spec: "get for an unset event_id returns Err(GameError::OfferNotFound)."
        // Note the reuse: events module returns GameError::OfferNotFound (an offer-oriented
        // error variant) for a missing event — a future cleanup should add a dedicated
        // EventNotFound variant, but this test pins the current contract.
        let env = Env::default();
        let result = get(&env, 42);
        assert_eq!(result, Err(GameError::OfferNotFound));
    }

    #[test]
    fn set_then_get_round_trips_the_participants_vector() {
        let env = Env::default();
        let organizer = Address::generate(&env);
        let p1 = Address::generate(&env);
        let p2 = Address::generate(&env);
        let p3 = Address::generate(&env);

        let mut participants = Vec::new(&env);
        participants.push_back(p1.clone());
        participants.push_back(p2.clone());
        participants.push_back(p3.clone());

        let event = Event {
            organizer: organizer.clone(),
            stake: 250,
            reward_pool: 2_500,
            participants: participants.clone(),
            deadline: env.ledger().timestamp() + 5_000,
            finished: false,
        };

        // Set, then immediately get and assert every field round-trips.
        set(&env, 7, &event);
        let fetched = get(&env, 7).expect("event should be retrievable after set");

        assert_eq!(fetched.organizer, event.organizer);
        assert_eq!(fetched.stake, event.stake);
        assert_eq!(fetched.reward_pool, event.reward_pool);
        assert_eq!(fetched.deadline, event.deadline);
        assert_eq!(fetched.finished, event.finished);
        // participants vector should round-trip element-for-element
        assert_eq!(fetched.participants.len(), 3);
        assert_eq!(fetched.participants.get(0).unwrap(), p1);
        assert_eq!(fetched.participants.get(1).unwrap(), p2);
        assert_eq!(fetched.participants.get(2).unwrap(), p3);
    }

    #[test]
    fn set_overwrites_a_previous_value_for_the_same_event_id() {
        let env = Env::default();
        let organizer = Address::generate(&env);

        let first = live_event(&env, &organizer);
        set(&env, 99, &first);
        assert_eq!(get(&env, 99).unwrap().stake, 100);

        // Overwrite with a different stake
        let second = Event {
            organizer: organizer.clone(),
            stake: 999,
            reward_pool: first.reward_pool,
            participants: first.participants.clone(),
            deadline: first.deadline,
            finished: first.finished,
        };
        set(&env, 99, &second);
        assert_eq!(get(&env, 99).unwrap().stake, 999);
    }
}
