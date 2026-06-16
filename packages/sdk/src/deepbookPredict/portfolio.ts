import { Transaction } from "@mysten/sui/transactions";
import type {
  DeepBookPredictManagerPnl,
  DeepBookPredictManagerPositionsSummary,
  DeepBookPredictManagerSummary,
  DeepBookPredictRangeMintQuery,
  DeepBookPredictRangeMintRecord,
  DeepBookPredictTradeRecord,
  GetManagerBinaryPositionParams,
  GetManagerRangePositionParams,
  ManagerBinaryPositionResult,
  ManagerRangePositionResult,
  RangePositionSummary,
} from "@deepvol/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import { DeepBookPredictUnconfirmedBindingError } from "./errors.ts";
import { inspectDevInspectU64, summarizeDevInspectU64Diagnostic } from "./quote.ts";
import { buildMarketKeyTransactionArgument, normalizeMarketKeyInput } from "./quote.ts";
import {
  buildRangeKeyTransactionArgument,
  normalizeNonNegativeInteger,
  normalizeRangeKeyInput,
} from "./rangeKey.ts";
import type { DeepBookPredictServerClient } from "./server.ts";

export function buildManagerRangePositionTransaction(
  params: Omit<GetManagerRangePositionParams, "client" | "sender">,
): Transaction {
  const config = resolveDeepBookPredictConfig(params.config);
  const tx = new Transaction();
  const rangeKey = buildRangeKeyTransactionArgument(tx, params, config);

  tx.moveCall({
    target: `${config.packageId}::predict_manager::range_position`,
    arguments: [tx.object(params.managerId), rangeKey],
  });

  return tx;
}

export function buildManagerBinaryPositionTransaction(
  params: Omit<GetManagerBinaryPositionParams, "client" | "sender">,
): Transaction {
  const config = resolveDeepBookPredictConfig(params.config);
  const tx = new Transaction();
  const marketKey = buildMarketKeyTransactionArgument(tx, params, config);

  tx.moveCall({
    target: `${config.packageId}::predict_manager::position`,
    arguments: [tx.object(params.managerId), marketKey],
  });

  return tx;
}

export async function readBinaryPositionQuantity(
  params: GetManagerBinaryPositionParams,
): Promise<ManagerBinaryPositionResult> {
  const transactionBlock = buildManagerBinaryPositionTransaction(params);
  const result = await params.client.devInspectTransactionBlock({
    sender: params.sender,
    transactionBlock,
  });

  if (isRecord(result) && typeof result.error === "string") {
    throw new DeepBookPredictUnconfirmedBindingError(
      `MUST CONFIRM BEFORE CODING: predict_manager::position devInspect failed: ${result.error}`,
    );
  }

  const diagnostic = inspectDevInspectU64(result);

  if (!diagnostic.decoded) {
    throw new DeepBookPredictUnconfirmedBindingError(
      `MUST CONFIRM BEFORE CODING: predict_manager::position devInspect return shape did not decode to one u64. ${summarizeDevInspectU64Diagnostic(diagnostic)}`,
    );
  }

  return {
    managerId: params.managerId,
    marketKey: normalizeMarketKeyInput(params),
    quantity: diagnostic.decoded,
    source: "dev_inspect",
    diagnostic,
  };
}

export async function readRangePositionQuantity(
  params: GetManagerRangePositionParams,
): Promise<ManagerRangePositionResult> {
  const transactionBlock = buildManagerRangePositionTransaction(params);
  const result = await params.client.devInspectTransactionBlock({
    sender: params.sender,
    transactionBlock,
  });

  if (isRecord(result) && typeof result.error === "string") {
    throw new DeepBookPredictUnconfirmedBindingError(
      `MUST CONFIRM BEFORE CODING: predict_manager::range_position devInspect failed: ${result.error}`,
    );
  }

  const diagnostic = inspectDevInspectU64(result);

  if (!diagnostic.decoded) {
    throw new DeepBookPredictUnconfirmedBindingError(
      `MUST CONFIRM BEFORE CODING: predict_manager::range_position devInspect return shape did not decode to one u64. ${summarizeDevInspectU64Diagnostic(diagnostic)}`,
    );
  }

  return {
    managerId: params.managerId,
    ...normalizeRangeKeyInput(params),
    quantity: diagnostic.decoded,
    source: "dev_inspect",
    diagnostic,
  };
}

export const getManagerBinaryPosition = readBinaryPositionQuantity;
export const getManagerRangePosition = readRangePositionQuantity;

export function getManagerSummary(
  server: DeepBookPredictServerClient,
  managerId: string,
): Promise<DeepBookPredictManagerSummary> {
  return server.getManagerSummary(managerId);
}

export function getManagerPositionsSummary(
  server: DeepBookPredictServerClient,
  managerId: string,
): Promise<DeepBookPredictManagerPositionsSummary> {
  return server.getManagerPositionsSummary(managerId);
}

export function getManagerPnl(
  server: DeepBookPredictServerClient,
  managerId: string,
  range = "ALL",
): Promise<DeepBookPredictManagerPnl> {
  return server.getManagerPnl(managerId, range);
}

export function getRangeMintHistory(
  server: DeepBookPredictServerClient,
  query: DeepBookPredictRangeMintQuery = {},
): Promise<DeepBookPredictRangeMintRecord[]> {
  return server.getRangeMints(query);
}

export function getOracleTrades(
  server: DeepBookPredictServerClient,
  oracleId: string,
): Promise<DeepBookPredictTradeRecord[]> {
  return server.getOracleTrades(oracleId);
}

export function normalizeRangePosition(
  input: RangePositionSummary,
): RangePositionSummary {
  const rangeKey = normalizeRangeKeyInput(input);
  const quantity = normalizeNonNegativeInteger(input.quantity, "Range position quantity");

  return {
    ...input,
    ...rangeKey,
    quantity,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
