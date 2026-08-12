use super::*;

use soroban_sdk::{
    testutils::{storage::Persistent as _, Address as _, Events as _},
    Address, Env, Event,
};

fn setup() -> (Env, Address, MiniWalletContractClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(MiniWalletContract, ());
    let client = MiniWalletContractClient::new(&env, &contract_id);
    (env, contract_id, client)
}

#[test]
fn ping_and_initial_balance_work() {
    let (env, _, client) = setup();
    let alice = Address::generate(&env);

    assert_eq!(client.ping(), 1);
    assert_eq!(client.get_balance(&alice), 0);
}

#[test]
fn deposit_happy_path_and_invalid_amounts() {
    let (env, _, client) = setup();
    env.mock_all_auths();
    let alice = Address::generate(&env);

    assert_eq!(client.deposit(&alice, &1_000), 1_000);
    assert_eq!(client.get_balance(&alice), 1_000);
    assert_eq!(
        client.try_deposit(&alice, &0),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        client.try_deposit(&alice, &-1),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(client.get_balance(&alice), 1_000);
}

#[test]
fn deposit_detects_overflow_and_rolls_back() {
    let (env, _, client) = setup();
    env.mock_all_auths();
    let alice = Address::generate(&env);

    assert_eq!(client.deposit(&alice, &i128::MAX), i128::MAX);
    assert_eq!(client.try_deposit(&alice, &1), Err(Ok(Error::Overflow)));
    assert_eq!(client.get_balance(&alice), i128::MAX);
    assert_eq!(env.events().all().events().len(), 0);
}

#[test]
fn withdraw_happy_path_and_negative_cases() {
    let (env, _, client) = setup();
    env.mock_all_auths();
    let alice = Address::generate(&env);

    assert_eq!(client.deposit(&alice, &1_000), 1_000);
    assert_eq!(client.withdraw(&alice, &200), 800);
    assert_eq!(client.get_balance(&alice), 800);
    assert_eq!(
        client.try_withdraw(&alice, &801),
        Err(Ok(Error::InsufficientBalance))
    );
    assert_eq!(
        client.try_withdraw(&alice, &0),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        client.try_withdraw(&alice, &-1),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(client.get_balance(&alice), 800);
}

#[test]
fn withdrawing_everything_removes_the_balance_entry() {
    let (env, contract_id, client) = setup();
    env.mock_all_auths();
    let alice = Address::generate(&env);

    assert_eq!(client.deposit(&alice, &100), 100);
    assert_eq!(client.withdraw(&alice, &100), 0);
    assert_eq!(client.get_balance(&alice), 0);

    env.as_contract(&contract_id, || {
        assert!(!env
            .storage()
            .persistent()
            .has(&DataKey::Balance(alice.clone())));
    });
}

#[test]
fn transfer_happy_path_and_negative_cases() {
    let (env, _, client) = setup();
    env.mock_all_auths();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    assert_eq!(client.deposit(&alice, &1_000), 1_000);
    assert_eq!(client.transfer(&alice, &bob, &250), 750);
    assert_eq!(client.get_balance(&alice), 750);
    assert_eq!(client.get_balance(&bob), 250);
    assert_eq!(
        client.try_transfer(&alice, &alice, &1),
        Err(Ok(Error::SameAddress))
    );
    assert_eq!(
        client.try_transfer(&alice, &bob, &751),
        Err(Ok(Error::InsufficientBalance))
    );
    assert_eq!(
        client.try_transfer(&alice, &bob, &0),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(client.get_balance(&alice), 750);
    assert_eq!(client.get_balance(&bob), 250);
}

#[test]
fn transfer_detects_recipient_overflow() {
    let (env, _, client) = setup();
    env.mock_all_auths();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    assert_eq!(client.deposit(&alice, &1), 1);
    assert_eq!(client.deposit(&bob, &i128::MAX), i128::MAX);

    assert_eq!(
        client.try_transfer(&alice, &bob, &1),
        Err(Ok(Error::Overflow))
    );
    assert_eq!(client.get_balance(&alice), 1);
    assert_eq!(client.get_balance(&bob), i128::MAX);
}

#[test]
fn writes_require_the_expected_authorization() {
    let (env, _, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    assert!(client.try_deposit(&alice, &100).is_err());
    assert_eq!(client.get_balance(&alice), 0);

    env.mock_all_auths();
    assert_eq!(client.deposit(&alice, &100), 100);
    assert_eq!(env.auths().len(), 1);
    assert_eq!(env.auths()[0].0, alice);

    assert_eq!(client.transfer(&alice, &bob, &40), 60);
    assert_eq!(env.auths().len(), 1);
    assert_eq!(env.auths()[0].0, alice);
}

#[test]
fn successful_writes_publish_events() {
    let (env, contract_id, client) = setup();
    env.mock_all_auths();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.deposit(&alice, &1_000);
    assert_eq!(
        env.events().all().events(),
        &[Deposit {
            user: alice.clone(),
            amount: 1_000,
        }
        .to_xdr(&env, &contract_id)]
    );

    client.transfer(&alice, &bob, &250);
    assert_eq!(
        env.events().all().events(),
        &[Transfer {
            from: alice.clone(),
            to: bob.clone(),
            amount: 250,
        }
        .to_xdr(&env, &contract_id)]
    );

    client.withdraw(&bob, &100);
    assert_eq!(
        env.events().all().events(),
        &[Withdraw {
            user: bob,
            amount: 100,
        }
        .to_xdr(&env, &contract_id)]
    );
}

#[test]
fn active_balance_entries_receive_a_ttl() {
    let (env, contract_id, client) = setup();
    env.mock_all_auths();
    let alice = Address::generate(&env);

    client.deposit(&alice, &100);

    env.as_contract(&contract_id, || {
        let ttl = env
            .storage()
            .persistent()
            .get_ttl(&DataKey::Balance(alice.clone()));
        assert!(ttl >= BALANCE_LIFETIME_THRESHOLD);
    });
}
