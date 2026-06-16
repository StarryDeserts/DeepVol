import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { DEEPVOL_TESTNET } from "@deepvol/config/deepVolTestnet";
import type {
  BuyMoveReceiptParams,
  CreateVolSeriesParams,
  DeactivateVolSeriesParams,
  DeepVolTestnetConfig,
  MarkMoveReceiptSettledParams,
} from "@deepvol/types/deepVol";
import { DeepBookPredictUnconfirmedBindingError } from "../deepbookPredict/errors.ts";

export type DeepVolPackageOptions = {
  config?: DeepVolTestnetConfig;
  packageId?: string | null;
};

export type BuildCreateVolSeriesTransactionOptions = CreateVolSeriesParams & DeepVolPackageOptions;
export type BuildDeactivateVolSeriesTransactionOptions = DeactivateVolSeriesParams & DeepVolPackageOptions;
export type BuildBuyMoveReceiptTransactionOptions = BuyMoveReceiptParams &
  DeepVolPackageOptions & {
    requireFreshBinaryQuotePassed?: boolean;
    requireBuyMoveReceiptPreflightPassed?: boolean;
    requireCreateFeeCoinPrepared?: boolean;
    allowBrowserPreflightBuild?: boolean;
  };
export type BuildMarkMoveReceiptSettledTransactionOptions = MarkMoveReceiptSettledParams & DeepVolPackageOptions;

export function buildCreateVolSeriesTransaction(
  params: BuildCreateVolSeriesTransactionOptions,
): Transaction {
  const packageId = resolveDeepVolPackageId(params);
  const metadataUriBytes = [...new TextEncoder().encode(params.metadataUri)];
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::series::create_series`,
    arguments: [
      tx.pure.id(params.oracleId),
      tx.pure.u64(normalizePositiveInteger(params.expiry, "VolSeries expiry")),
      tx.pure.u64(normalizePositiveInteger(params.lowerStrike, "VolSeries lower strike")),
      tx.pure.u64(normalizePositiveInteger(params.upperStrike, "VolSeries upper strike")),
      tx.pure.u64(String(params.createFeeBps ?? params.config?.defaultCreateFeeBps ?? DEEPVOL_TESTNET.defaultCreateFeeBps)),
      tx.pure.vector("u8", metadataUriBytes),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildDeactivateVolSeriesTransaction(
  params: BuildDeactivateVolSeriesTransactionOptions,
): Transaction {
  const packageId = resolveDeepVolPackageId(params);
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::series::deactivate_series`,
    arguments: [tx.object(params.seriesId), tx.object(SUI_CLOCK_OBJECT_ID)],
  });

  return tx;
}

export function buildBuyMoveReceiptTransaction(
  params: BuildBuyMoveReceiptTransactionOptions,
): Transaction {
  assertBuyMoveReceiptGates(params);

  const packageId = resolveDeepVolPackageId(params);
  const protocolVaultId = resolveDeepVolProtocolVaultId(params);
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::receipt::buy_move_receipt`,
    typeArguments: [params.quoteCoinType],
    arguments: [
      tx.object(params.seriesId),
      tx.object(params.predictId),
      tx.object(params.predictManagerId),
      tx.object(params.oracleId),
      tx.object(params.feeCoinId),
      tx.object(protocolVaultId),
      tx.pure.u64(normalizePositiveInteger(params.quantity, "MoveReceipt quantity")),
      tx.pure.u64(normalizePositiveInteger(params.maxPremiumPaid, "MoveReceipt max premium paid")),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildMarkMoveReceiptSettledTransaction(
  params: BuildMarkMoveReceiptSettledTransactionOptions,
): Transaction {
  const packageId = resolveDeepVolPackageId(params);
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::receipt::mark_receipt_settled`,
    arguments: [tx.object(params.receiptId), tx.object(SUI_CLOCK_OBJECT_ID)],
  });

  return tx;
}

function resolveDeepVolPackageId(params: DeepVolPackageOptions): string {
  const packageId = params.packageId ?? params.config?.packageId ?? DEEPVOL_TESTNET.packageId;

  if (!packageId) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "DeepVol package ID is unavailable because DeepVol-3B is local-only until the user manually configures and publishes the DeepVol package.",
    );
  }

  return packageId;
}

function resolveDeepVolProtocolVaultId(params: BuildBuyMoveReceiptTransactionOptions): string {
  const protocolVaultId = params.protocolVaultId ?? params.config?.protocolVaultId ?? DEEPVOL_TESTNET.protocolVaultId;

  if (!protocolVaultId) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "DeepVol protocol vault ID is unavailable because DeepVol-3B is local-only until the user manually creates and configures a ProtocolVault for the quote asset.",
    );
  }

  return protocolVaultId;
}

function assertBuyMoveReceiptGates(params: BuildBuyMoveReceiptTransactionOptions): void {
  if (!params.requireFreshBinaryQuotePassed) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "DeepVol buy_move_receipt requires a fresh UP/DOWN binary quote before building; this builder does not discover market quotes.",
    );
  }

  if (!params.allowBrowserPreflightBuild && !params.requireBuyMoveReceiptPreflightPassed) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "DeepVol buy_move_receipt requires browser receipt preflight before wallet submission; use the preflight helper for devInspect-only builds.",
    );
  }

  if (!params.requireCreateFeeCoinPrepared) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "DeepVol buy_move_receipt requires a prepared create-fee coin; this builder does not select or split fee coins.",
    );
  }
}

function normalizePositiveInteger(value: string, label: string): string {
  const normalized = BigInt(value);

  if (normalized <= 0n) {
    throw new DeepBookPredictUnconfirmedBindingError(`${label} must be greater than 0.`);
  }

  return normalized.toString();
}
