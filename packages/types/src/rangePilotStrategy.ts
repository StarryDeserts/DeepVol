import type {
  DeepBookPredictCoinType,
  DeepBookPredictNetwork,
  DeepBookPredictObjectId,
} from "./deepbookPredict.ts";

export type StrategyObjectId = DeepBookPredictObjectId;
export type ProtocolVaultObjectId = DeepBookPredictObjectId;
export type AdminCapObjectId = DeepBookPredictObjectId;

export type RangePilotStrategyRangeKey = {
  oracleId: DeepBookPredictObjectId;
  expiry: string;
  lowerStrike: string;
  higherStrike: string;
};

export type RangePilotStrategyConfig = {
  network: DeepBookPredictNetwork;
  wrapperPackageId: DeepBookPredictObjectId | null;
  packageId: DeepBookPredictObjectId | null;
  moduleName: "strategy";
  protocolVaultId: ProtocolVaultObjectId | null;
  adminCapId: AdminCapObjectId | null;
  defaultPlatformFeeBps: 10;
  maxCreatorFeeBps: 3000;
  metadataPolicy: "uri";
};

export type RangePilotWrapperConfig = RangePilotStrategyConfig;

export type RangePilotStrategy = RangePilotStrategyRangeKey & {
  strategyId: DeepBookPredictObjectId;
  creator: string;
  defaultQuantity: string;
  creatorFeeBps: number;
  platformFeeBps: 10;
  metadataUri: string;
  active: boolean;
  createdAtMs: string;
};

export type StrategyCreatedEvent = RangePilotStrategyRangeKey & {
  strategyId: DeepBookPredictObjectId;
  creator: string;
  defaultQuantity: string;
  creatorFeeBps: number;
  platformFeeBps: 10;
  metadataUri: string;
  createdAtMs: string;
};

export type StrategyFollowedEvent = RangePilotStrategyRangeKey & {
  strategyId: DeepBookPredictObjectId;
  creator: string;
  follower: string;
  managerId: DeepBookPredictObjectId;
  protocolVaultId: ProtocolVaultObjectId;
  quantity: string;
  feeAmountAtomic: string;
  creatorFeeAtomic: string;
  platformFeeAtomic: string;
  timestampMs: string;
};

export type StrategyDeactivatedEvent = {
  strategyId: DeepBookPredictObjectId;
  creator: string;
  timestampMs: string;
};

export type CreateStrategyParams = RangePilotStrategyRangeKey & {
  defaultQuantity: string;
  creatorFeeBps: number;
  metadataUri: string;
};

export type FollowStrategyParams = {
  strategyId: StrategyObjectId;
  predictId: DeepBookPredictObjectId;
  managerId: DeepBookPredictObjectId;
  oracleObjectId: DeepBookPredictObjectId;
  feeCoinObjectId: DeepBookPredictObjectId;
  protocolVaultId: ProtocolVaultObjectId;
  feeAmountAtomic: string;
  quantity: string;
  quoteCoinType: DeepBookPredictCoinType;
};

export type FollowStrategyAndMintParams = FollowStrategyParams;

export type FollowStrategyAndMintPlan = Omit<FollowStrategyParams, "feeAmountAtomic" | "quantity"> & {
  feeAmountAtomic: string;
  quantity: string;
  wrapperPackageId: DeepBookPredictObjectId;
  target: `${string}::strategy::follow_strategy_and_mint`;
  requiresQuotePreview: true;
  requiresFullMintPreflight: true;
  signsOrExecutes: false;
};

export type CreateProtocolVaultParams = {
  wrapperPackageId: DeepBookPredictObjectId;
  adminCapId: AdminCapObjectId;
  quoteCoinType: DeepBookPredictCoinType;
};

export type WithdrawPlatformFeesParams = {
  wrapperPackageId: DeepBookPredictObjectId;
  protocolVaultId: ProtocolVaultObjectId;
  adminCapId: AdminCapObjectId;
  quoteCoinType: DeepBookPredictCoinType;
  amountAtomic: string;
  recipient: string;
};

export type ProtocolVaultCreatedEvent = {
  vaultId: ProtocolVaultObjectId;
  admin: string;
};

export type PlatformFeeDepositedEvent = {
  vaultId: ProtocolVaultObjectId;
  strategyId: StrategyObjectId;
  follower: string;
  amountAtomic: string;
  timestampMs: string;
};

export type PlatformFeesWithdrawnEvent = {
  vaultId: ProtocolVaultObjectId;
  recipient: string;
  amountAtomic: string;
};

export type PlatformFeeWithdrawnEvent = PlatformFeesWithdrawnEvent;
