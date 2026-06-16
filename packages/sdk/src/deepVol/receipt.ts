import type { MoveReceipt } from "@deepvol/types/deepVol";

export async function readMoveReceipt(
  client: {
    getObject(input: {
      id: string;
      options?: { showContent?: boolean; showOwner?: boolean };
    }): Promise<unknown>;
  },
  receiptId: string,
): Promise<MoveReceipt> {
  const response = await client.getObject({
    id: receiptId,
    options: { showContent: true, showOwner: true },
  });
  const fields = (response as ParsedMoveObject).data?.content?.fields;

  if (!fields) {
    throw new Error("MoveReceipt object content is unavailable from Sui Testnet.");
  }

  return {
    receiptId,
    owner: readAddressField(fields.owner) ?? "",
    seriesId: readIdField(fields.series_id ?? fields.seriesId) ?? "",
    predictManagerId: readIdField(fields.predict_manager_id ?? fields.predictManagerId) ?? "",
    oracleId: readIdField(fields.oracle_id ?? fields.oracleId) ?? "",
    expiry: readScalarField(fields.expiry) ?? "",
    lowerStrike: readScalarField(fields.lower_strike ?? fields.lowerStrike) ?? "",
    upperStrike: readScalarField(fields.upper_strike ?? fields.upperStrike) ?? "",
    upStrike: readScalarField(fields.up_strike ?? fields.upStrike) ?? "",
    downStrike: readScalarField(fields.down_strike ?? fields.downStrike) ?? "",
    quantity: readScalarField(fields.quantity) ?? "",
    premiumPaid: readScalarField(fields.premium_paid ?? fields.premiumPaid) ?? "",
    createFeePaid: readScalarField(fields.create_fee_paid ?? fields.createFeePaid) ?? "",
    createdAtMs: readScalarField(fields.created_at_ms ?? fields.createdAtMs) ?? "",
    status: Number(readScalarField(fields.status) ?? 0) as MoveReceipt["status"],
  };
}

type ParsedMoveObject = {
  data?: {
    content?: {
      fields?: Record<string, unknown>;
    };
  };
};

function readScalarField(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object" && "fields" in value) {
    return readScalarField((value as { fields?: unknown }).fields);
  }

  return null;
}

function readAddressField(value: unknown): string | null {
  return readScalarField(value);
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
