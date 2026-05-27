import type { PrimitiveActiveMarketContext } from "@rangepilot/types/deepbookPredict";
import { normalizePositiveIntegerInput } from "../lib/format";

const UNSIGNED_INTEGER_PATTERN = /^[0-9]+$/;
const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/;

export type TradeRuntimeProduct = "MOVE" | "UP" | "DOWN" | "RANGE";

export type CandidateSearchSdkInput = {
  sender: string;
  managerId: string;
  oracleId: string;
  oracleObjectId: string;
  expiry: string;
  quantity: string;
  underlyingAsset: string | null;
  spot: string | null;
  forward: string | null;
  tickSize: string;
  minStrike: string;
};

export type TradeRuntimeContext = {
  product: TradeRuntimeProduct;
  walletAddress: string | null;
  walletConnected: boolean;
  walletTestnet: boolean;
  predictManagerId: string | null;
  activeMarketStatus: string | null;
  activeMarketSource: string | null;
  oracleId: string | null;
  oracleObjectId: string | null;
  expiry: string | null;
  rawQuantityInput: string;
  quantity: string | null;
  underlyingAsset: string | null;
  spot: string | null;
  forward: string | null;
  tickSize: string | null;
  minStrike: string | null;
  suggestedLowerStrike: string | null;
  suggestedUpperStrike: string | null;
  suggestedUpStrike: string | null;
  suggestedDownStrike: string | null;
  anchorSource: "forward" | "spot" | null;
  anchorPrice: string | null;
  sdkInput: CandidateSearchSdkInput | null;
  blockers: string[];
  diagnostics: string[];
  dependencyKey: string;
};

export function unsignedIntegerStringOrNull(value: string | bigint | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return value >= 0n ? value.toString() : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value).toString();
  }

  const trimmed = value.trim();
  if (!UNSIGNED_INTEGER_PATTERN.test(trimmed)) return null;

  return BigInt(trimmed).toString();
}

export function positiveIntegerStringOrNull(value: string | bigint | number | null | undefined): string | null {
  const unsigned = unsignedIntegerStringOrNull(value);
  if (!unsigned || !POSITIVE_INTEGER_PATTERN.test(unsigned)) return null;
  return unsigned;
}

export function nonNegativeIntegerStringOrNull(value: string | bigint | number | null | undefined): string | null {
  return unsignedIntegerStringOrNull(value);
}

export function hasIntegerString(value: string | null): value is string {
  return value !== null;
}

export function buildRuntimeDependencyKey(contextParts: Record<string, string | null | boolean>): string {
  return Object.entries(contextParts)
    .map(([key, value]) => `${key}=${value === null ? "null" : String(value)}`)
    .join("|");
}

export function buildTradeRuntimeContext(input: {
  product: TradeRuntimeProduct;
  walletAddress: string | null;
  walletConnected: boolean;
  walletTestnet: boolean;
  predictManagerId: string | null;
  activeMarket: PrimitiveActiveMarketContext | null;
  quantityInput: string;
}): TradeRuntimeContext {
  const activeMarket = input.activeMarket;
  const blockers: string[] = [];
  const diagnostics = [
    "Suggested strikes seed UI fields only; mintability search uses forward/spot plus tick grid.",
  ];

  const oracleId = activeMarket?.oracleId ?? null;
  const oracleObjectId = activeMarket?.oracleObjectId ?? null;
  const rawExpiry = activeMarket?.expiry ?? null;
  const expiry = unsignedIntegerStringOrNull(rawExpiry);
  const quantity = normalizePositiveIntegerInput(input.quantityInput);
  const spot = nonNegativeIntegerStringOrNull(activeMarket?.spot ?? null);
  const forward = nonNegativeIntegerStringOrNull(activeMarket?.forward ?? null);
  const positiveSpot = positiveIntegerStringOrNull(activeMarket?.spot ?? null);
  const positiveForward = positiveIntegerStringOrNull(activeMarket?.forward ?? null);
  const tickSize = positiveIntegerStringOrNull(activeMarket?.tickSize ?? null);
  const minStrike = nonNegativeIntegerStringOrNull(activeMarket?.minStrike ?? null);
  const anchorSource = positiveForward ? "forward" : positiveSpot ? "spot" : null;
  const anchorPrice = positiveForward ?? positiveSpot ?? null;

  if (!input.walletConnected || !input.walletAddress) blockers.push("Missing runtime input: walletAddress");
  if (input.walletConnected && !input.walletTestnet) blockers.push("Invalid runtime input: network is not Sui Testnet");
  if (!input.predictManagerId) blockers.push("Missing runtime input: predictManagerId");
  if (!activeMarket) blockers.push("Missing runtime input: activeMarket");
  if (activeMarket && activeMarket.status !== "live") blockers.push(`Invalid runtime input: activeMarket.status=${activeMarket.status}`);
  if (!oracleId) blockers.push("Missing runtime input: oracleId");
  if (!oracleObjectId) blockers.push("Missing runtime input: oracleObjectId");
  if (!rawExpiry) blockers.push("Missing runtime input: expiry");
  if (rawExpiry && !expiry) blockers.push(`Invalid runtime input: expiry=${rawExpiry}`);
  if (!quantity) blockers.push(`Invalid runtime input: quantity=${input.quantityInput}`);
  if (activeMarket?.forward && !forward) blockers.push(`Invalid runtime input: forward=${activeMarket.forward}`);
  if (activeMarket?.spot && !spot) blockers.push(`Invalid runtime input: spot=${activeMarket.spot}`);
  if (!anchorPrice) blockers.push("Missing runtime input: forward or spot");
  if (!activeMarket?.tickSize) blockers.push("Missing runtime input: tickSize");
  if (activeMarket?.tickSize && !tickSize) blockers.push(`Invalid runtime input: tickSize=${activeMarket.tickSize}`);
  if (!activeMarket?.minStrike) blockers.push("Missing runtime input: minStrike");
  if (activeMarket?.minStrike && !minStrike) blockers.push(`Invalid runtime input: minStrike=${activeMarket.minStrike}`);

  const sdkInput = blockers.length === 0 &&
    input.walletAddress &&
    input.predictManagerId &&
    oracleId &&
    oracleObjectId &&
    expiry &&
    quantity &&
    tickSize &&
    minStrike
    ? {
        sender: input.walletAddress,
        managerId: input.predictManagerId,
        oracleId,
        oracleObjectId,
        expiry,
        quantity,
        underlyingAsset: activeMarket?.underlyingAsset ?? null,
        spot,
        forward,
        tickSize,
        minStrike,
      }
    : null;

  const dependencyKey = buildRuntimeDependencyKey({
    product: input.product,
    walletAddress: input.walletAddress,
    walletConnected: input.walletConnected,
    walletTestnet: input.walletTestnet,
    predictManagerId: input.predictManagerId,
    activeMarketStatus: activeMarket?.status ?? null,
    activeMarketSource: activeMarket?.source ?? null,
    oracleId,
    oracleObjectId,
    expiry,
    rawQuantityInput: input.quantityInput,
    quantity,
    spot,
    forward,
    tickSize,
    minStrike,
    underlyingAsset: activeMarket?.underlyingAsset ?? null,
  });

  return {
    product: input.product,
    walletAddress: input.walletAddress,
    walletConnected: input.walletConnected,
    walletTestnet: input.walletTestnet,
    predictManagerId: input.predictManagerId,
    activeMarketStatus: activeMarket?.status ?? null,
    activeMarketSource: activeMarket?.source ?? null,
    oracleId,
    oracleObjectId,
    expiry,
    rawQuantityInput: input.quantityInput,
    quantity,
    underlyingAsset: activeMarket?.underlyingAsset ?? null,
    spot,
    forward,
    tickSize,
    minStrike,
    suggestedLowerStrike: activeMarket?.suggestedLowerStrike ?? null,
    suggestedUpperStrike: activeMarket?.suggestedUpperStrike ?? null,
    suggestedUpStrike: activeMarket?.suggestedUpStrike ?? null,
    suggestedDownStrike: activeMarket?.suggestedDownStrike ?? null,
    anchorSource,
    anchorPrice,
    sdkInput,
    blockers,
    diagnostics,
    dependencyKey,
  };
}
