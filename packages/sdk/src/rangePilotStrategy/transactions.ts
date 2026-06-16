import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { RANGEPILOT_TESTNET } from "@deepvol/config/rangePilotTestnet";
import type {
  CreateProtocolVaultParams,
  CreateStrategyTransactionOptions,
  FollowStrategyAndMintPlan,
  FollowStrategyParams,
  RangePilotWrapperConfig,
  WithdrawPlatformFeesParams,
} from "@deepvol/types/rangePilotStrategy";
import { DeepBookPredictUnconfirmedBindingError } from "../deepbookPredict/errors.ts";

export const RANGE_PILOT_WRAPPER_TESTNET = RANGEPILOT_TESTNET;

export type BuildCreateStrategyTransactionOptions = CreateStrategyTransactionOptions;

export type BuildFollowStrategyAndMintTransactionOptions = FollowStrategyParams & {
  wrapper?: RangePilotWrapperConfig;
  wrapperPackageId?: string;
  protocolVaultId?: string;
  requireQuotePreviewPassed?: boolean;
  requireFullMintPreflightPassed?: boolean;
};

export function buildCreateStrategyTransaction(
  params: BuildCreateStrategyTransactionOptions,
): Transaction {
  const wrapperPackageId = resolveWrapperPackageId(params);
  const metadataUriBytes = [...new TextEncoder().encode(params.metadataUri)];
  const tx = new Transaction();

  tx.moveCall({
    target: `${wrapperPackageId}::strategy::create_strategy`,
    arguments: [
      tx.pure.id(params.oracleId),
      tx.pure.u64(normalizePositiveInteger(params.expiry, "Strategy expiry")),
      tx.pure.u64(normalizePositiveInteger(params.lowerStrike, "Strategy lower strike")),
      tx.pure.u64(normalizePositiveInteger(params.higherStrike, "Strategy higher strike")),
      tx.pure.u64(normalizePositiveInteger(params.defaultQuantity, "Strategy default quantity")),
      tx.pure.u64(String(params.creatorFeeBps)),
      tx.pure.vector("u8", metadataUriBytes),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildFollowStrategyAndMintPlan(
  params: BuildFollowStrategyAndMintTransactionOptions,
): FollowStrategyAndMintPlan {
  const wrapperPackageId = resolveWrapperPackageId(params);
  const protocolVaultId = resolveProtocolVaultId(params);

  return {
    strategyId: params.strategyId,
    predictId: params.predictId,
    managerId: params.managerId,
    oracleObjectId: params.oracleObjectId,
    feeCoinObjectId: params.feeCoinObjectId,
    protocolVaultId,
    feeAmountAtomic: normalizePositiveInteger(
      params.feeAmountAtomic,
      "Strategy follow fee amount",
    ),
    quantity: normalizePositiveInteger(params.quantity, "Strategy follow quantity"),
    quoteCoinType: params.quoteCoinType,
    wrapperPackageId,
    target: `${wrapperPackageId}::strategy::follow_strategy_and_mint`,
    requiresQuotePreview: true,
    requiresFullMintPreflight: true,
    signsOrExecutes: false,
  };
}

export function buildFollowStrategyAndMintTransaction(
  params: BuildFollowStrategyAndMintTransactionOptions,
): Transaction {
  assertFollowSafetyGates(params);

  const plan = buildFollowStrategyAndMintPlan(params);
  const tx = new Transaction();

  tx.moveCall({
    target: plan.target,
    typeArguments: [plan.quoteCoinType],
    arguments: [
      tx.object(plan.strategyId),
      tx.object(plan.predictId),
      tx.object(plan.managerId),
      tx.object(plan.oracleObjectId),
      tx.object(plan.feeCoinObjectId),
      tx.object(plan.protocolVaultId),
      tx.pure.u64(plan.feeAmountAtomic),
      tx.pure.u64(plan.quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildCreateProtocolVaultTransaction(
  params: CreateProtocolVaultParams,
): Transaction {
  const wrapperPackageId = normalizeRequiredObjectId(
    params.wrapperPackageId,
    "RangePilot wrapper package ID",
  );
  const adminCapId = normalizeRequiredObjectId(params.adminCapId, "RangePilot AdminCap ID");
  const tx = new Transaction();

  tx.moveCall({
    target: `${wrapperPackageId}::strategy::create_protocol_vault`,
    typeArguments: [params.quoteCoinType],
    arguments: [tx.object(adminCapId)],
  });

  return tx;
}

export function buildWithdrawPlatformFeesTransaction(
  params: WithdrawPlatformFeesParams,
): Transaction {
  const wrapperPackageId = normalizeRequiredObjectId(
    params.wrapperPackageId,
    "RangePilot wrapper package ID",
  );
  const protocolVaultId = normalizeRequiredObjectId(
    params.protocolVaultId,
    "RangePilot protocol vault ID",
  );
  const adminCapId = normalizeRequiredObjectId(params.adminCapId, "RangePilot AdminCap ID");
  const tx = new Transaction();

  tx.moveCall({
    target: `${wrapperPackageId}::strategy::withdraw_platform_fees`,
    typeArguments: [params.quoteCoinType],
    arguments: [
      tx.object(adminCapId),
      tx.object(protocolVaultId),
      tx.pure.u64(normalizePositiveInteger(params.amountAtomic, "Platform fee withdrawal amount")),
      tx.pure.address(params.recipient),
    ],
  });

  return tx;
}

function assertFollowSafetyGates(
  params: BuildFollowStrategyAndMintTransactionOptions,
): void {
  if (!params.requireQuotePreviewPassed || !params.requireFullMintPreflightPassed) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "RangePilot strategy follow transaction building requires an official DeepBook Predict quote preview and full mint preflight to pass first.",
    );
  }
}

function resolveWrapperPackageId(
  params: { wrapperPackageId?: string | null; wrapper?: RangePilotWrapperConfig },
): string {
  const packageId =
    params.wrapperPackageId ??
    params.wrapper?.wrapperPackageId ??
    params.wrapper?.packageId ??
    null;

  if (!packageId) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "RangePilot wrapper package ID is TBD. Publish the wrapper package and pass wrapperPackageId before building follow_strategy_and_mint transactions.",
    );
  }

  return packageId;
}

function resolveProtocolVaultId(
  params: BuildFollowStrategyAndMintTransactionOptions,
): string {
  const protocolVaultId = params.protocolVaultId ?? params.wrapper?.protocolVaultId ?? null;

  if (!protocolVaultId) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "RangePilot protocol vault ID is TBD. Create ProtocolVault<T> after wrapper publish and pass protocolVaultId before building follow_strategy_and_mint transactions.",
    );
  }

  return protocolVaultId;
}

function normalizeRequiredObjectId(value: string | null, label: string): string {
  if (!value) {
    throw new DeepBookPredictUnconfirmedBindingError(`${label} is required before building this transaction.`);
  }

  return value;
}

function normalizePositiveInteger(value: string, label: string): string {
  const normalized = BigInt(value);

  if (normalized <= 0n) {
    throw new DeepBookPredictUnconfirmedBindingError(`${label} must be greater than 0.`);
  }

  return normalized.toString();
}
