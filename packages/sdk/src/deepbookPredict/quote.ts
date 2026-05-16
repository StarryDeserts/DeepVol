import { Transaction } from "@mysten/sui/transactions";
import type {
  DeepBookPredictNetworkConfig,
  RangeKeyInput,
  RangeQuoteAbortClassification,
  RangeQuoteAttempt,
  RangeQuoteCandidate,
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
const DEFAULT_RANGE_WIDTH_TICKS = [1n, 5n, 10n, 25n, 50n, 100n, 250n] as const;

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

  const decoded = decodeDevInspectU64Pair(result);

  if (!decoded) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "MUST CONFIRM BEFORE CODING: get_range_trade_amounts devInspect return shape did not decode to an unambiguous pair of u64 values.",
    );
  }

  return {
    rangeKey: normalizeRangeKeyInput(params),
    quantity: normalizePositiveInteger(params.quantity, "Range quote quantity"),
    mintCostAtomic: decoded.mintCostAtomic,
    redeemPayoutAtomic: decoded.redeemPayoutAtomic,
    source: "devInspect",
  };
}

export function decodeDevInspectU64Pair(result: unknown): DecodedRangeQuoteAmounts | null {
  const returnValues = extractReturnValues(result);
  const u64Values = returnValues
    .map(decodeU64ReturnValue)
    .filter((value): value is string => value !== null);

  if (u64Values.length !== 2 || u64Values.length !== returnValues.length) {
    return null;
  }

  return {
    mintCostAtomic: u64Values[0],
    redeemPayoutAtomic: u64Values[1],
  };
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
  const widths = input.widthTicks ?? DEFAULT_RANGE_WIDTH_TICKS;
  const candidates = new Map<string, RangeQuoteCandidate>();

  for (const anchor of deriveAnchors(input)) {
    const anchorStrike = snapToStrike(anchor.price, minStrike, tickSize);

    for (const widthValue of widths) {
      const widthTicks = BigInt(normalizePositiveInteger(widthValue, "Range candidate width ticks"));
      const widthAtomic = widthTicks * tickSize;
      const leftTicks = widthTicks / 2n;
      let lowerStrike = anchorStrike - leftTicks * tickSize;

      if (lowerStrike < minStrike) {
        lowerStrike = minStrike;
      }

      let higherStrike = lowerStrike + widthAtomic;

      if (higherStrike <= anchorStrike) {
        higherStrike = anchorStrike + tickSize;
        lowerStrike = higherStrike - widthAtomic;

        if (lowerStrike < minStrike) {
          lowerStrike = minStrike;
          higherStrike = lowerStrike + widthAtomic;
        }
      }

      const candidate: RangeQuoteCandidate = {
        oracleId: input.oracleId,
        oracleObjectId: input.oracleObjectId,
        underlyingAsset: input.underlyingAsset,
        expiry,
        lowerStrike: lowerStrike.toString(),
        higherStrike: higherStrike.toString(),
        widthTicks: widthTicks.toString(),
        anchorSource: anchor.source,
        anchorPrice: anchor.price.toString(),
      };

      if (isQuoteableRangeCandidate(candidate)) {
        const key = `${candidate.oracleId}:${candidate.expiry}:${candidate.lowerStrike}:${candidate.higherStrike}`;
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
  const attempts: RangeQuoteAttempt[] = [];

  for (const candidate of params.candidates) {
    try {
      const quote = await devInspectRangeQuote({
        ...candidate,
        client: params.client,
        sender: params.sender,
        quantity: params.quantity,
        config: params.config,
      });

      attempts.push({
        ...candidate,
        status: "success",
        mintCostAtomic: quote.mintCostAtomic,
        redeemPayoutAtomic: quote.redeemPayoutAtomic,
      });
    } catch (error) {
      attempts.push({
        ...candidate,
        status: "failure",
        abort: classifyQuoteAbort(error),
      });
    }
  }

  return attempts;
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

function decodeU64ReturnValue(value: unknown): string | null {
  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }

  const [bytes, type] = value;

  if (type !== "u64" || !Array.isArray(bytes) || bytes.length !== 8) {
    return null;
  }

  if (
    !bytes.every(
      (byte) => typeof byte === "number" && Number.isInteger(byte) && byte >= 0 && byte <= 255,
    )
  ) {
    return null;
  }

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
