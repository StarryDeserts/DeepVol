import type { RangePilotStrategyConfig } from "@deepvol/types/rangePilotStrategy";

export const RANGEPILOT_WRAPPER_PACKAGE_ID =
  "0xe0b877a06541d184b8c3bec46b81ccca2de38495979c25a658f98923407bf697";
export const RANGEPILOT_PROTOCOL_VAULT_ID =
  "0x9430cc42b879c8f70a855230aecf7042e3efcadb41924cb6ff6c66c8e167d992";
export const RANGEPILOT_ADMIN_CAP_ID =
  "0xbd825bd9f0ea1846314a02977430e691054e56752d8cf30b483cf211fec880f7";

export const RANGEPILOT_TESTNET = {
  network: "testnet",
  packageId: RANGEPILOT_WRAPPER_PACKAGE_ID,
  wrapperPackageId: RANGEPILOT_WRAPPER_PACKAGE_ID,
  moduleName: "strategy",
  protocolVaultId: RANGEPILOT_PROTOCOL_VAULT_ID,
  adminCapId: RANGEPILOT_ADMIN_CAP_ID,
  defaultPlatformFeeBps: 10,
  maxCreatorFeeBps: 3000,
  metadataPolicy: "uri",
} as const satisfies RangePilotStrategyConfig;

export const RANGEPILOT_STRATEGY_TESTNET = RANGEPILOT_TESTNET;
