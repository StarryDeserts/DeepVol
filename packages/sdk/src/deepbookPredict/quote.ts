import { Transaction } from "@mysten/sui/transactions";
import type {
  DeepBookPredictNetworkConfig,
  DevInspectU64Diagnostic,
  DevInspectU64PairDiagnostic,
  DevInspectU64ReturnDiagnostic,
  MarketKeyInput,
  OnchainAskBoundsResult,
  MarketQuoteAttempt,
  MarketQuoteCandidate,
  MarketQuoteDirection,
  MarketQuotePreview,
  RangeKeyInput,
  RangeQuoteAbortClassification,
  RangeQuoteAttempt,
  RangeQuoteCandidate,
  RangeQuoteCandidateFamily,
  RangeQuoteCandidateStrategy,
  RangeQuotePreview,
} from "@deepvol/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import {
  classifyDeepBookPredictAbort,
  DeepBookPredictUnconfirmedBindingError,
} from "./errors.ts";
import { classifyMintAbort } from "./trade.ts";
import {
  buildRangeKeyTransactionArgument,
  normalizeNonNegativeInteger,
  normalizePositiveInteger,
  normalizeRangeKeyInput,
} from "./rangeKey.ts";

const SUI_CLOCK_OBJECT_ID = "0x6";
const SUI_OBJECT_ID_PATTERN = /^0x[0-9a-fA-F]+$/;
const DEFAULT_RANGE_WIDTH_TICKS = [1n, 5n, 10n, 25n, 50n, 100n, 250n, 500n, 1000n, 2500n, 5000n, 10000n] as const;
const SOURCE_INFORMED_WIDE_WIDTH_TICKS = [250n, 500n, 1000n, 2500n, 5000n, 10000n] as const;
const SOURCE_INFORMED_FORWARD_WIDTH_TICKS = [10n, 25n, 50n, 100n, 250n, 500n, 1000n] as const;
const SOURCE_INFORMED_TARGET_PCTS = [5n, 10n, 25n, 50n, 75n, 90n] as const;
const SOURCE_INFORMED_GRID_TICKS = 100_000n;
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

export type AskBoundsParams = {
  oracleId: string;
  config?: DeepBookPredictNetworkConfig;
};

export type DevInspectAskBoundsParams = AskBoundsParams & {
  client: DevInspectRangeQuoteParams["client"];
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
  maxAttempts?: number;
  signal?: AbortSignal;
  onAttempt?: (progress: {
    attemptCount: number;
    maxAttempts: number | null;
    candidate: RangeQuoteCandidate;
    quantity: string;
  }) => void;
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

export function buildAskBoundsTransaction(params: AskBoundsParams): Transaction {
  const config = resolveDeepBookPredictConfig(params.config);
  const oracleId = normalizeObjectId(params.oracleId, "ask_bounds oracle ID");
  const tx = new Transaction();

  tx.moveCall({
    target: `${config.packageId}::predict::ask_bounds`,
    arguments: [
      tx.object(config.predictId),
      tx.pure.id(oracleId),
    ],
  });

  return tx;
}

export async function devInspectAskBounds(
  params: DevInspectAskBoundsParams,
): Promise<OnchainAskBoundsResult> {
  try {
    const transactionBlock = buildAskBoundsTransaction(params);
    const result = await params.client.devInspectTransactionBlock({
      sender: params.sender,
      transactionBlock,
    });

    if (isRecord(result) && typeof result.error === "string") {
      return {
        status: "unavailable",
        abort: classifyMintAbort(result.error),
      };
    }

    const diagnostic = inspectDevInspectU64Pair(result);

    if (!diagnostic.decoded) {
      return {
        status: "unavailable",
        abort: classifyMintAbort(
          `ask_bounds devInspect return shape did not decode to an unambiguous pair of u64 values. ${summarizeDevInspectU64PairDiagnostic(diagnostic)}`,
        ),
      };
    }

    return {
      status: "available",
      minAskPrice: diagnostic.decoded.mintCostAtomic,
      maxAskPrice: diagnostic.decoded.redeemPayoutAtomic,
      diagnostic,
    };
  } catch (error) {
    return {
      status: "unavailable",
      abort: classifyMintAbort(error),
    };
  }
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

export function inspectDevInspectU64(result: unknown): DevInspectU64Diagnostic {
  const returnValues = extractReturnValues(result);
  const returns = returnValues.map(inspectU64ReturnValue);
  const decodedValues = returns
    .map((entry) => entry.decodedU64)
    .filter((value): value is string => value !== null);
  const decoded = returnValues.length === 1 && decodedValues.length === 1
    ? decodedValues[0]
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

export function decodeDevInspectU64(result: unknown): string | null {
  return inspectDevInspectU64(result).decoded;
}

export function summarizeDevInspectU64PairDiagnostic(diagnostic: DevInspectU64PairDiagnostic): string {
  const returns = diagnostic.returns.map((entry) => {
    return `${entry.index}:${entry.typeTag ?? "unknown"}:${entry.byteLength ?? "unknown"}:${entry.decodedU64 ?? "null"}:${entry.status}`;
  });

  return `returnValues=${diagnostic.returnValueCount} returns=[${returns.join(",")}]`;
}

export function summarizeDevInspectU64Diagnostic(diagnostic: DevInspectU64Diagnostic): string {
  const returns = diagnostic.returns.map((entry) => {
    return `${entry.index}:${entry.typeTag ?? "unknown"}:${entry.byteLength ?? "unknown"}:${entry.decodedU64 ?? "null"}:${entry.status}`;
  });

  return `returnValues=${diagnostic.returnValueCount} returns=[${returns.join(",")}]`;
}

export function classifyQuoteAbort(errorOrMessage: unknown): RangeQuoteAbortClassification {
  const abort = classifyDeepBookPredictAbort(errorOrMessage);

  return {
    packageId: abort.packageId,
    module: abort.module,
    function: abort.function,
    code: abort.code,
    message: abort.message,
    constantName: abort.constantName,
    likelyCause: abort.likelyCause,
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
      addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "centered", anchorStrike - leftTicks * tickSize, anchorStrike - leftTicks * tickSize + widthAtomic, "baseline");
      addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "below-anchor", anchorStrike - widthAtomic, anchorStrike, "baseline");
      addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "above-anchor", anchorStrike, anchorStrike + widthAtomic, "baseline");

      if (widthTicks >= 250n) {
        addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "wide-around-anchor", anchorStrike - widthAtomic, anchorStrike + widthAtomic, "baseline");
        addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "wide-below-anchor", anchorStrike - 2n * widthAtomic, anchorStrike - widthAtomic, "baseline");
        addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "wide-above-anchor", anchorStrike + widthAtomic, anchorStrike + 2n * widthAtomic, "baseline");
      }
    }
  }

  return [...candidates.values()];
}

export function deriveSourceInformedRangeCandidates(input: DeriveCandidateRangesInput): RangeQuoteCandidate[] {
  const minStrike = BigInt(normalizeNonNegativeInteger(input.minStrike, "Range candidate min strike"));
  const tickSize = BigInt(normalizePositiveInteger(input.tickSize, "Range candidate tick size"));
  const maxStrike = minStrike + SOURCE_INFORMED_GRID_TICKS * tickSize;
  const expiry = normalizePositiveInteger(input.expiry, "Range candidate expiry");
  const candidates = new Map<string, RangeQuoteCandidate>();

  for (const candidate of deriveCandidateRanges(input)) {
    setRangeCandidate(candidates, candidate);
  }

  const anchors = deriveAnchors(input);

  for (const anchor of anchors) {
    const anchorStrike = snapToStrike(anchor.price, minStrike, tickSize);
    const family = anchor.source === "forward" ? "wide_around_forward" : "wide_around_spot";

    for (const widthTicks of SOURCE_INFORMED_WIDE_WIDTH_TICKS) {
      const widthAtomic = widthTicks * tickSize;
      addRangeCandidate(candidates, input, expiry, minStrike, tickSize, anchor, "wide-around-anchor", anchorStrike - widthAtomic, anchorStrike + widthAtomic, family);
    }
  }

  const forwardAnchor = anchors.find((anchor) => anchor.source === "forward") ?? null;

  if (forwardAnchor) {
    const forwardStrike = snapToStrike(forwardAnchor.price, minStrike, tickSize);

    for (const widthTicks of SOURCE_INFORMED_FORWARD_WIDTH_TICKS) {
      const widthAtomic = widthTicks * tickSize;
      addRangeCandidate(candidates, input, expiry, minStrike, tickSize, forwardAnchor, "wide-around-anchor", forwardStrike - widthAtomic, forwardStrike + widthAtomic, "forward_below_to_above");
      addRangeCandidate(candidates, input, expiry, minStrike, tickSize, forwardAnchor, "centered", forwardStrike - widthAtomic / 2n, forwardStrike + widthAtomic / 2n, "forward_centered_target_width");
    }

    for (const target of SOURCE_INFORMED_TARGET_PCTS) {
      const widthTicks = SOURCE_INFORMED_GRID_TICKS * target / 100n;
      const widthAtomic = (widthTicks < 1n ? 1n : widthTicks) * tickSize;
      const family = `target_fair_price_${target}pct` as RangeQuoteCandidateFamily;
      addRangeCandidate(candidates, input, expiry, minStrike, tickSize, forwardAnchor, "centered", forwardStrike - widthAtomic / 2n, forwardStrike + widthAtomic / 2n, family);
    }
  }

  for (const candidate of [...candidates.values()].slice(0, 24)) {
    setRangeCandidate(candidates, {
      ...candidate,
      family: "safe_larger_quantity_probe",
    });
  }

  return rankRangeCandidates([...candidates.values()]);
}

export function rangeCandidateKey(candidate: RangeKeyInput): string {
  const normalized = normalizeRangeKeyInput(candidate);
  return `${normalized.oracleId}:${normalized.expiry}:${normalized.lowerStrike}:${normalized.higherStrike}`;
}

export function rangeQuoteAttemptKey(candidate: RangeKeyInput, quantity: string | bigint): string {
  return `${rangeCandidateKey(candidate)}:${normalizePositiveInteger(quantity, "Range quote quantity")}`;
}

export function rankRangeCandidates(candidates: readonly RangeQuoteCandidate[]): RangeQuoteCandidate[] {
  return [...candidates].sort(compareRangeCandidates);
}

export function rangeCandidateFamilyPriority(candidate: RangeQuoteCandidate): number {
  switch (candidate.family ?? candidate.strategy) {
    case "wide_around_forward":
      return 0;
    case "forward_below_to_above":
      return 1;
    case "forward_centered_target_width":
      return 2;
    case "target_fair_price_50pct":
      return 3;
    case "target_fair_price_25pct":
    case "target_fair_price_75pct":
      return 4;
    case "target_fair_price_10pct":
    case "target_fair_price_90pct":
      return 5;
    case "target_fair_price_5pct":
      return 6;
    case "wide_around_spot":
      return 7;
    case "safe_larger_quantity_probe":
      return 8;
    case "wide-around-anchor":
      return 9;
    case "centered":
      return 10;
    case "below-anchor":
      return 11;
    case "above-anchor":
      return 12;
    case "wide-below-anchor":
      return 13;
    case "wide-above-anchor":
      return 14;
    default:
      return 15;
  }
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
  const seen = new Set<string>();

  for (const candidate of params.candidates) {
    for (const quantityValue of params.quantities) {
      if (params.signal?.aborted || (params.maxAttempts !== undefined && attempts.length >= params.maxAttempts)) {
        return attempts;
      }

      const quantity = normalizePositiveInteger(quantityValue, "Range quote quantity");
      const key = rangeQuoteAttemptKey(candidate, quantity);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      params.onAttempt?.({
        attemptCount: attempts.length + 1,
        maxAttempts: params.maxAttempts ?? null,
        candidate,
        quantity,
      });

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
  family?: RangeQuoteCandidateFamily,
) {
  const lowerStrike = snapRangeBoundary(lowerStrikeValue, minStrike, tickSize);
  const higherStrike = snapRangeBoundary(higherStrikeValue, minStrike, tickSize);

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
    family,
  };

  if (isQuoteableRangeCandidate(candidate)) {
    setRangeCandidate(candidates, candidate);
  }
}

function setRangeCandidate(candidates: Map<string, RangeQuoteCandidate>, candidate: RangeQuoteCandidate) {
  const key = `${rangeCandidateKey(candidate)}:${candidate.family ?? candidate.strategy}`;
  candidates.set(key, candidate);
}

function compareRangeCandidates(left: RangeQuoteCandidate, right: RangeQuoteCandidate): number {
  const familyDelta = rangeCandidateFamilyPriority(left) - rangeCandidateFamilyPriority(right);

  if (familyDelta !== 0) {
    return familyDelta;
  }

  const leftWidth = BigInt(left.widthTicks);
  const rightWidth = BigInt(right.widthTicks);

  if (leftWidth !== rightWidth) {
    return leftWidth < rightWidth ? -1 : 1;
  }

  const leftAnchor = left.anchorSource === "forward" ? 0 : 1;
  const rightAnchor = right.anchorSource === "forward" ? 0 : 1;

  return leftAnchor - rightAnchor;
}

function snapRangeBoundary(value: bigint, minStrike: bigint, tickSize: bigint): bigint {
  const snapped = snapToStrike(value, minStrike, tickSize);
  return snapped < minStrike ? minStrike : snapped;
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

export function normalizeMarketKeyInput(input: MarketKeyInput): {
  oracleId: string;
  expiry: string;
  strike: string;
  direction: MarketQuoteDirection;
} {
  normalizeObjectId(input.oracleId, "MarketKey oracle ID");

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

function normalizeObjectId(value: string, label: string): string {
  if (!SUI_OBJECT_ID_PATTERN.test(value)) {
    throw new DeepBookPredictUnconfirmedBindingError(
      `${label} must be a 0x-prefixed Sui object ID.`,
    );
  }

  return value;
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
