#[test_only]
module rangepilot::strategy_tests;

use rangepilot::{fees, strategy};
use std::unit_test::assert_eq;
use sui::{coin::mint_for_testing, sui::SUI};

const CREATOR: address = @0xA;
const FOLLOWER: address = @0xB;
const RECIPIENT: address = @0xC;
const ORACLE: address = @0xD;
const STRATEGY_ID: address = @0xE;
const EXPIRY: u64 = 1_778_918_400_000;
const LOWER_STRIKE: u64 = 77_871_000_000_000;
const HIGHER_STRIKE: u64 = 78_371_000_000_000;
const DEFAULT_QUANTITY: u64 = 1_000;
const CREATOR_FEE_BPS: u64 = 250;
const CREATED_AT_MS: u64 = 1_000;
const DEACTIVATED_AT_MS: u64 = 2_000;

#[test]
fun split_fee_amounts_uses_fixed_platform_bps() {
    let (creator_fee, platform_fee) = fees::split_fee_amounts(1_000_000, CREATOR_FEE_BPS);

    assert_eq!(creator_fee, 25_000);
    assert_eq!(platform_fee, 1_000);
}

#[test]
fun platform_fee_policy_is_10_bps() {
    assert_eq!(fees::platform_fee_bps(), 10);
}

#[test]
fun creator_fee_bps_accepts_max_3000() {
    fees::assert_valid_creator_fee_bps(3_000);

    assert_eq!(fees::max_creator_fee_bps(), 3_000);
}

#[test, expected_failure(abort_code = 2, location = rangepilot::fees)]
fun creator_fee_bps_rejects_3001() {
    fees::assert_valid_creator_fee_bps(3_001);
    abort 999
}

#[test]
fun nonzero_fee_amount_accepts_positive_fee() {
    fees::assert_nonzero_fee_amount(1);

    assert!(true);
}

#[test, expected_failure(abort_code = 5, location = rangepilot::fees)]
fun nonzero_fee_amount_rejects_zero_fee() {
    fees::assert_nonzero_fee_amount(0);
    abort 999
}

#[test]
fun new_strategy_stores_expected_fields() {
    let mut ctx = tx_context::dummy();
    let strategy = strategy::new_strategy_for_testing(
        CREATOR,
        object::id_from_address(ORACLE),
        EXPIRY,
        LOWER_STRIKE,
        HIGHER_STRIKE,
        DEFAULT_QUANTITY,
        CREATOR_FEE_BPS,
        b"ipfs://strategy",
        CREATED_AT_MS,
        &mut ctx,
    );

    assert_eq!(strategy::creator_for_testing(&strategy), CREATOR);
    assert_eq!(strategy::default_quantity_for_testing(&strategy), DEFAULT_QUANTITY);
    assert_eq!(strategy::creator_fee_bps_for_testing(&strategy), CREATOR_FEE_BPS);
    assert_eq!(strategy::platform_fee_bps_for_testing(&strategy), 10);
    assert!(strategy::active_for_testing(&strategy));

    strategy::destroy_for_testing(strategy);
}

#[test, expected_failure(abort_code = 1, location = rangepilot::strategy)]
fun new_strategy_rejects_zero_default_quantity() {
    let mut ctx = tx_context::dummy();
    let strategy = strategy::new_strategy_for_testing(
        CREATOR,
        object::id_from_address(ORACLE),
        EXPIRY,
        LOWER_STRIKE,
        HIGHER_STRIKE,
        0,
        CREATOR_FEE_BPS,
        b"ipfs://strategy",
        CREATED_AT_MS,
        &mut ctx,
    );
    strategy::destroy_for_testing(strategy);
    abort 999
}

#[test, expected_failure(abort_code = 6, location = rangepilot::strategy)]
fun new_strategy_rejects_empty_metadata_uri() {
    let mut ctx = tx_context::dummy();
    let strategy = strategy::new_strategy_for_testing(
        CREATOR,
        object::id_from_address(ORACLE),
        EXPIRY,
        LOWER_STRIKE,
        HIGHER_STRIKE,
        DEFAULT_QUANTITY,
        CREATOR_FEE_BPS,
        vector[],
        CREATED_AT_MS,
        &mut ctx,
    );
    strategy::destroy_for_testing(strategy);
    abort 999
}

#[test, expected_failure(abort_code = 7, location = rangepilot::strategy)]
fun new_strategy_rejects_invalid_strike_range_equal_bounds() {
    let mut ctx = tx_context::dummy();
    let strategy = strategy::new_strategy_for_testing(
        CREATOR,
        object::id_from_address(ORACLE),
        EXPIRY,
        LOWER_STRIKE,
        LOWER_STRIKE,
        DEFAULT_QUANTITY,
        CREATOR_FEE_BPS,
        b"ipfs://strategy",
        CREATED_AT_MS,
        &mut ctx,
    );
    strategy::destroy_for_testing(strategy);
    abort 999
}

#[test, expected_failure(abort_code = 7, location = rangepilot::strategy)]
fun new_strategy_rejects_invalid_strike_range_reversed_bounds() {
    let mut ctx = tx_context::dummy();
    let strategy = strategy::new_strategy_for_testing(
        CREATOR,
        object::id_from_address(ORACLE),
        EXPIRY,
        HIGHER_STRIKE,
        LOWER_STRIKE,
        DEFAULT_QUANTITY,
        CREATOR_FEE_BPS,
        b"ipfs://strategy",
        CREATED_AT_MS,
        &mut ctx,
    );
    strategy::destroy_for_testing(strategy);
    abort 999
}

#[test, expected_failure(abort_code = 2, location = rangepilot::fees)]
fun new_strategy_rejects_creator_fee_bps_above_max() {
    let mut ctx = tx_context::dummy();
    let strategy = strategy::new_strategy_for_testing(
        CREATOR,
        object::id_from_address(ORACLE),
        EXPIRY,
        LOWER_STRIKE,
        HIGHER_STRIKE,
        DEFAULT_QUANTITY,
        3_001,
        b"ipfs://strategy",
        CREATED_AT_MS,
        &mut ctx,
    );
    strategy::destroy_for_testing(strategy);
    abort 999
}

#[test]
fun deactivate_strategy_sets_inactive_for_creator() {
    let mut ctx = tx_context::dummy();
    let mut strategy = strategy::new_strategy_for_testing(
        CREATOR,
        object::id_from_address(ORACLE),
        EXPIRY,
        LOWER_STRIKE,
        HIGHER_STRIKE,
        DEFAULT_QUANTITY,
        CREATOR_FEE_BPS,
        b"ipfs://strategy",
        CREATED_AT_MS,
        &mut ctx,
    );

    strategy::deactivate_for_testing(&mut strategy, CREATOR, DEACTIVATED_AT_MS);

    assert!(!strategy::active_for_testing(&strategy));

    strategy::destroy_for_testing(strategy);
}

#[test, expected_failure(abort_code = 4, location = rangepilot::strategy)]
fun deactivate_strategy_rejects_non_creator() {
    let mut ctx = tx_context::dummy();
    let mut strategy = strategy::new_strategy_for_testing(
        CREATOR,
        object::id_from_address(ORACLE),
        EXPIRY,
        LOWER_STRIKE,
        HIGHER_STRIKE,
        DEFAULT_QUANTITY,
        CREATOR_FEE_BPS,
        b"ipfs://strategy",
        CREATED_AT_MS,
        &mut ctx,
    );

    strategy::deactivate_for_testing(&mut strategy, FOLLOWER, DEACTIVATED_AT_MS);

    strategy::destroy_for_testing(strategy);
    abort 999
}

#[test]
fun protocol_vault_starts_empty() {
    let mut ctx = tx_context::dummy();
    let vault = strategy::new_protocol_vault_for_testing<SUI>(&mut ctx);

    assert_eq!(strategy::protocol_vault_balance(&vault), 0);

    strategy::destroy_protocol_vault_for_testing(vault);
}

#[test]
fun platform_fee_deposit_increases_protocol_vault_balance() {
    let mut ctx = tx_context::dummy();
    let admin_cap = strategy::new_admin_cap_for_testing(&mut ctx);
    let mut vault = strategy::new_protocol_vault_for_testing<SUI>(&mut ctx);

    strategy::deposit_platform_fee_for_testing(
        &mut vault,
        mint_for_testing<SUI>(1_000, &mut ctx),
        object::id_from_address(STRATEGY_ID),
        FOLLOWER,
        CREATED_AT_MS,
    );

    assert_eq!(strategy::protocol_vault_balance(&vault), 1_000);

    strategy::withdraw_platform_fees_for_testing(&admin_cap, &mut vault, 1_000, RECIPIENT, &mut ctx);
    strategy::destroy_protocol_vault_for_testing(vault);
    strategy::destroy_admin_cap_for_testing(admin_cap);
}

#[test]
fun withdraw_platform_fees_with_admin_cap_decreases_vault_balance() {
    let mut ctx = tx_context::dummy();
    let admin_cap = strategy::new_admin_cap_for_testing(&mut ctx);
    let mut vault = strategy::new_protocol_vault_for_testing<SUI>(&mut ctx);

    strategy::deposit_platform_fee_for_testing(
        &mut vault,
        mint_for_testing<SUI>(1_000, &mut ctx),
        object::id_from_address(STRATEGY_ID),
        FOLLOWER,
        CREATED_AT_MS,
    );

    strategy::withdraw_platform_fees_for_testing(&admin_cap, &mut vault, 400, RECIPIENT, &mut ctx);

    assert_eq!(strategy::protocol_vault_balance(&vault), 600);

    strategy::withdraw_platform_fees_for_testing(&admin_cap, &mut vault, 600, RECIPIENT, &mut ctx);
    strategy::destroy_protocol_vault_for_testing(vault);
    strategy::destroy_admin_cap_for_testing(admin_cap);
}

#[test, expected_failure(abort_code = 8, location = rangepilot::strategy)]
fun withdraw_platform_fees_rejects_overdraw() {
    let mut ctx = tx_context::dummy();
    let admin_cap = strategy::new_admin_cap_for_testing(&mut ctx);
    let mut vault = strategy::new_protocol_vault_for_testing<SUI>(&mut ctx);

    strategy::deposit_platform_fee_for_testing(
        &mut vault,
        mint_for_testing<SUI>(100, &mut ctx),
        object::id_from_address(STRATEGY_ID),
        FOLLOWER,
        CREATED_AT_MS,
    );
    strategy::withdraw_platform_fees_for_testing(&admin_cap, &mut vault, 101, RECIPIENT, &mut ctx);

    abort 999
}
