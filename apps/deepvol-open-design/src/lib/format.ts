const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/;

export function shortId(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export function formatAtomicAmount(
  value: string | bigint | null | undefined,
  decimals = 6,
): string {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  const atomic = BigInt(value);
  const scale = 10n ** BigInt(decimals);
  const whole = atomic / scale;
  const fraction = atomic % scale;
  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

export function formatTimestampMs(
  value: string | number | bigint | null | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  const timestamp = Number(value);

  if (!Number.isFinite(timestamp)) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function calculateCreateFeeAtomic(
  premiumAtomic: string | bigint,
  bps: string | number | bigint,
): string {
  return ((BigInt(premiumAtomic) * BigInt(bps)) / 10_000n).toString();
}

export function computeMaxPremiumPaidAtomic(
  expectedPremiumAtomic: string | bigint,
): string {
  const expected = BigInt(expectedPremiumAtomic);
  const percentageBuffer = expected / 5n;
  const minimumBuffer = 1_000n;
  const buffer = percentageBuffer > minimumBuffer ? percentageBuffer : minimumBuffer;

  return (expected + buffer).toString();
}

export function normalizePositiveIntegerInput(value: string): string | null {
  const trimmed = value.trim();

  if (!POSITIVE_INTEGER_PATTERN.test(trimmed)) {
    return null;
  }

  return BigInt(trimmed).toString();
}

export function decodeAsciiVector(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return typeof value === "string" ? value : null;
  }

  try {
    return new TextDecoder().decode(new Uint8Array(value.map((entry) => Number(entry))));
  } catch {
    return null;
  }
}
