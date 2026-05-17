module rangepilot::errors;

const EInactiveStrategy: u64 = 0;
const EZeroQuantity: u64 = 1;
const EFeeBpsTooHigh: u64 = 2;
const EInsufficientFee: u64 = 3;
const EUnauthorized: u64 = 4;
const EZeroFee: u64 = 5;
const EEmptyMetadataUri: u64 = 6;
const EInvalidStrikeRange: u64 = 7;
const EInsufficientVaultBalance: u64 = 8;

public fun inactive_strategy(): u64 {
    EInactiveStrategy
}

public fun zero_quantity(): u64 {
    EZeroQuantity
}

public fun fee_bps_too_high(): u64 {
    EFeeBpsTooHigh
}

public fun insufficient_fee(): u64 {
    EInsufficientFee
}

public fun unauthorized(): u64 {
    EUnauthorized
}

public fun zero_fee(): u64 {
    EZeroFee
}

public fun empty_metadata_uri(): u64 {
    EEmptyMetadataUri
}

public fun invalid_strike_range(): u64 {
    EInvalidStrikeRange
}

public fun insufficient_vault_balance(): u64 {
    EInsufficientVaultBalance
}
