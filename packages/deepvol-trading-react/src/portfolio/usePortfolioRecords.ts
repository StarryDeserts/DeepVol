import { useMemo, useSyncExternalStore } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { readMoveReceipt } from "@deepvol/sdk/deepVol";
import type { MoveReceipt } from "@deepvol/types/deepVol";
import { DEEPVOL_STORAGE_KEYS } from "../core/constants";
import { useDeepVolConfig } from "../core/useDeepVolConfig";
import { useSuiWallet } from "../core/useSuiWallet";
import {
  readStoredReceipts,
  subscribeReceiptStorage,
  type StoredDeepVolReceipt,
} from "../move/deepVolReceiptStorage";
import {
  readStoredPrimitiveTrades,
  subscribePrimitiveTradeStorage,
  type StoredDeepVolPrimitiveTrade,
} from "../primitives/deepVolPrimitiveStorage";

export type DeepVolPortfolioReceiptSource = "local" | "validation_reference";

export type DeepVolPortfolioReceipt = {
  source: DeepVolPortfolioReceiptSource;
  receiptId: string;
  digest: string | null;
  object: MoveReceipt | null;
  storedRecord: StoredDeepVolReceipt | null;
  readbackError: string | null;
};

export type DeepVolPrimitiveRecords = {
  records: StoredDeepVolPrimitiveTrade[];
  hasLocalPrimitiveRecords: boolean;
};

export type DeepVolPortfolioRecords = {
  receipts: DeepVolPortfolioReceipt[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  hasLocalReceipts: boolean;
  primitiveRecords: DeepVolPrimitiveRecords;
};

export function usePortfolioRecords(predictManagerId?: string | null): DeepVolPortfolioRecords {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const config = useDeepVolConfig();
  const storedReceipts = useStoredReceipts();
  const primitiveRecords = usePrimitiveRecords(predictManagerId);
  const receiptRefs = storedReceipts.length > 0
    ? storedReceipts
        .filter((entry) => entry.receiptId)
        .map((entry) => ({
          source: "local" as const,
          receiptId: entry.receiptId!,
          digest: entry.digest,
          storedRecord: entry,
        }))
    : [
        {
          source: "validation_reference" as const,
          receiptId: config.validatedReferenceReceiptId,
          digest: config.validatedReferenceBuyDigest,
          storedRecord: null,
        },
      ];

  const query = useQuery({
    queryKey: ["deepvol-portfolio", wallet.address, receiptRefs.map((entry) => `${entry.receiptId}:${entry.storedRecord?.redeemValidation?.digest ?? "open"}`).join(":")],
    queryFn: async () => Promise.all(
      receiptRefs.map(async (entry): Promise<DeepVolPortfolioReceipt> => {
        try {
          const receipt = await readMoveReceipt(client, entry.receiptId);
          return {
            ...entry,
            object: receipt,
            readbackError: null,
          };
        } catch (error) {
          return {
            ...entry,
            object: null,
            readbackError: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    ),
  });

  return {
    receipts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error instanceof Error ? query.error.message : null,
    hasLocalReceipts: storedReceipts.length > 0,
    primitiveRecords,
  };
}

function useStoredReceipts(): StoredDeepVolReceipt[] {
  return useSyncExternalStore(
    subscribeReceiptStorage,
    () => readStoredReceipts(DEEPVOL_STORAGE_KEYS),
    () => [],
  );
}

function usePrimitiveRecords(predictManagerId?: string | null): DeepVolPrimitiveRecords {
  const wallet = useSuiWallet();
  const records = useSyncExternalStore(
    subscribePrimitiveTradeStorage,
    () => readStoredPrimitiveTrades(DEEPVOL_STORAGE_KEYS),
    () => [],
  );

  return useMemo(() => {
    const filtered = records.filter((record) => {
      if (wallet.address && record.wallet !== wallet.address) {
        return false;
      }

      if (predictManagerId && record.predictManagerId !== predictManagerId) {
        return false;
      }

      return true;
    });

    return {
      records: filtered,
      hasLocalPrimitiveRecords: filtered.length > 0,
    };
  }, [predictManagerId, records, wallet.address]);
}
