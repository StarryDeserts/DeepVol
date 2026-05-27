import { useSyncExternalStore } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { readMoveReceipt } from "@rangepilot/sdk/deepVol";
import type { MoveReceipt } from "@rangepilot/types/deepVol";
import { useDeepVolConfig } from "./useDeepVolConfig";
import { useSuiWallet } from "./useSuiWallet";
import { DEEPVOL_STORAGE_KEYS } from "../lib/constants";
import {
  readStoredReceipts,
  subscribeReceiptStorage,
  type StoredDeepVolReceipt,
} from "../lib/deepVolReceiptStorage";

type ReceiptSource = "local" | "validation_reference";

export type DeepVolPortfolioReceipt = {
  source: ReceiptSource;
  receiptId: string;
  digest: string | null;
  object: MoveReceipt | null;
  storedRecord: StoredDeepVolReceipt | null;
  readbackError: string | null;
};

export function useDeepVolPortfolio() {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const config = useDeepVolConfig();
  const storedReceipts = useStoredReceipts();
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
  };
}

function useStoredReceipts(): StoredDeepVolReceipt[] {
  return useSyncExternalStore(
    subscribeReceiptStorage,
    () => readStoredReceipts(DEEPVOL_STORAGE_KEYS),
    () => [],
  );
}
