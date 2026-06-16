import type {
  DeepBookPredictNetworkConfig,
  FindMintableBinaryPrimitiveCandidateOptions,
  FindMintableBinaryPrimitiveCandidateResult,
  FindMintableRangePrimitiveCandidateOptions,
  FindMintableRangePrimitiveCandidateResult,
  MarketQuoteDirection,
  MarketQuotePreview,
  PrimitiveMintableStrikeAttempt,
  PrimitiveMintableStrikeCandidate,
  RangePrimitiveMintabilityFailureFamily,
  RangePrimitiveMintabilitySummary,
  RangePrimitiveMintableAttempt,
  RangePrimitiveMintableCandidate,
  RangePrimitiveMintableCandidateDiagnostic,
  RangeQuoteCandidateStrategy,
  RangeQuotePreview,
} from "@deepvol/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import {
  isAssertMintableAskAbort,
  RANGE_KEY_BUILDER_FAILED_MESSAGE,
  RANGE_PRIMITIVE_NOT_MINTABLE_MESSAGE,
  RANGE_QUOTE_FAILED_MESSAGE,
  translateDeepBookPredictError,
} from "./errors.ts";
import {
  classifyQuoteAbort,
  devInspectBinaryQuote,
  devInspectRangeQuote,
} from "./quote.ts";
import { devInspectMintBinaryPreflight, devInspectMintRangePreflight } from "./trade.ts";

const DEFAULT_PRIMITIVE_OFFSET_MULTIPLIERS = [0n, 10n, 20n, 50n, 100n, 200n] as const;
const DEFAULT_TICK_SIZE = 1_000_000_000n;

export async function findMintableBinaryPrimitiveCandidate(
  params: FindMintableBinaryPrimitiveCandidateOptions,
): Promise<FindMintableBinaryPrimitiveCandidateResult> {
  const config = resolveDeepBookPredictConfig(params.config);
  const candidates = derivePrimitiveMintableStrikeCandidates(params)
    .slice(0, params.maxCandidates ?? DEFAULT_PRIMITIVE_OFFSET_MULTIPLIERS.length * 2 + 1);
  const diagnostics = [
    "Primitive mintable strike search uses quote and binary mint preflight as authoritative gates.",
  ];
  const attempts: PrimitiveMintableStrikeAttempt[] = [];

  if (candidates.length === 0) {
    return {
      status: "not_found",
      candidate: null,
      attempts,
      blockers: ["No tick-aligned primitive strike candidates could be generated for the active market."],
      diagnostics,
    };
  }

  for (const candidate of candidates) {
    const result = await inspectPrimitiveMintableStrike({
      params,
      candidate,
      config,
    });

    attempts.push(result);

    if (
      result.quote &&
      result.mintPreflight?.status === "passed"
    ) {
      return {
        status: "found",
        candidate,
        quote: result.quote,
        preflight: result.mintPreflight,
        attempts,
        diagnostics,
      };
    }
  }

  return {
    status: "not_found",
    candidate: null,
    attempts,
    blockers: [...new Set(attempts
      .filter((a) => a.blocker !== null)
      .map((a) => a.message ?? a.blocker!))],
    diagnostics,
  };
}

function derivePrimitiveMintableStrikeCandidates(
  params: Pick<FindMintableBinaryPrimitiveCandidateOptions,
    "oracleId" | "oracleObjectId" | "underlyingAsset" | "expiry" | "direction" |
    "spot" | "forward" | "tickSize" | "minStrike" | "offsetMultipliers"
  >,
): PrimitiveMintableStrikeCandidate[] {
  const minStrike = parseOptionalNonNegativeBigint(params.minStrike) ?? 0n;
  const tickSize = parseOptionalPositiveBigint(params.tickSize) ?? DEFAULT_TICK_SIZE;
  const forward = parseOptionalNonNegativeBigint(params.forward);
  const spot = parseOptionalNonNegativeBigint(params.spot);
  const anchor = forward ?? spot;
  const anchorSource = forward !== null ? "forward" as const : "spot" as const;

  if (anchor === null) {
    return [];
  }

  const expiry = integerStringOrNull(params.expiry);

  if (expiry === null) {
    return [];
  }

  const multipliers = normalizeOffsetMultipliers(params.offsetMultipliers);
  const offsets = buildDirectionalOffsets(params.direction, multipliers);
  const seen = new Set<string>();
  const candidates: PrimitiveMintableStrikeCandidate[] = [];

  for (const offset of offsets) {
    const rawStrike = anchor + tickSize * offset;

    if (rawStrike < minStrike) {
      continue;
    }

    const strike = roundDownToTick(rawStrike, minStrike, tickSize);

    if (strike < minStrike) {
      continue;
    }

    const key = `${params.oracleId}:${expiry}:${params.direction}:${strike}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    candidates.push({
      oracleId: params.oracleId,
      oracleObjectId: params.oracleObjectId,
      underlyingAsset: params.underlyingAsset ?? null,
      expiry,
      strike: strike.toString(),
      direction: params.direction,
      anchorSource,
      anchorPrice: anchor.toString(),
      offsetTicks: offset.toString(),
    });
  }

  return candidates;
}

function buildDirectionalOffsets(direction: MarketQuoteDirection, multipliers: bigint[]): bigint[] {
  const preferred: bigint[] = [];
  const secondary: bigint[] = [];

  for (const m of multipliers) {
    if (direction === "up") {
      preferred.push(m);
      if (m !== 0n) secondary.push(-m);
    } else {
      preferred.push(-m);
      if (m !== 0n) secondary.push(m);
    }
  }

  return [...preferred, ...secondary];
}

async function inspectPrimitiveMintableStrike({
  params,
  candidate,
  config,
}: {
  params: FindMintableBinaryPrimitiveCandidateOptions;
  candidate: PrimitiveMintableStrikeCandidate;
  config: DeepBookPredictNetworkConfig;
}): Promise<PrimitiveMintableStrikeAttempt> {
  let quote: MarketQuotePreview;

  try {
    quote = await devInspectBinaryQuote({
      client: params.client,
      sender: params.sender,
      oracleId: params.oracleId,
      oracleObjectId: params.oracleObjectId,
      expiry: params.expiry,
      direction: candidate.direction,
      strike: candidate.strike,
      quantity: params.quantity,
      config,
    });
  } catch (error) {
    const abort = classifyQuoteAbort(error);

    return {
      status: "failed",
      candidate,
      quote: null,
      mintPreflight: null,
      blocker: "quote_failed",
      message: abort.likelyCause ?? translateDeepBookPredictError(error, { family: "primitive" }),
      rawError: abort.message,
    };
  }

  if (!isPositiveAtomic(quote.mintCostAtomic)) {
    return {
      status: "failed",
      candidate,
      quote,
      mintPreflight: null,
      blocker: "non_positive_quote",
      message: "Primitive strike quote returned a non-positive mint cost.",
      rawError: null,
    };
  }

  const mintPreflight = await devInspectMintBinaryPreflight({
    client: params.client,
    sender: params.sender,
    managerId: params.managerId,
    oracleId: params.oracleId,
    oracleObjectId: params.oracleObjectId,
    expiry: params.expiry,
    direction: candidate.direction,
    strike: candidate.strike,
    quantity: params.quantity,
    config,
    candidateParams: {
      family: "primitive",
      direction: candidate.direction,
      strike: candidate.strike,
    },
  });

  if (mintPreflight.status === "failed") {
    return {
      status: "failed",
      candidate,
      quote,
      mintPreflight,
      blocker: isAssertMintableAskAbort(mintPreflight.abort) ? "assert_mintable_ask" : "mint_preflight_failed",
      message: mintPreflight.abort.likelyCause ?? mintPreflight.abort.message,
      rawError: mintPreflight.abort.message,
    };
  }

  return {
    status: "passed",
    candidate,
    quote,
    mintPreflight,
    blocker: null,
    message: null,
    rawError: null,
  };
}

function normalizeOffsetMultipliers(values: readonly (string | bigint)[] | undefined): bigint[] {
  const unique = new Set<string>();

  for (const value of values ?? DEFAULT_PRIMITIVE_OFFSET_MULTIPLIERS) {
    const parsed = parseOptionalNonNegativeBigint(value);

    if (parsed !== null) {
      unique.add(parsed.toString());
    }
  }

  return [...unique].map((v) => BigInt(v)).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}

function roundDownToTick(value: bigint, minStrike: bigint, tickSize: bigint): bigint {
  if (value <= minStrike) {
    return minStrike;
  }

  return minStrike + ((value - minStrike) / tickSize) * tickSize;
}

function roundUpToTick(value: bigint, minStrike: bigint, tickSize: bigint): bigint {
  const lower = roundDownToTick(value, minStrike, tickSize);
  return lower === value ? lower : lower + tickSize;
}

function isPositiveAtomic(value: string): boolean {
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

function parseOptionalNonNegativeBigint(value: string | bigint | null | undefined): bigint | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    const parsed = BigInt(value);
    return parsed >= 0n ? parsed : null;
  } catch {
    return null;
  }
}

function parseOptionalPositiveBigint(value: string | bigint | null | undefined): bigint | null {
  const parsed = parseOptionalNonNegativeBigint(value);
  return parsed !== null && parsed > 0n ? parsed : null;
}

function integerStringOrNull(value: unknown): string | null {
  if (typeof value === "bigint") {
    return value >= 0n ? value.toString() : null;
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return String(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return value;
  }

  return null;
}

const DEFAULT_RANGE_WIDTH_MULTIPLIERS = [10n, 20n, 50n, 100n, 200n, 500n] as const;
const RANGE_STRATEGIES: RangeQuoteCandidateStrategy[] = ["centered", "below-anchor", "above-anchor"];

export async function findMintableRangePrimitiveCandidate(
  params: FindMintableRangePrimitiveCandidateOptions,
): Promise<FindMintableRangePrimitiveCandidateResult> {
  const config = resolveDeepBookPredictConfig(params.config);
  const candidates = deriveRangePrimitiveMintableCandidates(params)
    .slice(0, params.maxCandidates ?? DEFAULT_RANGE_WIDTH_MULTIPLIERS.length * RANGE_STRATEGIES.length);
  const diagnostics = [
    "Range primitive mintable interval search uses range quote and range mint preflight as authoritative gates.",
  ];
  const attempts: RangePrimitiveMintableAttempt[] = [];

  if (candidates.length === 0) {
    const summary = buildRangeMintabilitySummary(attempts, candidates.length);

    return {
      status: "not_found",
      candidate: null,
      attempts,
      summary,
      blockers: ["No tick-aligned range interval candidates could be generated for the active market."],
      diagnostics,
    };
  }

  for (const candidate of candidates) {
    const result = await inspectRangePrimitiveMintableCandidate({
      params,
      candidate,
      config,
    });

    attempts.push(result);

    if (
      result.quote &&
      result.mintPreflight?.status === "passed"
    ) {
      const summary = buildRangeMintabilitySummary(attempts, candidates.length);

      return {
        status: "found",
        candidate,
        quote: result.quote,
        preflight: result.mintPreflight,
        attempts,
        summary,
        diagnostics,
      };
    }
  }

  const summary = buildRangeMintabilitySummary(attempts, candidates.length);

  return {
    status: "not_found",
    candidate: null,
    attempts,
    summary,
    blockers: buildRangeMintabilityBlockers(attempts, summary),
    diagnostics,
  };
}

function deriveRangePrimitiveMintableCandidates(
  params: Pick<FindMintableRangePrimitiveCandidateOptions,
    "oracleId" | "oracleObjectId" | "underlyingAsset" | "expiry" |
    "spot" | "forward" | "tickSize" | "minStrike" | "widthMultipliers"
  >,
): RangePrimitiveMintableCandidate[] {
  const minStrike = parseOptionalNonNegativeBigint(params.minStrike) ?? 0n;
  const tickSize = parseOptionalPositiveBigint(params.tickSize) ?? DEFAULT_TICK_SIZE;
  const forward = parseOptionalNonNegativeBigint(params.forward);
  const spot = parseOptionalNonNegativeBigint(params.spot);
  const anchor = forward ?? spot;
  const anchorSource = forward !== null ? "forward" as const : "spot" as const;

  if (anchor === null) {
    return [];
  }

  const expiry = integerStringOrNull(params.expiry);

  if (expiry === null) {
    return [];
  }

  const multipliers = normalizeWidthMultipliers(params.widthMultipliers);
  const seen = new Set<string>();
  const candidates: RangePrimitiveMintableCandidate[] = [];

  for (const widthTicks of multipliers) {
    const widthAtomic = tickSize * widthTicks;

    for (const strategy of RANGE_STRATEGIES) {
      let lower: bigint;
      let higher: bigint;

      if (strategy === "centered") {
        lower = roundDownToTick(anchor - widthAtomic / 2n, minStrike, tickSize);
        higher = lower + widthAtomic;
      } else if (strategy === "below-anchor") {
        higher = roundDownToTick(anchor, minStrike, tickSize);
        lower = higher - widthAtomic;
      } else {
        lower = roundUpToTick(anchor, minStrike, tickSize);
        higher = lower + widthAtomic;
      }

      if (lower < minStrike) {
        continue;
      }

      if (lower >= higher) {
        continue;
      }

      const key = `${params.oracleId}:${expiry}:${lower}:${higher}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      candidates.push({
        oracleId: params.oracleId,
        oracleObjectId: params.oracleObjectId,
        underlyingAsset: params.underlyingAsset ?? null,
        expiry,
        lowerStrike: lower.toString(),
        higherStrike: higher.toString(),
        widthTicks: widthTicks.toString(),
        widthMultiplier: widthTicks.toString(),
        anchorSource,
        anchorPrice: anchor.toString(),
        strategy,
      });
    }
  }

  return candidates;
}

function normalizeWidthMultipliers(values: readonly (string | bigint)[] | undefined): bigint[] {
  const unique = new Set<string>();

  for (const value of values ?? DEFAULT_RANGE_WIDTH_MULTIPLIERS) {
    const parsed = parseOptionalPositiveBigint(value);

    if (parsed !== null) {
      unique.add(parsed.toString());
    }
  }

  return [...unique].map((v) => BigInt(v)).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}

async function inspectRangePrimitiveMintableCandidate({
  params,
  candidate,
  config,
}: {
  params: FindMintableRangePrimitiveCandidateOptions;
  candidate: RangePrimitiveMintableCandidate;
  config: DeepBookPredictNetworkConfig;
}): Promise<RangePrimitiveMintableAttempt> {
  let quote: RangeQuotePreview;

  try {
    quote = await devInspectRangeQuote({
      client: params.client,
      sender: params.sender,
      oracleId: params.oracleId,
      oracleObjectId: params.oracleObjectId,
      expiry: params.expiry,
      lowerStrike: candidate.lowerStrike,
      higherStrike: candidate.higherStrike,
      quantity: params.quantity,
      config,
    });
  } catch (error) {
    const abort = classifyQuoteAbort(error);
    const failureFamily = classifyRangeMintabilityFailure(error, "quote_failed");
    const rawErrorSummary = summarizeRangeMintabilityError(error);

    return {
      status: "failed",
      candidate,
      quote: null,
      mintPreflight: null,
      blocker: "quote_failed",
      quoteStatus: "failed",
      quoteCostAtomic: null,
      preflightStatus: "skipped",
      failureFamily,
      message: abort.likelyCause ?? translateDeepBookPredictError(error, { family: "range" }),
      rawError: abort.message,
      rawErrorSummary,
    };
  }

  if (!isPositiveAtomic(quote.mintCostAtomic)) {
    return {
      status: "failed",
      candidate,
      quote,
      mintPreflight: null,
      blocker: "non_positive_quote",
      quoteStatus: "passed",
      quoteCostAtomic: quote.mintCostAtomic,
      preflightStatus: "skipped",
      failureFamily: "non_positive_quote",
      message: "Range interval quote returned a non-positive mint cost.",
      rawError: null,
      rawErrorSummary: null,
    };
  }

  const mintPreflight = await devInspectMintRangePreflight({
    client: params.client,
    sender: params.sender,
    managerId: params.managerId,
    oracleId: params.oracleId,
    oracleObjectId: params.oracleObjectId,
    expiry: params.expiry,
    lowerStrike: candidate.lowerStrike,
    higherStrike: candidate.higherStrike,
    quantity: params.quantity,
    config,
    candidateParams: {
      family: "range",
      lowerStrike: candidate.lowerStrike,
      higherStrike: candidate.higherStrike,
    },
  });

  if (mintPreflight.status === "failed") {
    const failureFamily = classifyRangeMintabilityFailure(
      mintPreflight.abort,
      isAssertMintableAskAbort(mintPreflight.abort) ? "assert_mintable_ask" : "preflight_failed",
    );

    return {
      status: "failed",
      candidate,
      quote,
      mintPreflight,
      blocker: isAssertMintableAskAbort(mintPreflight.abort) ? "assert_mintable_ask" : "mint_preflight_failed",
      quoteStatus: "passed",
      quoteCostAtomic: quote.mintCostAtomic,
      preflightStatus: "failed",
      failureFamily,
      message: mintPreflight.abort.likelyCause ?? mintPreflight.abort.message,
      rawError: mintPreflight.abort.message,
      rawErrorSummary: summarizeRangeMintabilityError(mintPreflight.abort),
    };
  }

  return {
    status: "passed",
    candidate,
    quote,
    mintPreflight,
    blocker: null,
    quoteStatus: "passed",
    quoteCostAtomic: quote.mintCostAtomic,
    preflightStatus: "passed",
    failureFamily: null,
    message: null,
    rawError: null,
    rawErrorSummary: null,
  };
}

function summarizeRangeMintabilityError(error: unknown): string {
  if (typeof error === "string") return truncateDiagnostic(error);
  if (error instanceof Error) return truncateDiagnostic(error.message);

  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return truncateDiagnostic(maybeMessage);

    try {
      return truncateDiagnostic(JSON.stringify(error));
    } catch {
      return "Unserializable RANGE mintability error.";
    }
  }

  return error === null || error === undefined
    ? "No RANGE mintability error detail."
    : truncateDiagnostic(String(error));
}

function truncateDiagnostic(value: string): string {
  return value.length > 300 ? `${value.slice(0, 300)}…` : value;
}

function classifyRangeMintabilityFailure(
  errorOrMessage: unknown,
  fallback: RangePrimitiveMintabilityFailureFamily,
): RangePrimitiveMintabilityFailureFamily {
  const detail = summarizeRangeMintabilityError(errorOrMessage).toLowerCase();

  if (
    detail.includes("rangekey") ||
    detail.includes("range key") ||
    detail.includes("range_key") ||
    detail.includes("could not construct")
  ) {
    return "key_builder_failed";
  }

  if (
    detail.includes("assert_mintable_ask") ||
    detail.includes("easkpriceoutofbounds") ||
    detail.includes("ask price out of bounds")
  ) {
    return "assert_mintable_ask";
  }

  if (
    detail.includes("oracle") &&
    (
      detail.includes("stale") ||
      detail.includes("expired") ||
      detail.includes("inactive") ||
      detail.includes("settled") ||
      detail.includes("live")
    )
  ) {
    return "assert_live_oracle";
  }

  if (
    detail.includes("invalid bounds") ||
    detail.includes("lowerstrike") ||
    detail.includes("higherstrike") ||
    detail.includes("lower strike") ||
    detail.includes("higher strike")
  ) {
    return "invalid_bounds";
  }

  return fallback;
}

function buildRangeMintabilitySummary(
  attempts: RangePrimitiveMintableAttempt[],
  totalCandidates = attempts.length,
): RangePrimitiveMintabilitySummary {
  const diagnostics = attempts.map(toRangeCandidateDiagnostic);
  const failures = diagnostics.filter((diagnostic) => diagnostic.failureFamily !== null);
  const failureCountsByFamily: Partial<Record<RangePrimitiveMintabilityFailureFamily, number>> = {};

  for (const failure of failures) {
    if (!failure.failureFamily) continue;
    failureCountsByFamily[failure.failureFamily] = (failureCountsByFamily[failure.failureFamily] ?? 0) + 1;
  }

  return {
    totalCandidates,
    quotedCandidates: diagnostics.filter((diagnostic) => diagnostic.quoteStatus === "passed").length,
    preflightPassedCandidates: diagnostics.filter((diagnostic) => diagnostic.preflightStatus === "passed").length,
    failureCountsByFamily,
    firstFewFailures: failures.slice(0, 5),
    lastFailure: failures.length > 0 ? failures[failures.length - 1] : null,
  };
}

function toRangeCandidateDiagnostic(
  attempt: RangePrimitiveMintableAttempt,
): RangePrimitiveMintableCandidateDiagnostic {
  return {
    candidate: attempt.candidate,
    quoteStatus: attempt.quoteStatus,
    quoteCostAtomic: attempt.quoteCostAtomic,
    preflightStatus: attempt.preflightStatus,
    failureFamily: attempt.failureFamily,
    message: attempt.message,
    rawErrorSummary: attempt.rawErrorSummary,
  };
}

function buildRangeMintabilityBlockers(
  attempts: RangePrimitiveMintableAttempt[],
  summary: RangePrimitiveMintabilitySummary,
): string[] {
  if (summary.totalCandidates === 0) {
    return ["No tick-aligned range interval candidates could be generated for the active market."];
  }

  if (summary.failureCountsByFamily.key_builder_failed) {
    return [RANGE_KEY_BUILDER_FAILED_MESSAGE];
  }

  if (summary.quotedCandidates === 0) {
    return [RANGE_QUOTE_FAILED_MESSAGE];
  }

  if (summary.failureCountsByFamily.assert_mintable_ask) {
    return [RANGE_PRIMITIVE_NOT_MINTABLE_MESSAGE];
  }

  if (summary.failureCountsByFamily.assert_live_oracle) {
    return ["Active BTC market may be stale or no longer live for RANGE minting."];
  }

  const blockers = [...new Set(attempts
    .filter((attempt) => attempt.blocker !== null)
    .map((attempt) => attempt.message ?? attempt.blocker!))];

  return blockers.length > 0 ? blockers : ["No RANGE candidate passed mint preflight."];
}
