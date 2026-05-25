import type {
  BtcMoveMintableLegDiagnostics,
  BtcMoveMintableRangeAttempt,
  BtcMoveMintableRangeCandidate,
  DeepBookPredictNetworkConfig,
  DeepBookPredictOracleRecord,
  FindMintableBtcMoveRangeCandidateOptions,
  FindMintableBtcMoveRangeCandidateResult,
  MarketQuoteAttempt,
  MarketQuoteCandidate,
  MarketQuoteDirection,
  MarketQuotePreview,
  PrimitiveActiveMarketContext,
  PrimitiveActiveMarketDiscoveryResult,
  PrimitiveMarketStatus,
} from "@rangepilot/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import {
  formatBtcMoveMintabilityError,
  isAssertMintableAskAbort,
  translateDeepBookPredictError,
} from "./errors.ts";
import {
  classifyQuoteAbort,
  deriveMarketQuoteCandidates,
  devInspectBinaryQuote,
  scanBinaryQuoteSanity,
} from "./quote.ts";
import { devInspectMintBinaryPreflight } from "./trade.ts";
import {
  createDeepBookPredictServerClient,
  type DeepBookPredictServerClient,
} from "./server.ts";

export type DiscoverActiveBtcPrimitiveMarketParams = {
  client: {
    devInspectTransactionBlock(input: {
      sender: string;
      transactionBlock: unknown;
    }): Promise<unknown>;
  };
  sender: string;
  server?: DeepBookPredictServerClient;
  config?: DeepBookPredictNetworkConfig;
  underlyingAsset?: string;
  nowMs?: number;
  maxOracles?: number;
  maxCandidatesPerOracle?: number;
  quantities?: readonly (string | bigint)[];
};

const DEFAULT_UNDERLYING_ASSET = "BTC";
const DEFAULT_MAX_ORACLES = 4;
const DEFAULT_MAX_CANDIDATES_PER_ORACLE = 18;
const DEFAULT_QUANTITIES = ["1000", "10000"] as const;
const DEFAULT_BTC_MOVE_TICK_SIZE = 1_000_000_000n;
const BTC_MOVE_WIDTH_MULTIPLIERS = [10n, 20n, 50n, 100n, 200n, 500n] as const;

export function classifyPrimitiveMarketStatus(input: {
  oracleStatus?: string | null;
  expiry?: string | bigint | number | null;
  nowMs?: number;
  diagnostics?: readonly string[];
}): PrimitiveMarketStatus {
  const nowMs = integerStringOrNull(input.nowMs ?? Date.now());
  const expiry = integerStringOrNull(input.expiry);

  if (nowMs === null || expiry === null) {
    return "unknown";
  }

  if (BigInt(expiry) <= BigInt(nowMs)) {
    return "expired";
  }

  if (input.oracleStatus !== "active") {
    return input.oracleStatus ? "stale" : "unknown";
  }

  if (input.diagnostics?.some((entry) => entry.toLowerCase().includes("stale"))) {
    return "stale";
  }

  return "live";
}

export async function discoverActiveBtcPrimitiveMarket(
  params: DiscoverActiveBtcPrimitiveMarketParams,
): Promise<PrimitiveActiveMarketDiscoveryResult> {
  const diagnostics: string[] = [];
  let positiveCandidates: MarketQuoteCandidate[] = [];

  try {
    const config = resolveDeepBookPredictConfig(params.config);
    const server = params.server ?? createDeepBookPredictServerClient({ config });
    const nowMs = params.nowMs ?? Date.now();
    const underlyingAsset = params.underlyingAsset ?? DEFAULT_UNDERLYING_ASSET;
    const oracles = await server.getOracles(config.predictId);
    const active = selectActiveBtcOracles({
      oracles,
      underlyingAsset,
      nowMs,
      maxOracles: params.maxOracles ?? DEFAULT_MAX_ORACLES,
    });

    if (active.length === 0) {
      return {
        status: "not_found",
        market: null,
        candidates: [],
        diagnostics: [
          `No active ${underlyingAsset} oracle with future expiry was returned by the DeepBook Predict public server.`,
        ],
      };
    }

    for (const oracle of active) {
      const oracleId = stringOrNull(oracle.oracle_id);

      if (oracleId === null) {
        diagnostics.push("Skipping active oracle record without oracle_id.");
        continue;
      }

      const oracleDiagnostics: string[] = [];
      let oracleRecord = oracle;
      let latestPrice: Record<string, unknown> | null = null;

      try {
        const state = await server.getOracleState(oracleId);

        if (isRecord(state.oracle)) {
          oracleRecord = state.oracle as DeepBookPredictOracleRecord;
        }

        if (isRecord(state.latest_price)) {
          latestPrice = state.latest_price;
        }
      } catch (error) {
        oracleDiagnostics.push(
          `Oracle state unavailable for ${oracleId}: ${translateDeepBookPredictError(error)}`,
        );
      }

      if (latestPrice === null) {
        try {
          const price = await server.getLatestOraclePrice(oracleId);

          if (isRecord(price)) {
            latestPrice = price;
          }
        } catch (error) {
          oracleDiagnostics.push(
            `Latest oracle price unavailable for ${oracleId}: ${translateDeepBookPredictError(error)}`,
          );
        }
      }

      const minStrike = integerStringOrNull(oracleRecord.min_strike);
      const tickSize = integerStringOrNull(oracleRecord.tick_size);
      const expiry = integerStringOrNull(oracleRecord.expiry);
      const spot = integerStringOrNull(latestPrice?.spot);
      const forward = integerStringOrNull(latestPrice?.forward);

      if (
        minStrike === null ||
        tickSize === null ||
        BigInt(tickSize) <= 0n ||
        expiry === null ||
        (spot === null && forward === null)
      ) {
        diagnostics.push(
          ...oracleDiagnostics,
          `Oracle ${oracleId} is missing strike grid, positive tick size, expiry, or spot/forward anchors.`,
        );
        continue;
      }

      const candidates = deriveMarketQuoteCandidates({
        oracleId,
        oracleObjectId: oracleId,
        underlyingAsset: stringOrNull(oracleRecord.underlying_asset),
        expiry,
        minStrike,
        tickSize,
        spot,
        forward,
      }).slice(0, params.maxCandidatesPerOracle ?? DEFAULT_MAX_CANDIDATES_PER_ORACLE);

      const attempts = await scanBinaryQuoteSanity({
        candidates,
        client: params.client,
        sender: params.sender,
        quantities: params.quantities ?? DEFAULT_QUANTITIES,
        config,
      });
      const successfulCandidates = selectPositiveMintCostCandidates({
        candidates,
        attempts,
      });

      if (successfulCandidates.length === 0) {
        diagnostics.push(
          ...oracleDiagnostics,
          `Oracle ${oracleId} did not produce a positive UP/DOWN quote within browser scan limits.`,
        );
        continue;
      }

      positiveCandidates = positiveCandidates.length > 0 ? positiveCandidates : successfulCandidates;

      const market = buildPrimitiveMarketContext({
        oracle: oracleRecord,
        latestPrice,
        candidates: successfulCandidates,
        nowMs,
        diagnostics: oracleDiagnostics,
      });
      const resultDiagnostics = [...diagnostics, ...oracleDiagnostics];

      if (market.status === "live") {
        return {
          status: "found",
          market,
          candidates: successfulCandidates,
          diagnostics: resultDiagnostics,
        };
      }

      diagnostics.push(
        ...oracleDiagnostics,
        `Oracle ${oracleId} produced positive quotes but built market status is ${market.status}; active primitive trading requires live status.`,
      );
    }

    return {
      status: "not_found",
      market: null,
      candidates: positiveCandidates,
      diagnostics: diagnostics.length > 0
        ? diagnostics
        : ["No quoteable active BTC primitive market was found."],
    };
  } catch (error) {
    return {
      status: "error",
      market: null,
      candidates: positiveCandidates,
      diagnostics,
      error: translateDeepBookPredictError(error),
    };
  }
}

export async function findMintableBtcMoveRangeCandidate(
  params: FindMintableBtcMoveRangeCandidateOptions,
): Promise<FindMintableBtcMoveRangeCandidateResult> {
  const config = resolveDeepBookPredictConfig(params.config);
  const candidates = deriveBtcMoveMintableRangeCandidates(params).slice(0, params.maxCandidates ?? BTC_MOVE_WIDTH_MULTIPLIERS.length);
  const diagnostics = [
    "Ask-bounds filtering is diagnostic-only for BTC MOVE range search; quote and binary mint preflight remain authoritative.",
  ];
  const attempts: BtcMoveMintableRangeAttempt[] = [];

  if (candidates.length === 0) {
    return {
      status: "not_found",
      candidate: null,
      attempts,
      blockers: ["No tick-aligned BTC MOVE range candidates could be generated for the active market."],
      diagnostics,
    };
  }

  for (const candidate of candidates) {
    const up = await inspectBtcMoveMintableLeg({
      params,
      candidate,
      config,
      direction: "up",
      strike: candidate.upperStrike,
      preflightBlocker: "up_mint_preflight_failed",
    });
    const down = await inspectBtcMoveMintableLeg({
      params,
      candidate,
      config,
      direction: "down",
      strike: candidate.lowerStrike,
      preflightBlocker: "down_mint_preflight_failed",
    });
    const blockers = [...new Set([up, down]
      .flatMap((leg) => leg.blocker ? [leg.message ?? leg.blocker] : []))];
    const attempt: BtcMoveMintableRangeAttempt = {
      status: blockers.length === 0 ? "passed" : "failed",
      candidate,
      up,
      down,
      blockers,
    };

    attempts.push(attempt);

    if (
      up.quote &&
      down.quote &&
      up.mintPreflight?.status === "passed" &&
      down.mintPreflight?.status === "passed"
    ) {
      return {
        status: "found",
        candidate,
        upQuote: up.quote,
        downQuote: down.quote,
        upPreflight: up.mintPreflight,
        downPreflight: down.mintPreflight,
        attempts,
        diagnostics,
      };
    }
  }

  return {
    status: "not_found",
    candidate: null,
    attempts,
    blockers: [...new Set(attempts.flatMap((attempt) => attempt.blockers))],
    diagnostics,
  };
}

function deriveBtcMoveMintableRangeCandidates(
  params: Pick<FindMintableBtcMoveRangeCandidateOptions,
    "oracleId" | "oracleObjectId" | "underlyingAsset" | "expiry" | "spot" | "forward" | "tickSize" | "minStrike" | "widthMultipliers"
  >,
): BtcMoveMintableRangeCandidate[] {
  const minStrike = parseOptionalNonNegativeBigint(params.minStrike) ?? 0n;
  const tickSize = parseOptionalPositiveBigint(params.tickSize) ?? DEFAULT_BTC_MOVE_TICK_SIZE;
  const forward = parseOptionalNonNegativeBigint(params.forward);
  const spot = parseOptionalNonNegativeBigint(params.spot);
  const anchor = forward ?? spot;
  const anchorSource = forward !== null ? "forward" : "spot";

  if (anchor === null) {
    return [];
  }

  const expiry = integerStringOrNull(params.expiry);

  if (expiry === null) {
    return [];
  }

  const candidates = new Map<string, BtcMoveMintableRangeCandidate>();

  for (const multiplier of normalizeBtcMoveWidthMultipliers(params.widthMultipliers)) {
    const width = tickSize * multiplier;
    const rawLower = anchor > width ? anchor - width : minStrike;
    const rawUpper = anchor + width;
    const lower = roundDownToTick(rawLower, minStrike, tickSize);
    const upper = roundUpToTick(rawUpper, minStrike, tickSize);

    if (lower < minStrike || lower >= upper || upper - lower <= tickSize) {
      continue;
    }

    const candidate: BtcMoveMintableRangeCandidate = {
      oracleId: params.oracleId,
      oracleObjectId: params.oracleObjectId,
      underlyingAsset: params.underlyingAsset ?? null,
      expiry,
      lowerStrike: lower.toString(),
      upperStrike: upper.toString(),
      widthAtomic: (upper - lower).toString(),
      widthTicks: ((upper - lower) / tickSize).toString(),
      anchorSource,
      anchorPrice: anchor.toString(),
    };
    candidates.set(`${candidate.oracleId}:${candidate.expiry}:${candidate.lowerStrike}:${candidate.upperStrike}`, candidate);
  }

  return [...candidates.values()];
}

async function inspectBtcMoveMintableLeg({
  params,
  candidate,
  config,
  direction,
  strike,
  preflightBlocker,
}: {
  params: FindMintableBtcMoveRangeCandidateOptions;
  candidate: BtcMoveMintableRangeCandidate;
  config: DeepBookPredictNetworkConfig;
  direction: MarketQuoteDirection;
  strike: string;
  preflightBlocker: "up_mint_preflight_failed" | "down_mint_preflight_failed";
}): Promise<BtcMoveMintableLegDiagnostics> {
  let quote: MarketQuotePreview;

  try {
    quote = await devInspectBinaryQuote({
      client: params.client,
      sender: params.sender,
      oracleId: params.oracleId,
      oracleObjectId: params.oracleObjectId,
      expiry: params.expiry,
      direction,
      strike,
      quantity: params.quantity,
      config,
    });
  } catch (error) {
    const abort = classifyQuoteAbort(error);

    return {
      direction,
      strike,
      quote: null,
      mintPreflight: null,
      blocker: "quote_failed",
      message: abort.likelyCause ?? translateDeepBookPredictError(error),
      rawError: abort.message,
    };
  }

  if (!isPositiveAtomic(quote.mintCostAtomic)) {
    return {
      direction,
      strike,
      quote,
      mintPreflight: null,
      blocker: "non_positive_quote",
      message: "BTC MOVE leg quote returned a non-positive mint cost.",
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
    direction,
    strike,
    quantity: params.quantity,
    config,
    candidateParams: {
      family: "btc_move",
      lowerStrike: candidate.lowerStrike,
      higherStrike: candidate.upperStrike,
      widthTicks: candidate.widthTicks,
      direction,
      strike,
    },
  });

  if (mintPreflight.status === "failed") {
    const friendly = formatBtcMoveMintabilityError(mintPreflight.abort);

    return {
      direction,
      strike,
      quote,
      mintPreflight,
      blocker: isAssertMintableAskAbort(mintPreflight.abort) ? "assert_mintable_ask" : preflightBlocker,
      message: friendly ?? mintPreflight.abort.likelyCause ?? mintPreflight.abort.message,
      rawError: mintPreflight.abort.message,
    };
  }

  return {
    direction,
    strike,
    quote,
    mintPreflight,
    blocker: null,
    message: null,
    rawError: null,
  };
}

function normalizeBtcMoveWidthMultipliers(values: readonly (string | bigint)[] | undefined): bigint[] {
  const unique = new Set<string>();

  for (const value of values ?? BTC_MOVE_WIDTH_MULTIPLIERS) {
    const parsed = parseOptionalPositiveBigint(value);

    if (parsed !== null) {
      unique.add(parsed.toString());
    }
  }

  return [...unique].map((value) => BigInt(value)).sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
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

function selectActiveBtcOracles(params: {
  oracles: readonly DeepBookPredictOracleRecord[];
  underlyingAsset: string;
  nowMs: number;
  maxOracles: number;
}): DeepBookPredictOracleRecord[] {
  return params.oracles
    .filter((oracle) => oracle.status === "active")
    .filter((oracle) => stringOrNull(oracle.underlying_asset) === params.underlyingAsset)
    .filter((oracle) => {
      const expiry = integerStringOrNull(oracle.expiry);
      return expiry !== null && BigInt(expiry) > BigInt(params.nowMs);
    })
    .sort(compareOracleExpiry)
    .slice(0, params.maxOracles);
}

function buildPrimitiveMarketContext(params: {
  oracle: DeepBookPredictOracleRecord;
  latestPrice: Record<string, unknown> | null;
  candidates: readonly MarketQuoteCandidate[];
  nowMs: number;
  diagnostics: string[];
}): PrimitiveActiveMarketContext {
  const oracleId = stringOrNull(params.oracle.oracle_id) ?? "";
  const expiry = integerStringOrNull(params.oracle.expiry) ?? "";
  const minStrike = integerStringOrNull(params.oracle.min_strike);
  const tickSize = integerStringOrNull(params.oracle.tick_size);
  const spot = integerStringOrNull(params.latestPrice?.spot);
  const forward = integerStringOrNull(params.latestPrice?.forward);
  const upCandidate = params.candidates.find((candidate) => candidate.direction === "up") ?? null;
  const downCandidate = params.candidates.find((candidate) => candidate.direction === "down") ?? null;

  let suggestedLowerStrike = downCandidate?.strike?.toString() ?? null;
  let suggestedUpperStrike = upCandidate?.strike?.toString() ?? null;

  if (
    suggestedLowerStrike !== null &&
    suggestedUpperStrike !== null &&
    BigInt(suggestedLowerStrike) >= BigInt(suggestedUpperStrike) &&
    tickSize !== null &&
    BigInt(tickSize) > 0n
  ) {
    const anchor = BigInt(suggestedLowerStrike);
    suggestedLowerStrike = (anchor - BigInt(tickSize)).toString();
    suggestedUpperStrike = (anchor + BigInt(tickSize)).toString();
  }

  return {
    oracleId,
    oracleObjectId: oracleId,
    underlyingAsset: stringOrNull(params.oracle.underlying_asset),
    expiry,
    minStrike,
    tickSize,
    spot,
    forward,
    status: classifyPrimitiveMarketStatus({
      oracleStatus: stringOrNull(params.oracle.status),
      expiry,
      nowMs: params.nowMs,
      diagnostics: params.diagnostics,
    }),
    source: "active_oracle_discovery",
    suggestedUpStrike: upCandidate?.strike?.toString() ?? null,
    suggestedDownStrike: downCandidate?.strike?.toString() ?? null,
    suggestedLowerStrike,
    suggestedUpperStrike,
    diagnostics: params.diagnostics,
  };
}

function selectPositiveMintCostCandidates(params: {
  candidates: readonly MarketQuoteCandidate[];
  attempts: readonly MarketQuoteAttempt[];
}): MarketQuoteCandidate[] {
  const selected = new Map<string, MarketQuoteCandidate>();

  for (const attempt of params.attempts) {
    if (attempt.status !== "success") {
      continue;
    }

    const mintCost = integerStringOrNull(attempt.mintCostAtomic);

    if (mintCost === null || BigInt(mintCost) <= 0n) {
      continue;
    }

    const candidate = params.candidates.find((entry) =>
      entry.oracleId === attempt.oracleId &&
      String(entry.expiry) === String(attempt.expiry) &&
      String(entry.strike) === String(attempt.strike) &&
      entry.direction === attempt.direction,
    );

    if (candidate) {
      selected.set(marketCandidateKey(candidate), candidate);
    }
  }

  return [...selected.values()];
}

function marketCandidateKey(candidate: MarketQuoteCandidate): string {
  return [
    candidate.oracleId,
    String(candidate.expiry),
    String(candidate.strike),
    candidate.direction,
  ].join(":");
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

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareOracleExpiry(
  left: DeepBookPredictOracleRecord,
  right: DeepBookPredictOracleRecord,
): number {
  const leftExpiry = integerStringOrNull(left.expiry);
  const rightExpiry = integerStringOrNull(right.expiry);

  if (leftExpiry === null && rightExpiry === null) return 0;
  if (leftExpiry === null) return 1;
  if (rightExpiry === null) return -1;

  const leftValue = BigInt(leftExpiry);
  const rightValue = BigInt(rightExpiry);
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}
