import type { Transaction } from "@mysten/sui/transactions";
import type {
  DeepBookPredictNetworkConfig,
  RangeKeyInput,
} from "@deepvol/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import { DeepBookPredictUnconfirmedBindingError } from "./errors.ts";

const SUI_OBJECT_ID_PATTERN = /^0x[0-9a-fA-F]+$/;

export const RANGE_WIN_CONDITION_COPY = "(lower, higher]";

export type NormalizedRangeKeyInput = {
  oracleId: string;
  expiry: string;
  lowerStrike: string;
  higherStrike: string;
};

export function normalizeRangeKeyInput(input: RangeKeyInput): NormalizedRangeKeyInput {
  if (!SUI_OBJECT_ID_PATTERN.test(input.oracleId)) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "RangeKey oracle ID must be a 0x-prefixed Sui object ID.",
    );
  }

  const expiry = normalizePositiveInteger(input.expiry, "RangeKey expiry");
  const lowerStrike = normalizeNonNegativeInteger(
    input.lowerStrike,
    "RangeKey lower strike",
  );
  const higherStrike = normalizeNonNegativeInteger(
    input.higherStrike,
    "RangeKey higher strike",
  );

  if (BigInt(lowerStrike) >= BigInt(higherStrike)) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "RangeKey requires lowerStrike < higherStrike for the (lower, higher] win condition.",
    );
  }

  return {
    oracleId: input.oracleId,
    expiry,
    lowerStrike,
    higherStrike,
  };
}

export function buildRangeKeyTransactionArgument(
  tx: Transaction,
  input: RangeKeyInput,
  config?: DeepBookPredictNetworkConfig,
): ReturnType<Transaction["moveCall"]> {
  const resolvedConfig = resolveDeepBookPredictConfig(config);
  const normalized = normalizeRangeKeyInput(input);

  return tx.moveCall({
    target: `${resolvedConfig.packageId}::range_key::new`,
    arguments: [
      tx.pure.id(normalized.oracleId),
      tx.pure.u64(normalized.expiry),
      tx.pure.u64(normalized.lowerStrike),
      tx.pure.u64(normalized.higherStrike),
    ],
  });
}

export function normalizePositiveInteger(
  value: string | bigint,
  label: string,
): string {
  const normalized = normalizeInteger(value, label);

  if (BigInt(normalized) <= 0n) {
    throw new DeepBookPredictUnconfirmedBindingError(`${label} must be greater than 0.`);
  }

  return normalized;
}

export function normalizeNonNegativeInteger(
  value: string | bigint,
  label: string,
): string {
  const normalized = normalizeInteger(value, label);

  if (BigInt(normalized) < 0n) {
    throw new DeepBookPredictUnconfirmedBindingError(`${label} must be non-negative.`);
  }

  return normalized;
}

function normalizeInteger(value: string | bigint, label: string): string {
  try {
    const normalized = BigInt(value);
    return normalized.toString();
  } catch {
    throw new DeepBookPredictUnconfirmedBindingError(`${label} must be an integer.`);
  }
}
