import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import type { TransactionStatus } from "@rangepilot/types/deepbookPredict";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { DEEPVOL_TESTNET } from "@rangepilot/config/deepVolTestnet";
import { buildBuyMoveReceiptTransaction, devInspectBuyMoveReceiptPreflight } from "@rangepilot/sdk/deepVol";
import {
  buildSuiExplorerTransactionUrl,
  translateDeepBookPredictError,
} from "@rangepilot/sdk/deepbookPredict";
import { useDeepVolConfig } from "./useDeepVolConfig";
import { useSuiWallet } from "./useSuiWallet";
import { getBuyMoveReceiptBlockers } from "./buyMoveReceiptGate";
import { buildPreflightDependencyKey } from "./useDeepVolPreflight";
import type { DeepVolQuoteState } from "./useDeepVolQuote";
import { DEEPVOL_STORAGE_KEYS, TESTNET_CHAIN } from "../lib/constants";
import { persistReceipt } from "../lib/deepVolReceiptStorage";

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
  const currentPreflightDependencyKey = useMemo(() => buildPreflightDependencyKey({
    walletAddress: wallet.address,
    walletTestnet: wallet.isTestnet,
    predictManagerId,
    quote,
  }), [predictManagerId, quote, wallet.address, wallet.isTestnet]);
  const blockers = useMemo(() => getBuyMoveReceiptBlockers({
    quote,
    predictManagerId,
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
    currentPreflightDependencyKey,
  }), [currentPreflightDependencyKey, predictManagerId, quote, wallet.address, wallet.isConnected, wallet.isTestnet]);
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

  async function submit() {
    if (!canSubmit || !wallet.address || !quote.series || !quote.feeCoin || !predictManagerId || !quote.maxPremiumPaidAtomic || !quote.expectedPremiumAtomic || !quote.createFeeAtomic || !config.protocolVaultId) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: blockers.join(" "),
      });
      return;
    }

    const series = quote.series;
    const feeCoin = quote.feeCoin;
    const maxPremiumPaid = quote.maxPremiumPaidAtomic;
    const expectedPremiumAtomic = quote.expectedPremiumAtomic;
    const createFeeAtomic = quote.createFeeAtomic;
    const protocolVaultId = config.protocolVaultId;
    const owner = wallet.address;

    setTransactionStatus({
      state: "building",
      message: "Re-running buy_move_receipt<DUSDC> browser preflight before wallet review.",
    });

    try {
      const latestPreflight = await devInspectBuyMoveReceiptPreflight({
        client,
        sender: owner,
        seriesId: series.seriesId,
        predictId: config.predictId,
        predictManagerId,
        oracleId: series.oracleId,
        protocolVaultId,
        feeCoinId: feeCoin.coinObjectId,
        quoteCoinType: config.dusdcCoinType,
        quantity: quote.quantity,
        maxPremiumPaid,
        expectedPremiumAtomic,
        feeAmountAtomic: createFeeAtomic,
        config: DEEPVOL_TESTNET,
        predictConfig: DEEPBOOK_PREDICT_TESTNET,
      });

      if (!latestPreflight.passed) {
        setTransactionStatus({
          state: "blocked_unconfirmed",
          error: [latestPreflight.devInspectError, latestPreflight.dryRunError, "Run preflight again after resolving the latest blocker."].filter(isString).join(" "),
        });
        return;
      }

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
        requireBuyMoveReceiptPreflightPassed: true,
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

            persistReceipt(DEEPVOL_STORAGE_KEYS, {
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

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
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
