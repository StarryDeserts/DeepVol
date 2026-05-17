module rangepilot::strategy;

use deepbook_predict::{
    oracle::OracleSVI,
    predict::{Self, Predict},
    predict_manager::PredictManager,
    range_key,
};
use rangepilot::{errors, fees};
use sui::{balance::{Self, Balance}, clock::Clock, coin::{Self, Coin}, event};

public struct STRATEGY has drop {}

public struct AdminCap has key, store {
    id: UID,
}

public struct ProtocolVault<phantom T> has key {
    id: UID,
    balance: Balance<T>,
}

public struct Strategy has key {
    id: UID,
    creator: address,
    oracle_id: ID,
    expiry: u64,
    lower_strike: u64,
    higher_strike: u64,
    default_quantity: u64,
    creator_fee_bps: u64,
    platform_fee_bps: u64,
    metadata_uri: vector<u8>,
    active: bool,
    created_at_ms: u64,
}

public struct ProtocolVaultCreated has copy, drop {
    vault_id: ID,
    admin: address,
}

public struct PlatformFeeDeposited has copy, drop {
    vault_id: ID,
    strategy_id: ID,
    follower: address,
    amount: u64,
    timestamp_ms: u64,
}

public struct PlatformFeesWithdrawn has copy, drop {
    vault_id: ID,
    recipient: address,
    amount: u64,
}

public struct StrategyCreated has copy, drop {
    strategy_id: ID,
    creator: address,
    oracle_id: ID,
    expiry: u64,
    lower_strike: u64,
    higher_strike: u64,
    default_quantity: u64,
    creator_fee_bps: u64,
    platform_fee_bps: u64,
    metadata_uri: vector<u8>,
    created_at_ms: u64,
}

public struct StrategyFollowed has copy, drop {
    strategy_id: ID,
    creator: address,
    follower: address,
    manager_id: ID,
    oracle_id: ID,
    expiry: u64,
    lower_strike: u64,
    higher_strike: u64,
    protocol_vault_id: ID,
    quantity: u64,
    fee_amount: u64,
    creator_fee: u64,
    platform_fee: u64,
    timestamp_ms: u64,
}

public struct StrategyDeactivated has copy, drop {
    strategy_id: ID,
    creator: address,
    timestamp_ms: u64,
}

fun init(_witness: STRATEGY, ctx: &mut TxContext) {
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
}

entry fun create_protocol_vault<T>(
    _admin_cap: &AdminCap,
    ctx: &mut TxContext,
) {
    let vault = ProtocolVault<T> {
        id: object::new(ctx),
        balance: balance::zero<T>(),
    };
    let vault_id = object::id(&vault);

    event::emit(ProtocolVaultCreated {
        vault_id,
        admin: ctx.sender(),
    });

    transfer::share_object(vault);
}

public fun protocol_vault_balance<T>(vault: &ProtocolVault<T>): u64 {
    balance::value(&vault.balance)
}

entry fun withdraw_platform_fees<T>(
    _admin_cap: &AdminCap,
    vault: &mut ProtocolVault<T>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    withdraw_platform_fees_internal(_admin_cap, vault, amount, recipient, ctx);
}

entry fun create_strategy(
    oracle_id: ID,
    expiry: u64,
    lower_strike: u64,
    higher_strike: u64,
    default_quantity: u64,
    creator_fee_bps: u64,
    metadata_uri: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let strategy = new_strategy(
        ctx.sender(),
        oracle_id,
        expiry,
        lower_strike,
        higher_strike,
        default_quantity,
        creator_fee_bps,
        metadata_uri,
        clock.timestamp_ms(),
        ctx,
    );
    let strategy_id = object::id(&strategy);

    event::emit(StrategyCreated {
        strategy_id,
        creator: strategy.creator,
        oracle_id: strategy.oracle_id,
        expiry: strategy.expiry,
        lower_strike: strategy.lower_strike,
        higher_strike: strategy.higher_strike,
        default_quantity: strategy.default_quantity,
        creator_fee_bps: strategy.creator_fee_bps,
        platform_fee_bps: strategy.platform_fee_bps,
        metadata_uri: strategy.metadata_uri,
        created_at_ms: strategy.created_at_ms,
    });

    transfer::share_object(strategy);
}

entry fun deactivate_strategy(
    strategy: &mut Strategy,
    clock: &Clock,
    ctx: &TxContext,
) {
    deactivate(strategy, ctx.sender(), clock.timestamp_ms());
}

entry fun follow_strategy_and_mint<T>(
    strategy: &Strategy,
    predict: &mut Predict,
    manager: &mut PredictManager,
    oracle: &OracleSVI,
    mut fee_coin: Coin<T>,
    protocol_vault: &mut ProtocolVault<T>,
    fee_amount: u64,
    quantity: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(strategy.active, errors::inactive_strategy());
    assert!(quantity > 0, errors::zero_quantity());
    fees::assert_nonzero_fee_amount(fee_amount);
    assert!(coin::value(&fee_coin) >= fee_amount, errors::insufficient_fee());
    fees::assert_valid_creator_fee_bps(strategy.creator_fee_bps);

    let (creator_fee, platform_fee) = fees::split_fee_amounts(fee_amount, strategy.creator_fee_bps);
    let fee_remainder = coin::value(&fee_coin) - creator_fee - platform_fee;

    if (creator_fee > 0) {
        transfer::public_transfer(coin::split(&mut fee_coin, creator_fee, ctx), strategy.creator);
    };

    if (platform_fee > 0) {
        let platform_coin = coin::split(&mut fee_coin, platform_fee, ctx);
        deposit_platform_fee(
            protocol_vault,
            platform_coin,
            object::id(strategy),
            ctx.sender(),
            clock.timestamp_ms(),
        );
    };

    if (fee_remainder > 0) {
        transfer::public_transfer(fee_coin, ctx.sender());
    } else {
        coin::destroy_zero(fee_coin);
    };

    let key = range_key::new(
        strategy.oracle_id,
        strategy.expiry,
        strategy.lower_strike,
        strategy.higher_strike,
    );

    predict::mint_range<T>(
        predict,
        manager,
        oracle,
        key,
        quantity,
        clock,
        ctx,
    );

    event::emit(StrategyFollowed {
        strategy_id: object::id(strategy),
        creator: strategy.creator,
        follower: ctx.sender(),
        manager_id: object::id(manager),
        oracle_id: strategy.oracle_id,
        expiry: strategy.expiry,
        lower_strike: strategy.lower_strike,
        higher_strike: strategy.higher_strike,
        protocol_vault_id: object::id(protocol_vault),
        quantity,
        fee_amount,
        creator_fee,
        platform_fee,
        timestamp_ms: clock.timestamp_ms(),
    });
}

fun new_strategy(
    creator: address,
    oracle_id: ID,
    expiry: u64,
    lower_strike: u64,
    higher_strike: u64,
    default_quantity: u64,
    creator_fee_bps: u64,
    metadata_uri: vector<u8>,
    created_at_ms: u64,
    ctx: &mut TxContext,
): Strategy {
    assert!(default_quantity > 0, errors::zero_quantity());
    assert!(lower_strike < higher_strike, errors::invalid_strike_range());
    assert!(!metadata_uri.is_empty(), errors::empty_metadata_uri());
    fees::assert_valid_creator_fee_bps(creator_fee_bps);

    Strategy {
        id: object::new(ctx),
        creator,
        oracle_id,
        expiry,
        lower_strike,
        higher_strike,
        default_quantity,
        creator_fee_bps,
        platform_fee_bps: fees::platform_fee_bps(),
        metadata_uri,
        active: true,
        created_at_ms,
    }
}

fun withdraw_platform_fees_internal<T>(
    _admin_cap: &AdminCap,
    vault: &mut ProtocolVault<T>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    assert!(balance::value(&vault.balance) >= amount, errors::insufficient_vault_balance());

    let withdrawn = coin::from_balance(balance::split(&mut vault.balance, amount), ctx);
    transfer::public_transfer(withdrawn, recipient);

    event::emit(PlatformFeesWithdrawn {
        vault_id: object::id(vault),
        recipient,
        amount,
    });
}

fun deposit_platform_fee<T>(
    vault: &mut ProtocolVault<T>,
    platform_coin: Coin<T>,
    strategy_id: ID,
    follower: address,
    timestamp_ms: u64,
) {
    let amount = coin::value(&platform_coin);
    balance::join(&mut vault.balance, coin::into_balance(platform_coin));

    event::emit(PlatformFeeDeposited {
        vault_id: object::id(vault),
        strategy_id,
        follower,
        amount,
        timestamp_ms,
    });
}

fun deactivate(strategy: &mut Strategy, sender: address, timestamp_ms: u64) {
    assert!(sender == strategy.creator, errors::unauthorized());

    strategy.active = false;

    event::emit(StrategyDeactivated {
        strategy_id: object::id(strategy),
        creator: strategy.creator,
        timestamp_ms,
    });
}

#[test_only]
public fun new_admin_cap_for_testing(ctx: &mut TxContext): AdminCap {
    AdminCap { id: object::new(ctx) }
}

#[test_only]
public fun destroy_admin_cap_for_testing(admin_cap: AdminCap) {
    let AdminCap { id } = admin_cap;
    id.delete();
}

#[test_only]
public fun new_protocol_vault_for_testing<T>(ctx: &mut TxContext): ProtocolVault<T> {
    ProtocolVault<T> { id: object::new(ctx), balance: balance::zero<T>() }
}

#[test_only]
public fun destroy_protocol_vault_for_testing<T>(vault: ProtocolVault<T>) {
    let ProtocolVault { id, balance } = vault;
    balance::destroy_zero(balance);
    id.delete();
}

#[test_only]
public fun deposit_platform_fee_for_testing<T>(
    vault: &mut ProtocolVault<T>,
    platform_coin: Coin<T>,
    strategy_id: ID,
    follower: address,
    timestamp_ms: u64,
) {
    deposit_platform_fee(vault, platform_coin, strategy_id, follower, timestamp_ms);
}

#[test_only]
public fun withdraw_platform_fees_for_testing<T>(
    admin_cap: &AdminCap,
    vault: &mut ProtocolVault<T>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    withdraw_platform_fees_internal(admin_cap, vault, amount, recipient, ctx);
}

#[test_only]
public fun new_strategy_for_testing(
    creator: address,
    oracle_id: ID,
    expiry: u64,
    lower_strike: u64,
    higher_strike: u64,
    default_quantity: u64,
    creator_fee_bps: u64,
    metadata_uri: vector<u8>,
    created_at_ms: u64,
    ctx: &mut TxContext,
): Strategy {
    new_strategy(
        creator,
        oracle_id,
        expiry,
        lower_strike,
        higher_strike,
        default_quantity,
        creator_fee_bps,
        metadata_uri,
        created_at_ms,
        ctx,
    )
}

#[test_only]
public fun deactivate_for_testing(strategy: &mut Strategy, sender: address, timestamp_ms: u64) {
    deactivate(strategy, sender, timestamp_ms);
}

#[test_only]
public fun destroy_for_testing(strategy: Strategy) {
    let Strategy { id, metadata_uri: _, .. } = strategy;
    id.delete();
}

#[test_only]
public fun creator_for_testing(strategy: &Strategy): address {
    strategy.creator
}

#[test_only]
public fun default_quantity_for_testing(strategy: &Strategy): u64 {
    strategy.default_quantity
}

#[test_only]
public fun active_for_testing(strategy: &Strategy): bool {
    strategy.active
}

#[test_only]
public fun platform_fee_bps_for_testing(strategy: &Strategy): u64 {
    strategy.platform_fee_bps
}

#[test_only]
public fun creator_fee_bps_for_testing(strategy: &Strategy): u64 {
    strategy.creator_fee_bps
}
