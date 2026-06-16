import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import { browserStorage, type StorageLike } from "../core/environment";
import { DEEPVOL_MINTABILITY_PASS_TTL_MS } from "../core/time";

export const PRIMITIVE_MINTABILITY_STORAGE_KEY = "deepvol:primitive-mintability";

export type PrimitiveMintabilityKeyInput = {
  oracleId: string | null | undefined;
  expiry: string | null | undefined;
  direction: string | null | undefined;
  strike: string | null | undefined;
  quantity: string | null | undefined;
  predictManagerId: string | null | undefined;
  predictPackageId?: string | null | undefined;
};

export type PrimitiveMintabilityRecord = {
  key: string;
  status: "passed" | "failed";
  message: string | null;
  rawDetail: string | null;
  passedAtMs?: number;
  failedAtMs?: number;
};

export type PrimitiveMintabilityClassification =
  | { status: "passedRecent"; key: string; record: PrimitiveMintabilityRecord }
  | { status: "nonMintable"; key: string; record: PrimitiveMintabilityRecord }
  | { status: "expiredValidation"; key: string; record: PrimitiveMintabilityRecord }
  | { status: "validationRequired"; key: string; record: null };

export function buildPrimitiveMintabilityKey(input: PrimitiveMintabilityKeyInput): string {
  return [
    input.oracleId ?? "",
    input.expiry ?? "",
    input.direction ?? "",
    input.strike ?? "",
    input.quantity ?? "",
    input.predictManagerId ?? "",
    input.predictPackageId ?? DEEPBOOK_PREDICT_TESTNET.packageId,
  ].join(":");
}

export function classifyPrimitiveMintability(
  input: PrimitiveMintabilityKeyInput,
  nowMs = Date.now(),
  storage: StorageLike | null = browserStorage(),
  storageKey = PRIMITIVE_MINTABILITY_STORAGE_KEY,
): PrimitiveMintabilityClassification {
  const key = buildPrimitiveMintabilityKey(input);
  const record = readPrimitiveMintabilityRecord(key, storage, storageKey);

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

export function recordPrimitiveMintabilityPass(
  input: PrimitiveMintabilityKeyInput,
  message = "Mintable primitive strike found.",
  storage: StorageLike | null = browserStorage(),
  storageKey = PRIMITIVE_MINTABILITY_STORAGE_KEY,
): PrimitiveMintabilityRecord {
  const record: PrimitiveMintabilityRecord = {
    key: buildPrimitiveMintabilityKey(input),
    status: "passed",
    message,
    rawDetail: null,
    passedAtMs: Date.now(),
  };

  writePrimitiveMintabilityRecord(record, storage, storageKey);
  return record;
}

export function recordPrimitiveMintabilityFailure(
  input: PrimitiveMintabilityKeyInput,
  message: string,
  rawDetail: string | null = null,
  storage: StorageLike | null = browserStorage(),
  storageKey = PRIMITIVE_MINTABILITY_STORAGE_KEY,
): PrimitiveMintabilityRecord {
  const record: PrimitiveMintabilityRecord = {
    key: buildPrimitiveMintabilityKey(input),
    status: "failed",
    message,
    rawDetail,
    failedAtMs: Date.now(),
  };

  writePrimitiveMintabilityRecord(record, storage, storageKey);
  return record;
}

export function clearPrimitiveMintabilityRecord(
  input: PrimitiveMintabilityKeyInput,
  storage: StorageLike | null = browserStorage(),
  storageKey = PRIMITIVE_MINTABILITY_STORAGE_KEY,
): void {
  const key = buildPrimitiveMintabilityKey(input);
  const records = readPrimitiveMintabilityRecords(storage, storageKey);
  delete records[key];
  writePrimitiveMintabilityRecords(records, storage, storageKey);
}

export type RangePrimitiveMintabilityKeyInput = {
  oracleId: string | null | undefined;
  expiry: string | null | undefined;
  lowerStrike: string | null | undefined;
  upperStrike: string | null | undefined;
  quantity: string | null | undefined;
  predictManagerId: string | null | undefined;
  predictPackageId?: string | null | undefined;
};

export function buildRangePrimitiveMintabilityKey(input: RangePrimitiveMintabilityKeyInput): string {
  return [
    "RANGE",
    input.oracleId ?? "",
    input.expiry ?? "",
    input.lowerStrike ?? "",
    input.upperStrike ?? "",
    input.quantity ?? "",
    input.predictManagerId ?? "",
    input.predictPackageId ?? DEEPBOOK_PREDICT_TESTNET.packageId,
  ].join(":");
}

export function classifyRangePrimitiveMintability(
  input: RangePrimitiveMintabilityKeyInput,
  nowMs = Date.now(),
  storage: StorageLike | null = browserStorage(),
  storageKey = PRIMITIVE_MINTABILITY_STORAGE_KEY,
): PrimitiveMintabilityClassification {
  const key = buildRangePrimitiveMintabilityKey(input);
  const record = readPrimitiveMintabilityRecord(key, storage, storageKey);

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

export function recordRangePrimitiveMintabilityPass(
  input: RangePrimitiveMintabilityKeyInput,
  message = "Mintable RANGE interval found.",
  storage: StorageLike | null = browserStorage(),
  storageKey = PRIMITIVE_MINTABILITY_STORAGE_KEY,
): PrimitiveMintabilityRecord {
  const record: PrimitiveMintabilityRecord = {
    key: buildRangePrimitiveMintabilityKey(input),
    status: "passed",
    message,
    rawDetail: null,
    passedAtMs: Date.now(),
  };

  writePrimitiveMintabilityRecord(record, storage, storageKey);
  return record;
}

export function recordRangePrimitiveMintabilityFailure(
  input: RangePrimitiveMintabilityKeyInput,
  message: string,
  rawDetail: string | null = null,
  storage: StorageLike | null = browserStorage(),
  storageKey = PRIMITIVE_MINTABILITY_STORAGE_KEY,
): PrimitiveMintabilityRecord {
  const record: PrimitiveMintabilityRecord = {
    key: buildRangePrimitiveMintabilityKey(input),
    status: "failed",
    message,
    rawDetail,
    failedAtMs: Date.now(),
  };

  writePrimitiveMintabilityRecord(record, storage, storageKey);
  return record;
}

export function clearRangePrimitiveMintabilityRecord(
  input: RangePrimitiveMintabilityKeyInput,
  storage: StorageLike | null = browserStorage(),
  storageKey = PRIMITIVE_MINTABILITY_STORAGE_KEY,
): void {
  const key = buildRangePrimitiveMintabilityKey(input);
  const records = readPrimitiveMintabilityRecords(storage, storageKey);
  delete records[key];
  writePrimitiveMintabilityRecords(records, storage, storageKey);
}

function readPrimitiveMintabilityRecord(
  key: string,
  storage: StorageLike | null,
  storageKey: string,
): PrimitiveMintabilityRecord | null {
  return readPrimitiveMintabilityRecords(storage, storageKey)[key] ?? null;
}

function writePrimitiveMintabilityRecord(
  record: PrimitiveMintabilityRecord,
  storage: StorageLike | null,
  storageKey: string,
): void {
  writePrimitiveMintabilityRecords({
    ...readPrimitiveMintabilityRecords(storage, storageKey),
    [record.key]: record,
  }, storage, storageKey);
}

function readPrimitiveMintabilityRecords(
  storage: StorageLike | null = browserStorage(),
  storageKey = PRIMITIVE_MINTABILITY_STORAGE_KEY,
): Record<string, PrimitiveMintabilityRecord> {
  try {
    const raw = storage?.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed as Record<string, PrimitiveMintabilityRecord> : {};
  } catch {
    return {};
  }
}

function writePrimitiveMintabilityRecords(
  records: Record<string, PrimitiveMintabilityRecord>,
  storage: StorageLike | null = browserStorage(),
  storageKey = PRIMITIVE_MINTABILITY_STORAGE_KEY,
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
