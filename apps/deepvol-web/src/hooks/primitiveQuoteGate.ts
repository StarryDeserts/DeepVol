import type { VolSeries } from "@rangepilot/types/deepVol";
import type { PrimitiveMarketStatus } from "@rangepilot/types/deepbookPredict";
import type { PrimitivePreflightStatus } from "./usePrimitivePreflight";
import type { PrimitiveQuoteStatus } from "./usePrimitiveQuote";

export type PrimitiveKind = "UP" | "DOWN" | "RANGE";

export type PrimitiveInputState = {
  primitiveKind: PrimitiveKind;
  walletAddress: string | null;
  walletConnected: boolean;
  walletTestnet: boolean;
  series: VolSeries | null;
  oracleObjectId: string | null;
  marketStatus: PrimitiveMarketStatus | null;
  marketStatusMessage: string | null;
  quantity: string | null;
  strike: string | null;
  lowerStrike: string | null;
  upperStrike: string | null;
  predictManagerId?: string | null;
  mintCostAtomic?: string | null;
  redeemPayoutAtomic?: string | null;
  quoteDependencyKey?: string | null;
  preflightQuoteDependencyKey?: string | null;
};

export type PrimitiveExecutionInput = PrimitiveInputState & {
  quoteStatus: PrimitiveQuoteStatus;
  quotedAtMs: number | null;
  quoteDependencyKey: string | null;
  expectedQuoteDependencyKey: string;
  preflightStatus: PrimitivePreflightStatus;
  preflightDependencyKey: string | null;
  expectedPreflightDependencyKey: string;
  preflightLastRunAtMs: number | null;
  managerBalanceAtomic: string | null;
  isSubmitting: boolean;
  primitiveMintabilityStatus?: "idle" | "blocked" | "running" | "passed" | "failed" | null;
  nowMs?: number;
};

export const PRIMITIVE_RANGE_EXECUTION_DISABLED_BLOCKER = "RANGE wallet execution remains disabled until dedicated mintability validation passes.";
export const PRIMITIVE_MARKET_REFRESH_BLOCKER = "Refresh the active BTC market before trading this primitive.";
export const PRIMITIVE_MARKET_NON_LIVE_BLOCKER = "Selected BTC market is no longer live for new primitive minting.";
export const PRIMITIVE_QUOTE_FRESHNESS_MS = 120_000;
export const PRIMITIVE_PREFLIGHT_FRESHNESS_MS = 120_000;

function buildPrimitiveMarketBlockers(input: PrimitiveInputState): string[] {
  if (!input.marketStatus || input.marketStatus === "unknown") {
    return [PRIMITIVE_MARKET_REFRESH_BLOCKER];
  }
  if (input.marketStatus !== "live") {
    return [input.marketStatusMessage ?? PRIMITIVE_MARKET_NON_LIVE_BLOCKER];
  }
  return [];
}

export function buildPrimitiveQuoteBlockers(input: PrimitiveInputState): string[] {
  const blockers: string[] = [];

  if (!input.walletConnected || !input.walletAddress) {
    blockers.push("Connect a Sui wallet before refreshing primitive quotes.");
  }

  if (input.walletConnected && !input.walletTestnet) {
    blockers.push("Switch the connected wallet to Sui Testnet before refreshing primitive quotes.");
  }

  if (!input.series) {
    blockers.push("Active BTC primitive market must be loaded before primitive quotes.");
  }

  blockers.push(...buildPrimitiveMarketBlockers(input));

  if (input.series && !input.series.active) {
    blockers.push("Configured BTC MOVE VolSeries is inactive.");
  }

  if (input.series && BigInt(input.series.lowerStrike) >= BigInt(input.series.upperStrike)) {
    blockers.push("Configured BTC MOVE VolSeries has invalid strike ordering.");
  }

  if (!input.quantity) {
    blockers.push("Enter a positive integer quantity for primitive quote.");
  }

  if ((input.primitiveKind === "UP" || input.primitiveKind === "DOWN") && !input.strike) {
    blockers.push("Enter a positive strike for UP/DOWN primitive quote.");
  }

  if (input.primitiveKind === "RANGE") {
    if (!input.lowerStrike || !input.upperStrike) {
      blockers.push("Enter positive lower and upper strikes for RANGE primitive quote.");
    } else if (BigInt(input.lowerStrike) >= BigInt(input.upperStrike)) {
      blockers.push("RANGE lower strike must be below upper strike.");
    }
  }

  return [...new Set(blockers)];
}

export function buildPrimitivePreflightBlockers(input: PrimitiveInputState): string[] {
  const blockers = [...buildPrimitiveQuoteBlockers(input)];

  if (!input.predictManagerId) {
    blockers.push("Enter a PredictManager ID before running primitive mint preflight.");
  }

  if (!input.mintCostAtomic || !input.redeemPayoutAtomic) {
    blockers.push("Refresh a fresh primitive quote before running mint preflight.");
  }

  if (input.quoteDependencyKey && input.preflightQuoteDependencyKey && input.quoteDependencyKey !== input.preflightQuoteDependencyKey) {
    blockers.push("Run primitive mint preflight again for the current quote and wallet state.");
  }

  return [...new Set(blockers)];
}

export function buildPrimitiveExecutionBlockers(input: PrimitiveExecutionInput): string[] {
  const blockers = [...buildPrimitivePreflightBlockers(input)];
  const nowMs = input.nowMs ?? Date.now();

  if (input.primitiveKind === "RANGE") {
    blockers.push(PRIMITIVE_RANGE_EXECUTION_DISABLED_BLOCKER);
  }

  if (input.primitiveKind !== "RANGE" && input.primitiveMintabilityStatus !== "passed") {
    blockers.push(`Validate a mintable ${input.primitiveKind} strike before buying.`);
  }

  if (input.isSubmitting) {
    blockers.push("Wait for the current primitive wallet request to finish.");
  }

  if (input.quoteStatus !== "ready" || !input.mintCostAtomic || !input.redeemPayoutAtomic || !input.quotedAtMs) {
    blockers.push("Refresh quote before wallet review.");
  }

  if (input.mintCostAtomic && BigInt(input.mintCostAtomic) <= 0n) {
    blockers.push("Primitive mint cost must be positive before wallet review.");
  }

  if (!input.quoteDependencyKey || input.quoteDependencyKey !== input.expectedQuoteDependencyKey) {
    blockers.push("Refresh quote before wallet review.");
  }

  if (input.quotedAtMs && nowMs - input.quotedAtMs > PRIMITIVE_QUOTE_FRESHNESS_MS) {
    blockers.push("Primitive quote expired; refresh quote before wallet review.");
  }

  if (input.preflightStatus !== "passed" || !input.preflightLastRunAtMs) {
    blockers.push("Run primitive mint preflight again for the current quote and wallet state.");
  }

  if (!input.preflightDependencyKey || input.preflightDependencyKey !== input.expectedPreflightDependencyKey) {
    blockers.push("Run primitive mint preflight again for the current quote and wallet state.");
  }

  if (input.preflightLastRunAtMs && nowMs - input.preflightLastRunAtMs > PRIMITIVE_PREFLIGHT_FRESHNESS_MS) {
    blockers.push("Primitive mint preflight expired; run preflight again before wallet review.");
  }

  if (!input.managerBalanceAtomic) {
    blockers.push("PredictManager DUSDC balance must be read before wallet review.");
  }

  if (input.managerBalanceAtomic && input.mintCostAtomic && BigInt(input.managerBalanceAtomic) < BigInt(input.mintCostAtomic)) {
    blockers.push("PredictManager DUSDC balance must cover the current mint cost.");
  }

  return [...new Set(blockers)];
}

export function buildPrimitiveQuoteDependencyKey(input: PrimitiveInputState): string {
  return [
    input.walletAddress ?? "no-wallet",
    input.walletTestnet ? "testnet" : "not-testnet",
    input.series?.seriesId ?? "no-series",
    input.series?.oracleId ?? "no-oracle",
    input.oracleObjectId ?? "no-oracle-object",
    input.series?.expiry ?? "no-expiry",
    input.marketStatus ?? "no-market-status",
    input.primitiveKind,
    input.quantity ?? "no-quantity",
    input.strike ?? "no-strike",
    input.lowerStrike ?? "no-lower",
    input.upperStrike ?? "no-upper",
  ].join(":");
}

export function buildPrimitivePreflightDependencyKey(input: PrimitiveInputState): string {
  return [
    buildPrimitiveQuoteDependencyKey(input),
    input.predictManagerId ?? "no-manager",
  ].join(":");
}
