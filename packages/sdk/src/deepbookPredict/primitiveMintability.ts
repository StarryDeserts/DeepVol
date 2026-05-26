import type {
  DeepBookPredictNetworkConfig,
  FindMintableBinaryPrimitiveCandidateOptions,
  FindMintableBinaryPrimitiveCandidateResult,
  MarketQuoteDirection,
  MarketQuotePreview,
  PrimitiveMintableStrikeAttempt,
  PrimitiveMintableStrikeCandidate,
} from "@rangepilot/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import {
  isAssertMintableAskAbort,
  translateDeepBookPredictError,
} from "./errors.ts";
import {
  classifyQuoteAbort,
  devInspectBinaryQuote,
} from "./quote.ts";
import { devInspectMintBinaryPreflight } from "./trade.ts";

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
