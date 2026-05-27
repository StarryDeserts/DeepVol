import { useMemo } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import {
  readBinaryPositionQuantity,
  readRangePositionQuantity,
} from "@rangepilot/sdk/deepbookPredict";
import { useSuiWallet } from "./useSuiWallet";
import { normalizePositiveIntegerInput } from "../lib/format";
import type { VolSeries } from "@rangepilot/types/deepVol";
import type { PrimitiveKind } from "./primitiveQuoteGate";

type PrimitivePositionReadbackParams = {
  predictManagerId: string | null;
  series: VolSeries | null;
  oracleObjectId: string | null;
  primitiveKind?: PrimitiveKind;
  strikeInput?: string;
  lowerStrikeInput?: string;
  upperStrikeInput?: string;
};

type PrimitivePositionEntry = {
  label: string;
  quantity: string | null;
  key: string;
};

export type PrimitivePositionReadbackState = {
  status: "idle" | "loading" | "ready" | "blocked" | "error";
  entries: PrimitivePositionEntry[];
  blockers: string[];
  error: string | null;
  isLoading: boolean;
};

export function usePrimitivePositionReadback({
  predictManagerId,
  series,
  oracleObjectId,
  primitiveKind,
  strikeInput,
  lowerStrikeInput,
  upperStrikeInput,
}: PrimitivePositionReadbackParams): PrimitivePositionReadbackState {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const selectedStrike = normalizePositiveIntegerInput(strikeInput ?? "");
  const selectedLowerStrike = normalizePositiveIntegerInput(lowerStrikeInput ?? "");
  const selectedUpperStrike = normalizePositiveIntegerInput(upperStrikeInput ?? "");

  const blockers = useMemo(() => {
    const entries: string[] = [];

    if (!wallet.isConnected || !wallet.address) {
      entries.push("Connect a Sui wallet before reading primitive positions.");
    }

    if (wallet.isConnected && !wallet.isTestnet) {
      entries.push("Switch the connected wallet to Sui Testnet before reading primitive positions.");
    }

    if (!predictManagerId) {
      entries.push("Enter a PredictManager ID to read known primitive keys.");
    }

    if (!series) {
      entries.push("Active BTC primitive market must be loaded before reading known primitive keys.");
    }

    if (!oracleObjectId) {
      entries.push("Selected active BTC market oracle object must be available before reading primitive positions.");
    }

    return entries;
  }, [oracleObjectId, predictManagerId, series, wallet.address, wallet.isConnected, wallet.isTestnet]);

  const query = useQuery({
    queryKey: [
      "primitive-position-readback",
      wallet.address,
      wallet.isTestnet,
      predictManagerId,
      series?.seriesId,
      series?.oracleId,
      oracleObjectId,
      series?.expiry,
      primitiveKind,
      selectedStrike,
      selectedLowerStrike,
      selectedUpperStrike,
    ],
    enabled: blockers.length === 0,
    queryFn: async () => {
      if (!wallet.address || !predictManagerId || !series || !oracleObjectId) {
        return [];
      }

      const upStrike = primitiveKind === "UP" && selectedStrike ? selectedStrike : series.upperStrike;
      const downStrike = primitiveKind === "DOWN" && selectedStrike ? selectedStrike : series.lowerStrike;
      const rangeLower = primitiveKind === "RANGE" && selectedLowerStrike ? selectedLowerStrike : series.lowerStrike;
      const rangeUpper = primitiveKind === "RANGE" && selectedUpperStrike ? selectedUpperStrike : series.upperStrike;
      const [up, down, range] = await Promise.all([
        readBinaryPositionQuantity({
          client,
          sender: wallet.address,
          managerId: predictManagerId,
          oracleId: series.oracleId,
          expiry: series.expiry,
          strike: upStrike,
          direction: "up",
          config: DEEPBOOK_PREDICT_TESTNET,
        }),
        readBinaryPositionQuantity({
          client,
          sender: wallet.address,
          managerId: predictManagerId,
          oracleId: series.oracleId,
          expiry: series.expiry,
          strike: downStrike,
          direction: "down",
          config: DEEPBOOK_PREDICT_TESTNET,
        }),
        readRangePositionQuantity({
          client,
          sender: wallet.address,
          managerId: predictManagerId,
          oracleId: series.oracleId,
          expiry: series.expiry,
          lowerStrike: rangeLower,
          higherStrike: rangeUpper,
          config: DEEPBOOK_PREDICT_TESTNET,
        }),
      ]);

      return [
        {
          label: "Known UP position",
          quantity: up.quantity,
          key: `UP ${up.marketKey.strike}`,
        },
        {
          label: "Known DOWN position",
          quantity: down.quantity,
          key: `DOWN ${down.marketKey.strike}`,
        },
        {
          label: "Known RANGE position",
          quantity: range.quantity,
          key: `RANGE ${range.lowerStrike} / ${range.higherStrike}`,
        },
      ];
    },
  });

  if (blockers.length > 0) {
    return {
      status: "blocked",
      entries: [],
      blockers,
      error: null,
      isLoading: false,
    };
  }

  if (query.isLoading) {
    return {
      status: "loading",
      entries: [],
      blockers: [],
      error: null,
      isLoading: true,
    };
  }

  if (query.isError) {
    return {
      status: "error",
      entries: [],
      blockers: [],
      error: query.error instanceof Error ? query.error.message : String(query.error),
      isLoading: false,
    };
  }

  return {
    status: "ready",
    entries: query.data ?? [],
    blockers: [],
    error: null,
    isLoading: false,
  };
}
