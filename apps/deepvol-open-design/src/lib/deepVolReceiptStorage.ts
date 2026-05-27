export type StoredDeepVolRedeemLegValidation = {
  direction: "up" | "down";
  strike: string;
  quantityAtomic: string;
  payoutAtomic: string | null;
  positionBeforeAtomic: string | null;
  positionAfterAtomic: string | null;
  eventMatched: boolean;
};

export type StoredDeepVolRedeemValidation = {
  status: "reconciled" | "reconciliation_warning";
  receiptId: string;
  digest: string;
  explorerUrl: string;
  walletAddress: string;
  executedAtMs: number;
  managerBalanceBeforeAtomic: string | null;
  managerBalanceAfterAtomic: string | null;
  totalPayoutAtomic: string | null;
  warnings: string[];
  up: StoredDeepVolRedeemLegValidation;
  down: StoredDeepVolRedeemLegValidation;
};

export type StoredDeepVolReceipt = {
  receiptId: string | null;
  digest: string;
  seriesId: string;
  owner: string;
  createdAtMs: number;
  redeemValidation?: StoredDeepVolRedeemValidation | null;
};

export type ControlledRedeemAttempt = {
  receiptId: string;
  walletAddress: string;
  status: "wallet_prompted" | "success" | "failed";
  attemptedAtMs: number;
  digest?: string | null;
  error?: string | null;
};

const STORAGE_EVENT = "deepvol:receipt-storage-updated";
const EMPTY_RECEIPTS: StoredDeepVolReceipt[] = [];
let cachedReceiptRaw: string | null = null;
let cachedReceipts: StoredDeepVolReceipt[] = EMPTY_RECEIPTS;

type StorageKeys = {
  receipts: string;
  redeemAttempts: string;
};

export function readStoredReceipts(storageKeys: StorageKeys): StoredDeepVolReceipt[] {
  if (typeof window === "undefined") {
    return EMPTY_RECEIPTS;
  }

  const raw = window.localStorage.getItem(storageKeys.receipts);

  if (raw === cachedReceiptRaw) {
    return cachedReceipts;
  }

  cachedReceiptRaw = raw;

  if (!raw) {
    cachedReceipts = EMPTY_RECEIPTS;
    return cachedReceipts;
  }

  try {
    const parsed = JSON.parse(raw);
    cachedReceipts = Array.isArray(parsed) ? parsed.filter(isStoredReceipt) : EMPTY_RECEIPTS;
    return cachedReceipts;
  } catch {
    cachedReceipts = EMPTY_RECEIPTS;
    return cachedReceipts;
  }
}

export function persistReceipt(storageKeys: StorageKeys, record: StoredDeepVolReceipt) {
  if (typeof window === "undefined") {
    return;
  }

  const current = readStoredReceipts(storageKeys);
  const deduped = current.filter((entry) => !isSameStoredReceipt(entry, record));
  window.localStorage.setItem(
    storageKeys.receipts,
    JSON.stringify([record, ...deduped].slice(0, 10)),
  );
  notifyReceiptStorageChanged();
}

export function persistReceiptRedeemValidation(
  storageKeys: StorageKeys,
  baseRecord: StoredDeepVolReceipt,
  redeemValidation: StoredDeepVolRedeemValidation,
) {
  const current = readStoredReceipts(storageKeys);
  const existing = current.find((entry) => isSameStoredReceipt(entry, baseRecord));

  persistReceipt(storageKeys, {
    ...(existing ?? baseRecord),
    receiptId: baseRecord.receiptId,
    digest: baseRecord.digest,
    seriesId: baseRecord.seriesId,
    owner: baseRecord.owner,
    redeemValidation,
  });
}

export function readControlledRedeemAttempt(
  storageKeys: StorageKeys,
  receiptId: string,
): ControlledRedeemAttempt | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKeys.redeemAttempts);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const record = isRecord(parsed) ? parsed[receiptId] : null;
    return isControlledRedeemAttempt(record) ? record : null;
  } catch {
    return null;
  }
}

export function persistControlledRedeemAttempt(
  storageKeys: StorageKeys,
  attempt: ControlledRedeemAttempt,
) {
  if (typeof window === "undefined") {
    return;
  }

  let current: Record<string, ControlledRedeemAttempt> = {};

  try {
    const raw = window.localStorage.getItem(storageKeys.redeemAttempts);
    const parsed = raw ? JSON.parse(raw) : null;
    current = isRecord(parsed) ? Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, ControlledRedeemAttempt] => isControlledRedeemAttempt(entry[1])),
    ) : {};
  } catch {
    current = {};
  }

  window.localStorage.setItem(
    storageKeys.redeemAttempts,
    JSON.stringify({ ...current, [attempt.receiptId]: attempt }),
  );
  notifyReceiptStorageChanged();
}

export function subscribeReceiptStorage(listener: () => void): () => void {
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

function notifyReceiptStorageChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }
}

function isSameStoredReceipt(a: StoredDeepVolReceipt, b: StoredDeepVolReceipt): boolean {
  if (a.receiptId && b.receiptId) {
    return a.receiptId === b.receiptId;
  }

  return a.digest === b.digest;
}

function isStoredReceipt(value: unknown): value is StoredDeepVolReceipt {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.digest === "string" && typeof value.seriesId === "string" && typeof value.owner === "string";
}

function isControlledRedeemAttempt(value: unknown): value is ControlledRedeemAttempt {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.receiptId === "string"
    && typeof value.walletAddress === "string"
    && typeof value.attemptedAtMs === "number"
    && (value.status === "wallet_prompted" || value.status === "success" || value.status === "failed");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
