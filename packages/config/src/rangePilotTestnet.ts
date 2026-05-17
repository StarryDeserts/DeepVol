import type { RangePilotStrategyConfig } from "@rangepilot/types/rangePilotStrategy";

export const RANGEPILOT_WRAPPER_PACKAGE_ID = null;
export const RANGEPILOT_PROTOCOL_VAULT_ID = null;
export const RANGEPILOT_ADMIN_CAP_ID = null;

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
