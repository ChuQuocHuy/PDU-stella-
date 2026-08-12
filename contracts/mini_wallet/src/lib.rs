#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const BALANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const BALANCE_LIFETIME_THRESHOLD: u32 = BALANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Balance(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    InsufficientBalance = 2,
    SameAddress = 3,
    Overflow = 4,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Deposit {
    #[topic]
    pub user: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Withdraw {
    #[topic]
    pub user: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Transfer {
    #[topic]
    pub from: Address,
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contract]
pub struct MiniWalletContract;

fn balance_key(user: &Address) -> DataKey {
    DataKey::Balance(user.clone())
}

fn read_balance(env: &Env, user: &Address) -> i128 {
    let key = balance_key(user);

    if let Some(balance) = env.storage().persistent().get::<_, i128>(&key) {
        env.storage().persistent().extend_ttl(
            &key,
            BALANCE_LIFETIME_THRESHOLD,
            BALANCE_BUMP_AMOUNT,
        );
        balance
    } else {
        0
    }
}

fn write_balance(env: &Env, user: &Address, balance: i128) {
    let key = balance_key(user);

    if balance == 0 {
        env.storage().persistent().remove(&key);
        return;
    }

    env.storage().persistent().set(&key, &balance);
    env.storage()
        .persistent()
        .extend_ttl(&key, BALANCE_LIFETIME_THRESHOLD, BALANCE_BUMP_AMOUNT);
}

fn validate_amount(amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    Ok(())
}

#[contractimpl]
impl MiniWalletContract {
    pub fn ping(_env: Env) -> u32 {
        1
    }

    pub fn get_balance(env: Env, user: Address) -> i128 {
        read_balance(&env, &user)
    }

    pub fn deposit(env: Env, user: Address, amount: i128) -> Result<i128, Error> {
        user.require_auth();
        validate_amount(amount)?;

        let current_balance = read_balance(&env, &user);
        let new_balance = current_balance.checked_add(amount).ok_or(Error::Overflow)?;

        write_balance(&env, &user, new_balance);
        Deposit { user, amount }.publish(&env);

        Ok(new_balance)
    }

    pub fn withdraw(env: Env, user: Address, amount: i128) -> Result<i128, Error> {
        user.require_auth();
        validate_amount(amount)?;

        let current_balance = read_balance(&env, &user);
        if current_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let new_balance = current_balance - amount;
        write_balance(&env, &user, new_balance);
        Withdraw { user, amount }.publish(&env);

        Ok(new_balance)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<i128, Error> {
        from.require_auth();
        validate_amount(amount)?;

        if from == to {
            return Err(Error::SameAddress);
        }

        let from_balance = read_balance(&env, &from);
        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let to_balance = read_balance(&env, &to);
        let new_to_balance = to_balance.checked_add(amount).ok_or(Error::Overflow)?;
        let new_from_balance = from_balance - amount;

        write_balance(&env, &from, new_from_balance);
        write_balance(&env, &to, new_to_balance);
        Transfer { from, to, amount }.publish(&env);

        Ok(new_from_balance)
    }
}

#[cfg(test)]
mod test;
