import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import type { TransactionStatus } from "@rangepilot/types/deepbookPredict";
import { buildBuyMoveReceiptTransaction } from "@rangepilot/sdk/deepVol";
import {
  buildSuiExplorerTransactionUrl,
  translateDeepBookPredictError,
} from "@rangepilot/sdk/deepbookPredict";
import { useDeepVolConfig } from "./useDeepVolConfig";
import { useSuiWallet } from "./useSuiWallet";
import { getBuyMoveReceiptBlockers } from "./buyMoveReceiptGate";
import type { DeepVolQuoteState } from "./useDeepVolQuote";
import { DEEPVOL_STORAGE_KEYS, TESTNET_CHAIN } from "../lib/constants";

export type StoredDeepVolReceipt = {
  receiptId: string | null;
  digest: string;
  seriesId: string;
  owner: string;
  createdAtMs: number;
};

type UseBuyMoveReceiptParams = {
  quote: DeepVolQuoteState;
  predictManagerId: string | null;
};

export function useBuyMoveReceipt({ quote, predictManagerId }: UseBuyMoveReceiptParams) {
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const wallet = useSuiWallet();
  const config = useDeepVolConfig();
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    state: "idle",
  });
  const blockers = useMemo(() => getBuyMoveReceiptBlockers({
    quote,
    predictManagerId,
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
  }), [predictManagerId, quote, wallet.address, wallet.isConnected, wallet.isTestnet]);
  const canSubmit = blockers.length === 0;
  const signAndExecuteTransaction = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEvents: true,
          showEffects: true,
          showObjectChanges: true,
          showRawEffects: true,
        },
      }),
  });

  function submit() {
    if (!canSubmit || !wallet.address || !quote.series || !quote.feeCoin || !predictManagerId || !quote.maxPremiumPaidAtomic || !config.protocolVaultId) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: blockers.join(" "),
      });
      return;
    }

    const series = quote.series;
    const feeCoin = quote.feeCoin;
    const maxPremiumPaid = quote.maxPremiumPaidAtomic;
    const protocolVaultId = config.protocolVaultId;
    const owner = wallet.address;

    setTransactionStatus({
      state: "building",
      message: "Building a wallet-gated DeepVol buy_move_receipt transaction.",
    });

    try {
      const transaction = buildBuyMoveReceiptTransaction({
        seriesId: series.seriesId,
        predictId: config.predictId,
        predictManagerId,
        oracleId: series.oracleId,
        protocolVaultId,
        feeCoinId: feeCoin.coinObjectId,
        quoteCoinType: config.dusdcCoinType,
        quantity: quote.quantity,
        maxPremiumPaid,
        requireFreshBinaryQuotePassed: true,
        requireBinaryMintPreflightPassed: true,
        requireCreateFeeCoinPrepared: true,
      });

      setTransactionStatus({
        state: "awaiting_wallet",
        message: "Confirm buy_move_receipt<DUSDC> in your Sui Testnet wallet.",
      });

      signAndExecuteTransaction.mutate(
        {
          transaction,
          chain: TESTNET_CHAIN,
        },
        {
          onSuccess: (result) => {
            const receiptId = recoverReceiptId(result);
            const digest = result.digest;

            persistReceipt({
              receiptId,
              digest,
              seriesId: series.seriesId,
              owner,
              createdAtMs: Date.now(),
            });

            setTransactionStatus({
              state: "success",
              digest,
              explorerUrl: buildSuiExplorerTransactionUrl(digest),
              message: receiptId
                ? "DeepVol BTC MOVE receipt transaction succeeded and the receipt was stored locally."
                : "DeepVol BTC MOVE receipt transaction succeeded. Copy the receipt ID from Sui Explorer if object parsing is unavailable.",
            });
            void queryClient.invalidateQueries({ queryKey: ["deepvol-quote"] });
            void queryClient.invalidateQueries({ queryKey: ["deepvol-portfolio"] });
          },
          onError: (error) => {
            setTransactionStatus({
              state: "failed",
              error: translateDeepBookPredictError(error),
            });
          },
        },
      );
    } catch (error) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: translateDeepBookPredictError(error),
      });
    }
  }

  return {
    canSubmit,
    blockers,
    transactionStatus,
    submit,
  };
}

function persistReceipt(record: StoredDeepVolReceipt) {
  const current = readStoredReceipts();
  const deduped = current.filter((entry) => entry.digest !== record.digest);
  window.localStorage.setItem(
    DEEPVOL_STORAGE_KEYS.receipts,
    JSON.stringify([record, ...deduped].slice(0, 10)),
  );
}

function readStoredReceipts(): StoredDeepVolReceipt[] {
  try {
    const raw = window.localStorage.getItem(DEEPVOL_STORAGE_KEYS.receipts);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredReceipt) : [];
  } catch {
    return [];
  }
}

function isStoredReceipt(value: unknown): value is StoredDeepVolReceipt {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<StoredDeepVolReceipt>;
  return typeof record.digest === "string" && typeof record.seriesId === "string" && typeof record.owner === "string";
}

function recoverReceiptId(result: unknown): string | null {
  const objectChanges = (result as { objectChanges?: unknown }).objectChanges;

  if (!Array.isArray(objectChanges)) {
    return null;
  }

  for (const change of objectChanges) {
    if (typeof change !== "object" || change === null) {
      continue;
    }

    const record = change as { type?: string; objectType?: string; objectId?: string };

    if (record.type === "created" && record.objectType?.includes("::receipt::MoveReceipt")) {
      return record.objectId ?? null;
    }
  }

  return null;
}
