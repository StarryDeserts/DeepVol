import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import { DEEPVOL_TESTNET } from "@deepvol/config/deepVolTestnet";
import { browserStorage, type StorageLike } from "../core/environment";
import { DEEPVOL_MINTABILITY_PASS_TTL_MS } from "../core/time";

export const MOVE_SERIES_MINTABILITY_STORAGE_KEY = "deepvol:move-series-mintability";

export type MoveSeriesMintabilityKeyInput = {
  oracleId: string | null | undefined;
  expiry: string | null | undefined;
  lowerStrike: string | null | undefined;
  upperStrike: string | null | undefined;
  quantity: string | null | undefined;
  predictManagerId: string | null | undefined;
  seriesId?: string | null | undefined;
  dusdcCoinType?: string | null | undefined;
  deepVolPackageId?: string | null | undefined;
  predictPackageId?: string | null | undefined;
};

export type MoveSeriesMintabilityRecord = {
  key: string;
  status: "passed" | "failed";
  seriesId: string | null;
  message: string | null;
  rawDetail: string | null;
  passedAtMs?: number;
  failedAtMs?: number;
};

export type MoveSeriesMintabilityClassification =
  | { status: "passedRecent"; key: string; record: MoveSeriesMintabilityRecord }
  | { status: "nonMintable"; key: string; record: MoveSeriesMintabilityRecord }
  | { status: "expiredValidation"; key: string; record: MoveSeriesMintabilityRecord }
  | { status: "validationRequired"; key: string; record: null };

export function buildMoveSeriesMintabilityKey(input: MoveSeriesMintabilityKeyInput): string {
  return [
    input.oracleId ?? "",
    input.expiry ?? "",
    input.lowerStrike ?? "",
    input.upperStrike ?? "",
    input.quantity ?? "",
    input.predictManagerId ?? "",
    input.dusdcCoinType ?? DEEPBOOK_PREDICT_TESTNET.quoteAssets.DUSDC.coinType,
    input.deepVolPackageId ?? DEEPVOL_TESTNET.packageId,
    input.predictPackageId ?? DEEPBOOK_PREDICT_TESTNET.packageId,
  ].join(":");
}

export function classifyMoveSeriesMintability(
  input: MoveSeriesMintabilityKeyInput,
  nowMs = Date.now(),
  storage: StorageLike | null = browserStorage(),
  storageKey = MOVE_SERIES_MINTABILITY_STORAGE_KEY,
): MoveSeriesMintabilityClassification {
  const key = buildMoveSeriesMintabilityKey(input);
  const record = readMoveSeriesMintabilityRecord(key, storage, storageKey);

  if (!record) {
    return { status: "validationRequired", key, record: null };
  }

  if (record.status === "failed") {
    return { status: "nonMintable", key, record };
  }

  if (!record.passedAtMs || nowMs - record.passedAtMs > DEEPVOL_MINTABILITY_PASS_TTL_MS) {
    return { status: "expiredValidation", key, record };
  }

  return { status: "passedRecent", key, record };
}

export function recordMoveSeriesMintabilityPass(
  input: MoveSeriesMintabilityKeyInput,
  message = "Mintable BTC MOVE range found.",
  storage: StorageLike | null = browserStorage(),
  storageKey = MOVE_SERIES_MINTABILITY_STORAGE_KEY,
): MoveSeriesMintabilityRecord {
  const record: MoveSeriesMintabilityRecord = {
    key: buildMoveSeriesMintabilityKey(input),
    status: "passed",
    seriesId: input.seriesId ?? null,
    message,
    rawDetail: null,
    passedAtMs: Date.now(),
  };

  writeMoveSeriesMintabilityRecord(record, storage, storageKey);
  return record;
}

export function recordMoveSeriesMintabilityFailure(
  input: MoveSeriesMintabilityKeyInput,
  message: string,
  rawDetail: string | null = null,
  storage: StorageLike | null = browserStorage(),
  storageKey = MOVE_SERIES_MINTABILITY_STORAGE_KEY,
): MoveSeriesMintabilityRecord {
  const record: MoveSeriesMintabilityRecord = {
    key: buildMoveSeriesMintabilityKey(input),
    status: "failed",
    seriesId: input.seriesId ?? null,
    message,
    rawDetail,
    failedAtMs: Date.now(),
  };

  writeMoveSeriesMintabilityRecord(record, storage, storageKey);
  return record;
}

export function clearMoveSeriesMintabilityRecord(
  input: MoveSeriesMintabilityKeyInput,
  storage: StorageLike | null = browserStorage(),
  storageKey = MOVE_SERIES_MINTABILITY_STORAGE_KEY,
): void {
  const key = buildMoveSeriesMintabilityKey(input);
  const records = readMoveSeriesMintabilityRecords(storage, storageKey);
  delete records[key];
  writeMoveSeriesMintabilityRecords(records, storage, storageKey);
}

export function attachSeriesToMoveSeriesMintabilityRecord(
  input: MoveSeriesMintabilityKeyInput,
  seriesId: string,
  storage: StorageLike | null = browserStorage(),
  storageKey = MOVE_SERIES_MINTABILITY_STORAGE_KEY,
): void {
  const key = buildMoveSeriesMintabilityKey(input);
  const record = readMoveSeriesMintabilityRecord(key, storage, storageKey);

  if (!record) {
    return;
  }

  writeMoveSeriesMintabilityRecord({ ...record, seriesId }, storage, storageKey);
}

function readMoveSeriesMintabilityRecord(
  key: string,
  storage: StorageLike | null,
  storageKey: string,
): MoveSeriesMintabilityRecord | null {
  return readMoveSeriesMintabilityRecords(storage, storageKey)[key] ?? null;
}

function writeMoveSeriesMintabilityRecord(
  record: MoveSeriesMintabilityRecord,
  storage: StorageLike | null,
  storageKey: string,
): void {
  writeMoveSeriesMintabilityRecords({
    ...readMoveSeriesMintabilityRecords(storage, storageKey),
    [record.key]: record,
  }, storage, storageKey);
}

function readMoveSeriesMintabilityRecords(
  storage: StorageLike | null = browserStorage(),
  storageKey = MOVE_SERIES_MINTABILITY_STORAGE_KEY,
): Record<string, MoveSeriesMintabilityRecord> {
  try {
    const raw = storage?.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed as Record<string, MoveSeriesMintabilityRecord> : {};
  } catch {
    return {};
  }
}

function writeMoveSeriesMintabilityRecords(
  records: Record<string, MoveSeriesMintabilityRecord>,
  storage: StorageLike | null = browserStorage(),
  storageKey = MOVE_SERIES_MINTABILITY_STORAGE_KEY,
): void {
  try {
    storage?.setItem(storageKey, JSON.stringify(records));
  } catch {
    // storage may be unavailable
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
