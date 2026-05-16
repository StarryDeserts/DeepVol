import { Transaction } from "@mysten/sui/transactions";
import type {
  DeepBookPredictNetworkConfig,
  DevInspectU64PairDiagnostic,
  DevInspectU64ReturnDiagnostic,
  MarketKeyInput,
  MarketQuoteAttempt,
  MarketQuoteCandidate,
  MarketQuoteDirection,
  MarketQuotePreview,
  RangeKeyInput,
  RangeQuoteAbortClassification,
  RangeQuoteAttempt,
  RangeQuoteCandidate,
  RangeQuoteCandidateStrategy,
  RangeQuotePreview,
} from "@rangepilot/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import { DeepBookPredictUnconfirmedBindingError } from "./errors.ts";
import {
  buildRangeKeyTransactionArgument,
  normalizeNonNegativeInteger,
  normalizePositiveInteger,
  normalizeRangeKeyInput,
} from "./rangeKey.ts";

const SUI_CLOCK_OBJECT_ID = "0x6";
const SUI_OBJECT_ID_PATTERN = /^0x[0-9a-fA-F]+$/;
const DEFAULT_RANGE_WIDTH_TICKS = [1n, 5n, 10n, 25n, 50n, 100n, 250n, 500n, 1000n, 2500n, 5000n, 10000n] as const;
const BINARY_STRIKE_OFFSETS_TICKS = [-250n, -100n, -50n, -10n, 0n, 10n, 50n, 100n, 250n] as const;

export const RANGE_QUOTE_QUANTITY_SWEEP = [
  "1",
  "1000",
  "10000",
  "100000",
  "1000000",
  "5000000",
  "10000000",
  "50000000",
] as const;

export type RangeQuoteParams = RangeKeyInput & {
  oracleObjectId: string;
  quantity: string | bigint;
  config?: DeepBookPredictNetworkConfig;
};

export type DevInspectRangeQuoteParams = RangeQuoteParams & {
  client: {
    devInspectTransactionBlock(input: {
      sender: string;
      transactionBlock: Transaction;
    }): Promise<unknown>;
  };
  sender: string;
};

export type DecodedRangeQuoteAmounts = {
  mintCostAtomic: string;
  redeemPayoutAtomic: string;
};

export type DeriveCandidateRangesInput = {
  oracleId: string;
  oracleObjectId: string;
  underlyingAsset: string | null;
  expiry: string | bigint;
  minStrike: string | bigint;
  tickSize: string | bigint;
  spot?: string | bigint | null;
  forward?: string | bigint | null;
  widthTicks?: readonly (string | bigint)[];
};

export type ScanQuoteableRangesParams = {
  candidates: readonly RangeQuoteCandidate[];
  client: DevInspectRangeQuoteParams["client"];
  sender: string;
  quantity: string | bigint;
  config?: DeepBookPredictNetworkConfig;
};

export type ScanRangeQuoteQuantitiesParams = Omit<ScanQuoteableRangesParams, "quantity"> & {
  quantities: readonly (string | bigint)[];
};

export type MarketQuoteParams = MarketKeyInput & {
  oracleObjectId: string;
  quantity: string | bigint;
  config?: DeepBookPredictNetworkConfig;
};

export type DevInspectMarketQuoteParams = MarketQuoteParams & {
  client: DevInspectRangeQuoteParams["client"];
  sender: string;
};

export type DeriveMarketQuoteCandidatesInput = {
  oracleId: string;
  oracleObjectId: string;
  underlyingAsset: string | null;
  expiry: string | bigint;
  minStrike: string | bigint;
  tickSize: string | bigint;
  spot?: string | bigint | null;
  forward?: string | bigint | null;
};

export type ScanBinaryQuoteSanityParams = {
  candidates: readonly MarketQuoteCandidate[];
  client: DevInspectMarketQuoteParams["client"];
  sender: string;
  quantities: readonly (string | bigint)[];
  config?: DeepBookPredictNetworkConfig;
};

export function buildGetRangeTradeAmountsTransaction(
  params: RangeQuoteParams,
): Transaction {
  const config = resolveDeepBookPredictConfig(params.config);
  const quantity = normalizePositiveInteger(params.quantity, "Range quote quantity");
  const tx = new Transaction();
  const rangeKey = buildRangeKeyTransactionArgument(tx, params, config);

  tx.moveCall({
    target: `${config.packageId}::predict::get_range_trade_amounts`,
    arguments: [
      tx.object(config.predictId),
      tx.object(params.oracleObjectId),
      rangeKey,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export async function devInspectRangeQuote(
  params: DevInspectRangeQuoteParams,
): Promise<RangeQuotePreview> {
  const transactionBlock = buildGetRangeTradeAmountsTransaction(params);
  const result = await params.client.devInspectTransactionBlock({
    sender: params.sender,
    transactionBlock,
  });

  if (isRecord(result) && typeof result.error === "string") {
    throw new DeepBookPredictUnconfirmedBindingError(
      `MUST CONFIRM BEFORE CODING: get_range_trade_amounts devInspect failed: ${result.error}`,
    );
  }

  const diagnostic = inspectDevInspectU64Pair(result);

  if (!diagnostic.decoded) {
    throw new DeepBookPredictUnconfirmedBindingError(
      `MUST CONFIRM BEFORE CODING: get_range_trade_amounts devInspect return shape did not decode to an unambiguous pair of u64 values. ${summarizeDevInspectU64PairDiagnostic(diagnostic)}`,
    );
  }

  return {
    rangeKey: normalizeRangeKeyInput(params),
    quantity: normalizePositiveInteger(params.quantity, "Range quote quantity"),
    mintCostAtomic: diagnostic.decoded.mintCostAtomic,
    redeemPayoutAtomic: diagnostic.decoded.redeemPayoutAtomic,
    source: "devInspect",
    diagnostic,
  };
}

export function buildMarketKeyTransactionArgument(
  tx: Transaction,
  input: MarketKeyInput,
  config?: DeepBookPredictNetworkConfig,
): ReturnType<Transaction["moveCall"]> {
  const resolvedConfig = resolveDeepBookPredictConfig(config);
  const normalized = normalizeMarketKeyInput(input);
  const directionFunction = normalized.direction === "up" ? "up" : "down";

  return tx.moveCall({
    target: `${resolvedConfig.packageId}::market_key::${directionFunction}`,
    arguments: [
      tx.pure.id(normalized.oracleId),
      tx.pure.u64(normalized.expiry),
      tx.pure.u64(normalized.strike),
    ],
  });
}

export function buildGetTradeAmountsTransaction(
  params: MarketQuoteParams,
): Transaction {
  const config = resolveDeepBookPredictConfig(params.config);
  const quantity = normalizePositiveInteger(params.quantity, "Binary quote quantity");
  const tx = new Transaction();
  const marketKey = buildMarketKeyTransactionArgument(tx, params, config);

  tx.moveCall({
    target: `${config.packageId}::predict::get_trade_amounts`,
    arguments: [
      tx.object(config.predictId),
      tx.object(params.oracleObjectId),
      marketKey,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export async function devInspectBinaryQuote(
  params: DevInspectMarketQuoteParams,
): Promise<MarketQuotePreview> {
  const transactionBlock = buildGetTradeAmountsTransaction(params);
  const result = await params.client.devInspectTransactionBlock({
    sender: params.sender,
    transactionBlock,
  });

  if (isRecord(result) && typeof result.error === "string") {
    throw new DeepBookPredictUnconfirmedBindingError(
      `MUST CONFIRM BEFORE CODING: get_trade_amounts devInspect failed: ${result.error}`,
    );
  }

  const diagnostic = inspectDevInspectU64Pair(result);

  if (!diagnostic.decoded) {
    throw new DeepBookPredictUnconfirmedBindingError(
      `MUST CONFIRM BEFORE CODING: get_trade_amounts devInspect return shape did not decode to an unambiguous pair of u64 values. ${summarizeDevInspectU64PairDiagnostic(diagnostic)}`,
    );
  }

  return {
    marketKey: normalizeMarketKeyInput(params),
    quantity: normalizePositiveInteger(params.quantity, "Binary quote quantity"),
    mintCostAtomic: diagnostic.decoded.mintCostAtomic,
    redeemPayoutAtomic: diagnostic.decoded.redeemPayoutAtomic,
    source: "devInspect",
    diagnostic,
  };
}

export function inspectDevInspectU64Pair(result: unknown): DevInspectU64PairDiagnostic {
  const returnValues = extractReturnValues(result);
  const returns = returnValues.map(inspectU64ReturnValue);
  const decodedValues = returns
    .map((entry) => entry.decodedU64)
    .filter((value): value is string => value !== null);
  const decoded = returnValues.length === 2 && decodedValues.length === 2
    ? {
        mintCostAtomic: decodedValues[0],
        redeemPayoutAtomic: decodedValues[1],
      }
    : null;

  return {
    returnValueCount: returnValues.length,
    returns,
    decoded,
  };
}

export function decodeDevInspectU64Pair(result: unknown): DecodedRangeQuoteAmounts | null {
  return inspectDevInspectU64Pair(result).decoded;
}

export function summarizeDevInspectU64PairDiagnostic(diagnostic: DevInspectU64PairDiagnostic): string {
  const returns = diagnostic.returns.map((entry) => {
    return `${entry.index}:${entry.typeTag ?? "unknown"}:${entry.byteLength ?? "unknown"}:${entry.decodedU64 ?? "null"}:${entry.status}`;
  });

  return `returnValues=${diagnostic.returnValueCount} returns=[${returns.join(",")}]`;
}

export function classifyQuoteAbort(errorOrMessage: unknown): RangeQuoteAbortClassification {
  const message = errorOrMessage instanceof Error ? errorOrMessage.message : String(errorOrMessage);
  const locationMatch = message.match(/([0-9a-fx]+::([A-Za-z0-9_]+)::([A-Za-z0-9_]+))/);
  const codeMatch = message.match(/abort(?:ed)?(?: with)? code\s+(\d+)/i) ?? message.match(/,\s*(\d+)\)\s*in command/i);

  return {
    module: locationMatch?.[2] ?? null,
    function: locationMatch?.[3] ?? null,
    code: codeMatch?.[1] ?? null,
    message,
  };
}

export function deriveCandidateRanges(input: DeriveCandidateRangesInput): RangeQuoteCandidate[] {
  const minStrike = BigInt(normalizeNonNegativeInteger(input.minStrike, "Range candidate min strike"));
  const tickSize = BigInt(normalizePositiveInteger(input.tickSize, "Range candidate tick size"));
  const expiry = normalizePositiveInteger(input.expiry, "Range candidate expiry");
  const widths = normalizeUniquePositiveBigints(input.widthTicks ?? DEFAULT_RANGE_WIDTH_TICKS, "Range candidate width ticks");
  const candidates = new Map<string, RangeQuoteCandidate>();

  for (const anchor of deriveAnchors(input)) {
    const anchorStrike = snapToStrike(anchor.price, minStrike, tickSize);

    for (const widthTicks of widths) {
      const widthAtomic = widthTicks * tickSize;
      const leftTicks = widthTicks / 2n;
      addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "centered", anchorStrike - leftTicks * tickSize, anchorStrike - leftTicks * tickSize + widthAtomic);
      addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "below-anchor", anchorStrike - widthAtomic, anchorStrike);
      addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "above-anchor", anchorStrike, anchorStrike + widthAtomic);

      if (widthTicks >= 250n) {
        addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "wide-around-anchor", anchorStrike - widthAtomic, anchorStrike + widthAtomic);
        addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "wide-below-anchor", anchorStrike - 2n * widthAtomic, anchorStrike - widthAtomic);
        addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "wide-above-anchor", anchorStrike + widthAtomic, anchorStrike + 2n * widthAtomic);
      }
    }
  }

  return [...candidates.values()];
}

export function deriveMarketQuoteCandidates(input: DeriveMarketQuoteCandidatesInput): MarketQuoteCandidate[] {
  const minStrike = BigInt(normalizeNonNegativeInteger(input.minStrike, "Market quote min strike"));
  const tickSize = BigInt(normalizePositiveInteger(input.tickSize, "Market quote tick size"));
  const expiry = normalizePositiveInteger(input.expiry, "Market quote expiry");
  const candidates = new Map<string, MarketQuoteCandidate>();

  for (const anchor of deriveAnchors(input)) {
    const anchorStrike = snapToStrike(anchor.price, minStrike, tickSize);

    for (const offsetTicks of BINARY_STRIKE_OFFSETS_TICKS) {
      const strike = anchorStrike + offsetTicks * tickSize;

      if (strike < minStrike) {
        continue;
      }

      for (const direction of ["up", "down"] satisfies MarketQuoteDirection[]) {
        const candidate: MarketQuoteCandidate = {
          oracleId: input.oracleId,
          oracleObjectId: input.oracleObjectId,
          underlyingAsset: input.underlyingAsset,
          expiry,
          strike: strike.toString(),
          direction,
          anchorSource: anchor.source,
          anchorPrice: anchor.price.toString(),
        };
        const normalized = normalizeMarketKeyInput(candidate);
        const key = `${normalized.oracleId}:${normalized.expiry}:${normalized.strike}:${normalized.direction}`;
        candidates.set(key, candidate);
      }
    }
  }

  return [...candidates.values()];
}

export function isQuoteableRangeCandidate(candidate: RangeQuoteCandidate): boolean {
  try {
    normalizeRangeKeyInput(candidate);
    normalizePositiveInteger(candidate.widthTicks, "Range candidate width ticks");
    normalizeNonNegativeInteger(candidate.anchorPrice, "Range candidate anchor price");
    return true;
  } catch {
    return false;
  }
}

export async function scanQuoteableRanges(
  params: ScanQuoteableRangesParams,
): Promise<RangeQuoteAttempt[]> {
  return scanRangeQuoteQuantities({
    candidates: params.candidates,
    client: params.client,
    sender: params.sender,
    quantities: [params.quantity],
    config: params.config,
  });
}

export async function scanRangeQuoteQuantities(
  params: ScanRangeQuoteQuantitiesParams,
): Promise<RangeQuoteAttempt[]> {
  const attempts: RangeQuoteAttempt[] = [];

  for (const candidate of params.candidates) {
    for (const quantityValue of params.quantities) {
      const quantity = normalizePositiveInteger(quantityValue, "Range quote quantity");

      try {
        const quote = await devInspectRangeQuote({
          ...candidate,
          client: params.client,
          sender: params.sender,
          quantity,
          config: params.config,
        });

        attempts.push({
          ...candidate,
          status: "success",
          quantity,
          mintCostAtomic: quote.mintCostAtomic,
          redeemPayoutAtomic: quote.redeemPayoutAtomic,
          diagnostic: quote.diagnostic,
        });
      } catch (error) {
        attempts.push({
          ...candidate,
          status: "failure",
          quantity,
          abort: classifyQuoteAbort(error),
        });
      }
    }
  }

  return attempts;
}

export async function scanBinaryQuoteSanity(
  params: ScanBinaryQuoteSanityParams,
): Promise<MarketQuoteAttempt[]> {
  const attempts: MarketQuoteAttempt[] = [];

  for (const candidate of params.candidates) {
    for (const quantityValue of params.quantities) {
      const quantity = normalizePositiveInteger(quantityValue, "Binary quote quantity");

      try {
        const quote = await devInspectBinaryQuote({
          ...candidate,
          client: params.client,
          sender: params.sender,
          quantity,
          config: params.config,
        });

        attempts.push({
          ...candidate,
          status: "success",
          quantity,
          mintCostAtomic: quote.mintCostAtomic,
          redeemPayoutAtomic: quote.redeemPayoutAtomic,
          diagnostic: quote.diagnostic,
        });
      } catch (error) {
        attempts.push({
          ...candidate,
          status: "failure",
          quantity,
          abort: classifyQuoteAbort(error),
        });
      }
    }
  }

  return attempts;
}

function addRangeCandidate(
  candidates: Map<string, RangeQuoteCandidate>,
  input: DeriveCandidateRangesInput,
  expiry: string,
  minStrike: bigint,
  tickSize: bigint,
  anchor: { source: RangeQuoteCandidate["anchorSource"]; price: bigint },
  strategy: RangeQuoteCandidateStrategy,
  lowerStrikeValue: bigint,
  higherStrikeValue: bigint,
) {
  const lowerStrike = lowerStrikeValue < minStrike ? minStrike : lowerStrikeValue;
  const higherStrike = higherStrikeValue;

  if (higherStrike <= lowerStrike || (higherStrike - lowerStrike) % tickSize !== 0n) {
    return;
  }

  const candidate: RangeQuoteCandidate = {
    oracleId: input.oracleId,
    oracleObjectId: input.oracleObjectId,
    underlyingAsset: input.underlyingAsset,
    expiry,
    lowerStrike: lowerStrike.toString(),
    higherStrike: higherStrike.toString(),
    widthTicks: ((higherStrike - lowerStrike) / tickSize).toString(),
    anchorSource: anchor.source,
    anchorPrice: anchor.price.toString(),
    strategy,
  };

  if (isQuoteableRangeCandidate(candidate)) {
    const key = `${candidate.oracleId}:${candidate.expiry}:${candidate.lowerStrike}:${candidate.higherStrike}`;
    if (!candidates.has(key)) {
      candidates.set(key, candidate);
    }
  }
}

function extractReturnValues(result: unknown): unknown[] {
  if (!isRecord(result) || !Array.isArray(result.results)) {
    return [];
  }

  for (let index = result.results.length - 1; index >= 0; index -= 1) {
    const entry = result.results[index];

    if (isRecord(entry) && Array.isArray(entry.returnValues)) {
      return entry.returnValues;
    }
  }

  return [];
}

function inspectU64ReturnValue(value: unknown, index: number): DevInspectU64ReturnDiagnostic {
  if (!Array.isArray(value) || value.length !== 2) {
    return {
      index,
      typeTag: null,
      byteLength: null,
      decodedU64: null,
      status: "missing-bytes",
    };
  }

  const [bytes, type] = value;
  const typeTag = typeToString(type);
  const byteArray = Array.isArray(bytes) ? bytes : null;
  const byteLength = byteArray?.length ?? null;

  if (!byteArray || !byteArray.every(isByte)) {
    return {
      index,
      typeTag,
      byteLength,
      decodedU64: null,
      status: "missing-bytes",
    };
  }

  if (typeTag !== "u64") {
    return {
      index,
      typeTag,
      byteLength,
      decodedU64: null,
      status: "unsupported-type",
    };
  }

  if (byteArray.length !== 8) {
    return {
      index,
      typeTag,
      byteLength,
      decodedU64: null,
      status: "invalid-length",
    };
  }

  return {
    index,
    typeTag,
    byteLength,
    decodedU64: decodeLittleEndianU64(byteArray),
    status: "decoded",
  };
}

function decodeLittleEndianU64(bytes: readonly number[]): string {
  return bytes.reduce((result, byte, index) => {
    return result + (BigInt(byte) << (8n * BigInt(index)));
  }, 0n).toString();
}

function deriveAnchors(input: DeriveCandidateRangesInput): Array<{
  source: RangeQuoteCandidate["anchorSource"];
  price: bigint;
}> {
  const anchors: Array<{
    source: RangeQuoteCandidate["anchorSource"];
    price: bigint;
  }> = [];
  const forward = normalizeOptionalNonNegativeInteger(input.forward);
  const spot = normalizeOptionalNonNegativeInteger(input.spot);

  if (forward !== null) {
    anchors.push({ source: "forward", price: forward });
  }

  if (spot !== null) {
    anchors.push({ source: "spot", price: spot });
  }

  return anchors;
}

function normalizeOptionalNonNegativeInteger(value: string | bigint | null | undefined): bigint | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    const normalized = BigInt(value);
    return normalized >= 0n ? normalized : null;
  } catch {
    return null;
  }
}

function normalizeUniquePositiveBigints(values: readonly (string | bigint)[], label: string): bigint[] {
  const unique = new Set<string>();

  for (const value of values) {
    unique.add(normalizePositiveInteger(value, label));
  }

  return [...unique].map((value) => BigInt(value)).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

function normalizeMarketKeyInput(input: MarketKeyInput): {
  oracleId: string;
  expiry: string;
  strike: string;
  direction: MarketQuoteDirection;
} {
  if (!SUI_OBJECT_ID_PATTERN.test(input.oracleId)) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "MarketKey oracle ID must be a 0x-prefixed Sui object ID.",
    );
  }

  if (input.direction !== "up" && input.direction !== "down") {
    throw new DeepBookPredictUnconfirmedBindingError("MarketKey direction must be up or down.");
  }

  return {
    oracleId: input.oracleId,
    expiry: normalizePositiveInteger(input.expiry, "MarketKey expiry"),
    strike: normalizeNonNegativeInteger(input.strike, "MarketKey strike"),
    direction: input.direction,
  };
}

function snapToStrike(anchor: bigint, minStrike: bigint, tickSize: bigint): bigint {
  if (anchor <= minStrike) {
    return minStrike;
  }

  const offset = anchor - minStrike;
  const lowerSteps = offset / tickSize;
  const lower = minStrike + lowerSteps * tickSize;
  const upper = lower + tickSize;

  return anchor - lower <= upper - anchor ? lower : upper;
}

function typeToString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function isByte(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
