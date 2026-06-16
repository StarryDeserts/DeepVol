import { useMemo } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import {
  readBinaryPositionQuantity,
  readRangePositionQuantity,
} from "@rangepilot/sdk/deepbookPredict";
import type { StoredDeepVolPrimitiveTrade } from "@/lib/deepVolPrimitiveStorage";

export type PrimitiveRecordPositionReadbackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "pending"
  | "error";

export type PrimitiveRecordPositionReadback = {
  status: PrimitiveRecordPositionReadbackStatus;
  quantity: string | null;
  message: string | null;
  error: string | null;
};

export function usePrimitiveRecordPositionReadback(record: StoredDeepVolPrimitiveTrade): PrimitiveRecordPositionReadback {
  const client = useSuiClient();
  const pendingMessage = useMemo(() => getPendingMessage(record), [record]);
  const query = useQuery({
    queryKey: [
      "primitive-record-position-readback",
      record.digest,
      record.primitiveType,
      record.predictManagerId,
      record.wallet,
      record.oracleId,
      record.expiry,
      record.strike,
      record.lowerStrike,
      record.upperStrike,
    ],
    enabled: !pendingMessage,
    queryFn: async () => {
      if (record.primitiveType === "RANGE") {
        const range = await readRangePositionQuantity({
          client,
          sender: record.wallet,
          managerId: record.predictManagerId,
          oracleId: record.oracleId,
          expiry: record.expiry,
          lowerStrike: record.lowerStrike!,
          higherStrike: record.upperStrike!,
          config: DEEPBOOK_PREDICT_TESTNET,
        });

        return range.quantity;
      }

      const binary = await readBinaryPositionQuantity({
        client,
        sender: record.wallet,
        managerId: record.predictManagerId,
        oracleId: record.oracleId,
        expiry: record.expiry,
        strike: record.strike!,
        direction: record.primitiveType === "UP" ? "up" : "down",
        config: DEEPBOOK_PREDICT_TESTNET,
      });

      return binary.quantity;
    },
  });

  if (pendingMessage) {
    return {
      status: "pending",
      quantity: null,
      message: pendingMessage,
      error: null,
    };
  }

  if (query.isLoading) {
    return {
      status: "loading",
      quantity: null,
      message: "Reading known primitive position key.",
      error: null,
    };
  }

  if (query.isError) {
    return {
      status: "error",
      quantity: null,
      message: "Local transaction record shown while readback is unavailable.",
      error: query.error instanceof Error ? query.error.message : String(query.error),
    };
  }

  return {
    status: "ready",
    quantity: query.data ?? null,
    message: "Known primitive position key readback completed.",
    error: null,
  };
}

function getPendingMessage(record: StoredDeepVolPrimitiveTrade): string | null {
  if (!record.predictManagerId || !record.wallet || !record.oracleId || !record.expiry) {
    return "Primitive readback pending; local transaction record shown.";
  }

  if (record.primitiveType === "RANGE" && (!record.lowerStrike || !record.upperStrike)) {
    return "RANGE readback pending; local transaction record shown.";
  }

  if ((record.primitiveType === "UP" || record.primitiveType === "DOWN") && !record.strike) {
    return `${record.primitiveType} readback pending; local transaction record shown.`;
  }

  return null;
}
