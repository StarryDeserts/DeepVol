import type { VolSeries } from "@rangepilot/types/deepVol";
import { decodeAsciiVector } from "./format";

type ParsedMoveObject = {
  data?: {
    content?: {
      dataType?: string;
      fields?: Record<string, unknown>;
    };
  };
};

export async function readVolSeries(
  client: {
    getObject(input: {
      id: string;
      options?: { showContent?: boolean; showOwner?: boolean };
    }): Promise<unknown>;
  },
  seriesId: string,
): Promise<VolSeries> {
  const response = await client.getObject({
    id: seriesId,
    options: { showContent: true, showOwner: true },
  });
  const fields = (response as ParsedMoveObject).data?.content?.fields;

  if (!fields) {
    throw new Error("Configured VolSeries object content is unavailable from Sui Testnet.");
  }

  const oracleId = readIdField(fields.oracle_id ?? fields.oracleId);
  const expiry = readScalarField(fields.expiry);
  const lowerStrike = readScalarField(fields.lower_strike ?? fields.lowerStrike);
  const upperStrike = readScalarField(fields.upper_strike ?? fields.upperStrike);
  const createFeeBps = Number(readScalarField(fields.create_fee_bps ?? fields.createFeeBps));
  const active = Boolean(fields.active);

  if (!oracleId || !expiry || !lowerStrike || !upperStrike || !Number.isFinite(createFeeBps)) {
    throw new Error("Configured VolSeries is missing oracle, expiry, strike, or Create Fee fields.");
  }

  return {
    seriesId,
    creator: String(fields.creator ?? ""),
    oracleId,
    expiry,
    lowerStrike,
    upperStrike,
    metadataUri: decodeAsciiVector(fields.metadata_uri ?? fields.metadataUri) ?? "",
    createFeeBps,
    active,
    createdAtMs: readScalarField(fields.created_at_ms ?? fields.createdAtMs) ?? "",
  };
}

function readScalarField(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "object" && "fields" in value) {
    return readScalarField((value as { fields?: unknown }).fields);
  }

  return null;
}

function readIdField(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return readIdField(record.id ?? record.bytes ?? record.fields);
  }

  return null;
}
