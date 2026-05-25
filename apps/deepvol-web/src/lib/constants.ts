export const CONFIGURED_BTC_MOVE_SERIES_ID = "0x57878763c144cabe06c86d7e02f168d6b42481d779434d8efc8146a10c1ba885";
export const VALIDATED_REFERENCE_RECEIPT_ID = "0x6eac478ef6300281093a2301a52b4ee7b272d6b1a76be9e16e63fa43171f6a0f";
export const VALIDATED_REFERENCE_BUY_DIGEST = "GVyMBH9kB6nTSuWoULFZ5ir3yhFnRC8LNoRz9EEDQXbd";
export const CONTROLLED_REDEEM_RECEIPT_ID = "0xbbc2d18447502830a96602b8f9611e834c509d6fa00abdf2061ecd1addaa35eb";
export const CONTROLLED_REDEEM_BUY_DIGEST = "A6YB62BqMmWsQeEZUoh4qYAA6n4RMqnih5TtHRdadfGn";
export const CONTROLLED_REDEEM_OWNER = "0x60ce00b02feafce805f1c3c8a7beaf7db8e903d73610fb232ad928d31fcd9349";
export const CONTROLLED_REDEEM_PREDICT_MANAGER_ID = "0xffc0629e53bc703b60d5b135b2def3f6919bb08b5b41c137b5c8563739d6216a";
export const CONTROLLED_REDEEM_ORACLE_ID = "0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22";
export const CONTROLLED_REDEEM_EXPIRY = "1779436800000";
export const CONTROLLED_REDEEM_UP_STRIKE = "76796000000000";
export const CONTROLLED_REDEEM_DOWN_STRIKE = "76696000000000";
export const CONTROLLED_REDEEM_QUANTITY = "10000";
export const DEFAULT_MOVE_QUANTITY = "10000";
export const DUSDC_DECIMALS = 6;
export const TESTNET_CHAIN = "sui:testnet";

export const DEEPVOL_STORAGE_KEYS = {
  predictManager: "deepvol:predict-manager",
  receipts: "deepvol:move-receipts",
  primitiveTrades: "deepvol:primitive-trades",
  recentTransactions: "deepvol:recent-transactions",
  redeemAttempts: "deepvol:controlled-redeem-attempts",
  createdSeries: "deepvol:created-series",
  moveSeriesMintability: "deepvol:move-series-mintability",
} as const;
