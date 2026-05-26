import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { DEEPVOL_STORAGE_KEYS } from "./constants";

const VALIDATION_TTL_MS = 5 * 60 * 1000;

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
): PrimitiveMintabilityClassification {
  const key = buildPrimitiveMintabilityKey(input);
  const record = readPrimitiveMintabilityRecord(key);

  if (!record) {
    return { status: "validationRequired", key, record: null };
  }

  if (record.status === "failed") {
    return { status: "nonMintable", key, record };
  }

  if (!record.passedAtMs || nowMs - record.passedAtMs > VALIDATION_TTL_MS) {
    return { status: "expiredValidation", key, record };
  }

  return { status: "passedRecent", key, record };
}

export function recordPrimitiveMintabilityPass(
  input: PrimitiveMintabilityKeyInput,
  message = "Mintable primitive strike found.",
): PrimitiveMintabilityRecord {
  const record: PrimitiveMintabilityRecord = {
    key: buildPrimitiveMintabilityKey(input),
    status: "passed",
    message,
    rawDetail: null,
    passedAtMs: Date.now(),
  };

  writePrimitiveMintabilityRecord(record);
  return record;
}

export function recordPrimitiveMintabilityFailure(
  input: PrimitiveMintabilityKeyInput,
  message: string,
  rawDetail: string | null = null,
): PrimitiveMintabilityRecord {
  const record: PrimitiveMintabilityRecord = {
    key: buildPrimitiveMintabilityKey(input),
    status: "failed",
    message,
    rawDetail,
    failedAtMs: Date.now(),
  };

  writePrimitiveMintabilityRecord(record);
  return record;
}

export function clearPrimitiveMintabilityRecord(input: PrimitiveMintabilityKeyInput): void {
  const key = buildPrimitiveMintabilityKey(input);
  const records = readPrimitiveMintabilityRecords();
  delete records[key];
  writePrimitiveMintabilityRecords(records);
}

function readPrimitiveMintabilityRecord(key: string): PrimitiveMintabilityRecord | null {
  return readPrimitiveMintabilityRecords()[key] ?? null;
}

function writePrimitiveMintabilityRecord(record: PrimitiveMintabilityRecord): void {
  writePrimitiveMintabilityRecords({
    ...readPrimitiveMintabilityRecords(),
    [record.key]: record,
  });
}

function readPrimitiveMintabilityRecords(): Record<string, PrimitiveMintabilityRecord> {
  try {
    const raw = localStorage.getItem(DEEPVOL_STORAGE_KEYS.primitiveMintability);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed as Record<string, PrimitiveMintabilityRecord> : {};
  } catch {
    return {};
  }
}

function writePrimitiveMintabilityRecords(records: Record<string, PrimitiveMintabilityRecord>): void {
  try {
    localStorage.setItem(DEEPVOL_STORAGE_KEYS.primitiveMintability, JSON.stringify(records));
  } catch {
    // localStorage may be unavailable
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
