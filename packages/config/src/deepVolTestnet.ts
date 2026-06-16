import type { DeepVolTestnetConfig } from "@deepvol/types/deepVol";

export const DEEPVOL_PACKAGE_ID =
  "0xe9b45e8d06406bb935bf5e3260ac9b82491ca158775861660be34881e17a4fa0";
export const DEEPVOL_PROTOCOL_VAULT_ID =
  "0x1b9174645d70ac4caa2cfa0db5df59ac78a3ce0d3cca10f8be37e4c5d84f1a09";
export const DEEPVOL_ADMIN_CAP_ID =
  "0xa0f062e01af265137324eb26489de788fee443e49376725bed84a877c99318b1";
export const DEEPVOL_UPGRADE_CAP_ID =
  "0x2b5224c317e2d517bbc7abb47740cce86234399e818077ac50e63e79b0298fc4";
export const DEEPVOL_PUBLISHER_ADDRESS =
  "0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75";

export const DEEPVOL_TESTNET = {
  network: "testnet",
  packageId: DEEPVOL_PACKAGE_ID,
  protocolVaultId: DEEPVOL_PROTOCOL_VAULT_ID,
  adminCapId: DEEPVOL_ADMIN_CAP_ID,
  upgradeCapId: DEEPVOL_UPGRADE_CAP_ID,
  publisher: DEEPVOL_PUBLISHER_ADDRESS,
  defaultCreateFeeBps: 30,
  maxCreateFeeBps: 100,
  primaryMarket: "BTC",
  receiptCustody: "non_custodial",
} as const satisfies DeepVolTestnetConfig;
