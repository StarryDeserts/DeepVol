import type {
  DeepBookPredictNetworkConfig,
  NormalizedPositionRedeemedFields,
  NormalizedRangeMintedFields,
  NormalizedRangeRedeemedFields,
  PositionRedeemedEvent,
  PredictManagerCreatedEventCandidate,
  RangeMintedEvent,
  RangeRedeemedEvent,
  RangePositionSummary,
} from "@deepvol/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";

const MANAGER_CREATED_SUFFIX = "::predict_manager::PredictManagerCreated";
const RANGE_MINTED_SUFFIX = "::predict::RangeMinted";
const RANGE_REDEEMED_SUFFIX = "::predict::RangeRedeemed";
const POSITION_REDEEMED_SUFFIX = "::predict::PositionRedeemed";
const MANAGER_EVENT_ID_FIELDS = [
  "manager_id",
  "managerId",
  "manager",
  "predict_manager",
  "predictManager",
  "id",
  "object_id",
  "objectId",
] as const;
const SUI_OBJECT_ID_PATTERN = /^0x[0-9a-fA-F]+$/;

export type DeepBookPredictEventLike = {
  type?: string;
  parsedJson?: unknown;
  [key: string]: unknown;
};

export type DeepBookPredictObjectChangeLike = {
  type?: string;
  objectType?: string;
  objectId?: string;
  [key: string]: unknown;
};

export type PredictManagerIdRecoveryResult = {
  managerId: string | null;
  source: "event" | "object_change" | "event_and_object_change" | null;
  event: PredictManagerCreatedEventCandidate | null;
  objectChangeCandidates: string[];
  ambiguous: boolean;
  message: string;
};

export type PredictManagerCreateResultLike = {
  events?: readonly DeepBookPredictEventLike[] | null;
  objectChanges?: readonly DeepBookPredictObjectChangeLike[] | null;
};

export function parsePredictManagerCreatedEvent(
  events: readonly DeepBookPredictEventLike[] | null | undefined,
  config?: DeepBookPredictNetworkConfig,
): PredictManagerCreatedEventCandidate | null {
  const resolvedConfig = resolveDeepBookPredictConfig(config);
  const candidate = events?.find((event) => isPredictManagerCreatedEvent(event, resolvedConfig));

  if (!candidate?.type) {
    return null;
  }

  const managerId = extractManagerIdFromParsedJson(candidate.parsedJson);

  return {
    eventType: candidate.type,
    managerId,
    rawParsedJson: candidate.parsedJson ?? null,
    rawEvent: candidate,
    unconfirmedReason: managerId
      ? undefined
      : "PredictManagerCreated event matched, but manager ID field was not found in known public field names.",
  };
}

export function parseRangeMintedEvent(
  result: { events?: readonly DeepBookPredictEventLike[] | null },
  config?: DeepBookPredictNetworkConfig,
): RangeMintedEvent | null {
  const resolvedConfig = resolveDeepBookPredictConfig(config);
  const event = result.events?.find((candidate) => isRangeMintedEvent(candidate, resolvedConfig));

  if (!event?.type) {
    return null;
  }

  const parsedJson = isRecord(event.parsedJson) ? event.parsedJson : null;

  return {
    type: event.type,
    parsedJson,
    fields: extractRangeMintedFields(parsedJson),
  };
}

export function parseRangeRedeemedEvent(
  result: { events?: readonly DeepBookPredictEventLike[] | null },
  config?: DeepBookPredictNetworkConfig,
): RangeRedeemedEvent | null {
  const resolvedConfig = resolveDeepBookPredictConfig(config);
  const event = result.events?.find((candidate) => isRangeRedeemedEvent(candidate, resolvedConfig));

  if (!event?.type) {
    return null;
  }

  const parsedJson = isRecord(event.parsedJson) ? event.parsedJson : null;

  return {
    type: event.type,
    parsedJson,
    fields: extractRangeRedeemedFields(parsedJson),
  };
}

export function parsePositionRedeemedEvents(
  result: { events?: readonly DeepBookPredictEventLike[] | null },
  config?: DeepBookPredictNetworkConfig,
): PositionRedeemedEvent[] {
  const resolvedConfig = resolveDeepBookPredictConfig(config);

  return (result.events ?? [])
    .filter((candidate) => isPositionRedeemedEvent(candidate, resolvedConfig))
    .filter((event): event is DeepBookPredictEventLike & { type: string } => Boolean(event.type))
    .map((event) => {
      const parsedJson = isRecord(event.parsedJson) ? event.parsedJson : null;

      return {
        type: event.type,
        parsedJson,
        fields: extractPositionRedeemedFields(parsedJson),
      };
    });
}

export function extractRangeMintedFields(parsedJson: unknown): NormalizedRangeMintedFields {
  const record = isRecord(parsedJson) ? parsedJson : {};

  return {
    predictId: stringOrNull(record.predict_id),
    managerId: stringOrNull(record.manager_id),
    trader: stringOrNull(record.trader),
    quoteAsset: stringOrNull(record.quote_asset),
    oracleId: stringOrNull(record.oracle_id),
    expiry: integerStringOrNull(record.expiry),
    lowerStrike: integerStringOrNull(record.lower_strike),
    higherStrike: integerStringOrNull(record.higher_strike),
    quantity: integerStringOrNull(record.quantity),
    costAtomic: integerStringOrNull(record.cost),
    askPrice: integerStringOrNull(record.ask_price),
  };
}

export function extractRangeRedeemedFields(parsedJson: unknown): NormalizedRangeRedeemedFields {
  const record = isRecord(parsedJson) ? parsedJson : {};

  return {
    predictId: stringOrNull(record.predict_id),
    managerId: stringOrNull(record.manager_id),
    trader: stringOrNull(record.trader),
    quoteAsset: stringOrNull(record.quote_asset),
    oracleId: stringOrNull(record.oracle_id),
    expiry: integerStringOrNull(record.expiry),
    lowerStrike: integerStringOrNull(record.lower_strike),
    higherStrike: integerStringOrNull(record.higher_strike),
    quantity: integerStringOrNull(record.quantity),
    payoutAtomic: integerStringOrNull(record.payout),
    bidPrice: integerStringOrNull(record.bid_price),
    isSettled: booleanOrNull(record.is_settled),
  };
}

export function extractPositionRedeemedFields(parsedJson: unknown): NormalizedPositionRedeemedFields {
  const record = isRecord(parsedJson) ? parsedJson : {};

  return {
    predictId: stringOrNull(record.predict_id),
    managerId: stringOrNull(record.manager_id),
    owner: stringOrNull(record.owner),
    executor: stringOrNull(record.executor),
    quoteAsset: stringOrNull(record.quote_asset),
    oracleId: stringOrNull(record.oracle_id),
    expiry: integerStringOrNull(record.expiry),
    strike: integerStringOrNull(record.strike),
    isUp: booleanOrNull(record.is_up),
    quantity: integerStringOrNull(record.quantity),
    payoutAtomic: integerStringOrNull(record.payout),
    bidPrice: integerStringOrNull(record.bid_price),
    isSettled: booleanOrNull(record.is_settled),
  };
}

export function extractRangePositionFromMintEvent(
  event: RangeMintedEvent,
  digest?: string,
): RangePositionSummary | null {
  const fields = event.fields ?? extractRangeMintedFields(event.parsedJson);

  if (!fields.managerId || !fields.oracleId || !fields.expiry || !fields.lowerStrike || !fields.higherStrike || !fields.quantity) {
    return null;
  }

  return {
    managerId: fields.managerId,
    oracleId: fields.oracleId,
    expiry: fields.expiry,
    lowerStrike: fields.lowerStrike,
    higherStrike: fields.higherStrike,
    quantity: fields.quantity,
    source: "range_minted_event",
    digest,
    costAtomic: fields.costAtomic,
    askPrice: fields.askPrice,
    quoteAsset: fields.quoteAsset,
  };
}

export function recoverPredictManagerIdFromCreateResult(
  result: PredictManagerCreateResultLike,
  config?: DeepBookPredictNetworkConfig,
): PredictManagerIdRecoveryResult {
  const resolvedConfig = resolveDeepBookPredictConfig(config);
  const event = parsePredictManagerCreatedEvent(result.events, resolvedConfig);
  const objectChangeCandidates = extractPredictManagerObjectChangeIds(
    result.objectChanges,
    resolvedConfig,
  );
  const uniqueObjectChangeCandidates = [...new Set(objectChangeCandidates)];
  const eventManagerId = event?.managerId ?? null;

  if (eventManagerId && uniqueObjectChangeCandidates.includes(eventManagerId)) {
    return {
      managerId: eventManagerId,
      source: "event_and_object_change",
      event,
      objectChangeCandidates: uniqueObjectChangeCandidates,
      ambiguous: false,
      message: "Recovered manager ID from matching PredictManagerCreated event and created object change.",
    };
  }

  if (eventManagerId && uniqueObjectChangeCandidates.length === 0) {
    return {
      managerId: eventManagerId,
      source: "event",
      event,
      objectChangeCandidates: uniqueObjectChangeCandidates,
      ambiguous: false,
      message: "Recovered manager ID from PredictManagerCreated event.",
    };
  }

  if (!eventManagerId && uniqueObjectChangeCandidates.length === 1) {
    return {
      managerId: uniqueObjectChangeCandidates[0],
      source: "object_change",
      event,
      objectChangeCandidates: uniqueObjectChangeCandidates,
      ambiguous: false,
      message: "Recovered manager ID from the single PredictManager created object change.",
    };
  }

  return {
    managerId: null,
    source: null,
    event,
    objectChangeCandidates: uniqueObjectChangeCandidates,
    ambiguous: uniqueObjectChangeCandidates.length > 1,
    message:
      uniqueObjectChangeCandidates.length > 1
        ? "Multiple PredictManager created object changes were found; refusing to choose one."
        : "Unable to recover PredictManager ID from event or object changes.",
  };
}

function isPredictManagerCreatedEvent(
  event: DeepBookPredictEventLike,
  config: DeepBookPredictNetworkConfig,
): boolean {
  const eventType = event.type ?? "";

  return (
    eventType.startsWith(`${config.packageId}::`) &&
    eventType.endsWith(MANAGER_CREATED_SUFFIX)
  );
}

export function isRangeMintedEvent(
  event: DeepBookPredictEventLike,
  config: DeepBookPredictNetworkConfig,
): boolean {
  const eventType = event.type ?? "";

  return (
    eventType.startsWith(`${config.packageId}::`) &&
    eventType.endsWith(RANGE_MINTED_SUFFIX)
  );
}

export function isRangeRedeemedEvent(
  event: DeepBookPredictEventLike,
  config: DeepBookPredictNetworkConfig,
): boolean {
  const eventType = event.type ?? "";

  return (
    eventType.startsWith(`${config.packageId}::`) &&
    eventType.endsWith(RANGE_REDEEMED_SUFFIX)
  );
}

export function isPositionRedeemedEvent(
  event: DeepBookPredictEventLike,
  config: DeepBookPredictNetworkConfig,
): boolean {
  const eventType = event.type ?? "";

  return (
    eventType.startsWith(`${config.packageId}::`) &&
    eventType.endsWith(POSITION_REDEEMED_SUFFIX)
  );
}

function extractManagerIdFromParsedJson(parsedJson: unknown): string | null {
  if (!isRecord(parsedJson)) {
    return null;
  }

  for (const field of MANAGER_EVENT_ID_FIELDS) {
    const value = parsedJson[field];

    if (typeof value === "string" && isSuiObjectId(value)) {
      return value;
    }
  }

  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function integerStringOrNull(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    return null;
  }

  try {
    const integer = BigInt(value);
    return integer >= 0n ? integer.toString() : null;
  } catch {
    return null;
  }
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function extractPredictManagerObjectChangeIds(
  objectChanges: readonly DeepBookPredictObjectChangeLike[] | null | undefined,
  config: DeepBookPredictNetworkConfig,
): string[] {
  const managerObjectPrefix = `${config.packageId}::predict_manager::PredictManager`;

  return (
    objectChanges
      ?.filter((objectChange) => objectChange.type === "created")
      .filter((objectChange) => objectChange.objectType?.startsWith(managerObjectPrefix))
      .map((objectChange) => objectChange.objectId)
      .filter((objectId): objectId is string => Boolean(objectId && isSuiObjectId(objectId))) ?? []
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSuiObjectId(value: string): boolean {
  return SUI_OBJECT_ID_PATTERN.test(value);
}
