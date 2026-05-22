import type { PrimitiveKind } from "../hooks/primitiveQuoteGate";

export type StoredDeepVolPrimitiveTrade = {
  primitiveType: PrimitiveKind;
  digest: string;
  explorerUrl: string;
  executedAtMs: number;
  wallet: string;
  predictManagerId: string;
  seriesId: string;
  oracleId: string;
  expiry: string;
  strike: string | null;
  lowerStrike: string | null;
  upperStrike: string | null;
  quantity: string;
  mintCost: string;
  redeemPayout: string | null;
  positionKey: string;
  status: "submitted" | "success" | "failed";
};

const STORAGE_EVENT = "deepvol:primitive-storage-updated";
const EMPTY_TRADES: StoredDeepVolPrimitiveTrade[] = [];
let cachedTradesRaw: string | null = null;
let cachedTrades: StoredDeepVolPrimitiveTrade[] = EMPTY_TRADES;

type StorageKeys = {
  primitiveTrades: string;
};

export function readStoredPrimitiveTrades(storageKeys: StorageKeys): StoredDeepVolPrimitiveTrade[] {
  if (typeof window === "undefined") {
    return EMPTY_TRADES;
  }

  const raw = window.localStorage.getItem(storageKeys.primitiveTrades);

  if (raw === cachedTradesRaw) {
    return cachedTrades;
  }

  cachedTradesRaw = raw;

  if (!raw) {
    cachedTrades = EMPTY_TRADES;
    return cachedTrades;
  }

  try {
    const parsed = JSON.parse(raw);
    cachedTrades = Array.isArray(parsed) ? parsed.filter(isStoredPrimitiveTrade) : EMPTY_TRADES;
    return cachedTrades;
  } catch {
    cachedTrades = EMPTY_TRADES;
    return cachedTrades;
  }
}

export function persistPrimitiveTrade(storageKeys: StorageKeys, record: StoredDeepVolPrimitiveTrade) {
  if (typeof window === "undefined") {
    return;
  }

  const current = readStoredPrimitiveTrades(storageKeys);
  const deduped = current.filter((entry) => entry.digest !== record.digest);
  window.localStorage.setItem(
    storageKeys.primitiveTrades,
    JSON.stringify([record, ...deduped].slice(0, 20)),
  );
  notifyPrimitiveStorageChanged();
}

export function subscribePrimitiveTradeStorage(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(STORAGE_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(STORAGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function buildPrimitivePositionKey(record: Pick<StoredDeepVolPrimitiveTrade, "primitiveType" | "oracleId" | "expiry" | "strike" | "lowerStrike" | "upperStrike">): string {
  if (record.primitiveType === "RANGE") {
    return [record.oracleId, record.expiry, record.lowerStrike ?? "no-lower", record.upperStrike ?? "no-upper"].join(":");
  }

  return [record.oracleId, record.expiry, record.primitiveType, record.strike ?? "no-strike"].join(":");
}

function notifyPrimitiveStorageChanged() {
  if (typeof window !== "undefined") {
    cachedTradesRaw = null;
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }
}

function isStoredPrimitiveTrade(value: unknown): value is StoredDeepVolPrimitiveTrade {
  if (!isRecord(value)) {
    return false;
  }

  return (value.primitiveType === "UP" || value.primitiveType === "DOWN" || value.primitiveType === "RANGE")
    && typeof value.digest === "string"
    && typeof value.wallet === "string"
    && typeof value.predictManagerId === "string"
    && typeof value.oracleId === "string"
    && typeof value.expiry === "string"
    && typeof value.quantity === "string"
    && typeof value.mintCost === "string"
    && typeof value.positionKey === "string"
    && typeof value.executedAtMs === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
