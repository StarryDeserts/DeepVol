module rangepilot::fees;

use rangepilot::errors;

const BPS_DENOMINATOR: u64 = 10_000;
const MAX_TOTAL_FEE_BPS: u64 = 10_000;
const MAX_CREATOR_FEE_BPS: u64 = 3_000;
const PLATFORM_FEE_BPS: u64 = 10;

public fun assert_valid_creator_fee_bps(creator_fee_bps: u64) {
    assert!(creator_fee_bps <= MAX_CREATOR_FEE_BPS, errors::fee_bps_too_high());
    assert!(creator_fee_bps + PLATFORM_FEE_BPS <= MAX_TOTAL_FEE_BPS, errors::fee_bps_too_high());
}

public fun assert_nonzero_fee_amount(fee_amount: u64) {
    assert!(fee_amount > 0, errors::zero_fee());
}

public fun platform_fee_bps(): u64 {
    PLATFORM_FEE_BPS
}

public fun max_creator_fee_bps(): u64 {
    MAX_CREATOR_FEE_BPS
}

public fun split_fee_amounts(
    fee_amount: u64,
    creator_fee_bps: u64,
): (u64, u64) {
    assert_valid_creator_fee_bps(creator_fee_bps);

    let creator_fee = fee_amount * creator_fee_bps / BPS_DENOMINATOR;
    let platform_fee = fee_amount * PLATFORM_FEE_BPS / BPS_DENOMINATOR;

    (creator_fee, platform_fee)
}
