import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { DEEPVOL_TESTNET } from "@rangepilot/config/deepVolTestnet";
import { DEEPVOL_STORAGE_KEYS } from "./constants";

const VALIDATION_TTL_MS = 5 * 60 * 1000;

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
): MoveSeriesMintabilityClassification {
  const key = buildMoveSeriesMintabilityKey(input);
  const record = readMoveSeriesMintabilityRecord(key);

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

export function recordMoveSeriesMintabilityPass(
  input: MoveSeriesMintabilityKeyInput,
  message = "Mintable BTC MOVE range found.",
): MoveSeriesMintabilityRecord {
  const record: MoveSeriesMintabilityRecord = {
    key: buildMoveSeriesMintabilityKey(input),
    status: "passed",
    seriesId: input.seriesId ?? null,
    message,
    rawDetail: null,
    passedAtMs: Date.now(),
  };

  writeMoveSeriesMintabilityRecord(record);
  return record;
}

export function recordMoveSeriesMintabilityFailure(
  input: MoveSeriesMintabilityKeyInput,
  message: string,
  rawDetail: string | null = null,
): MoveSeriesMintabilityRecord {
  const record: MoveSeriesMintabilityRecord = {
    key: buildMoveSeriesMintabilityKey(input),
    status: "failed",
    seriesId: input.seriesId ?? null,
    message,
    rawDetail,
    failedAtMs: Date.now(),
  };

  writeMoveSeriesMintabilityRecord(record);
  return record;
}

export function clearMoveSeriesMintabilityRecord(input: MoveSeriesMintabilityKeyInput): void {
  const key = buildMoveSeriesMintabilityKey(input);
  const records = readMoveSeriesMintabilityRecords();
  delete records[key];
  writeMoveSeriesMintabilityRecords(records);
}

export function attachSeriesToMoveSeriesMintabilityRecord(
  input: MoveSeriesMintabilityKeyInput,
  seriesId: string,
): void {
  const key = buildMoveSeriesMintabilityKey(input);
  const record = readMoveSeriesMintabilityRecord(key);

  if (!record) {
    return;
  }

  writeMoveSeriesMintabilityRecord({ ...record, seriesId });
}

function readMoveSeriesMintabilityRecord(key: string): MoveSeriesMintabilityRecord | null {
  return readMoveSeriesMintabilityRecords()[key] ?? null;
}

function writeMoveSeriesMintabilityRecord(record: MoveSeriesMintabilityRecord): void {
  writeMoveSeriesMintabilityRecords({
    ...readMoveSeriesMintabilityRecords(),
    [record.key]: record,
  });
}

function readMoveSeriesMintabilityRecords(): Record<string, MoveSeriesMintabilityRecord> {
  try {
    const raw = localStorage.getItem(DEEPVOL_STORAGE_KEYS.moveSeriesMintability);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed as Record<string, MoveSeriesMintabilityRecord> : {};
  } catch {
    return {};
  }
}

function writeMoveSeriesMintabilityRecords(records: Record<string, MoveSeriesMintabilityRecord>): void {
  try {
    localStorage.setItem(DEEPVOL_STORAGE_KEYS.moveSeriesMintability, JSON.stringify(records));
  } catch {
    // localStorage may be unavailable
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
