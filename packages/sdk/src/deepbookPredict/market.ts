import type {
  DeepBookPredictNetworkConfig,
  DeepBookPredictOracleRecord,
  MarketQuoteAttempt,
  MarketQuoteCandidate,
  PrimitiveActiveMarketContext,
  PrimitiveActiveMarketDiscoveryResult,
  PrimitiveMarketStatus,
} from "@rangepilot/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import { translateDeepBookPredictError } from "./errors.ts";
import {
  deriveMarketQuoteCandidates,
  scanBinaryQuoteSanity,
} from "./quote.ts";
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
    suggestedLowerStrike: downCandidate?.strike?.toString() ?? null,
    suggestedUpperStrike: upCandidate?.strike?.toString() ?? null,
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
