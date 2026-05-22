import { useMemo, useRef, useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import type { TransactionStatus } from "@rangepilot/types/deepbookPredict";
import {
  buildMintBinaryPrimitiveTransaction,
  buildSuiExplorerTransactionUrl,
  devInspectBinaryQuote,
  devInspectManagerBalance,
  devInspectMintBinaryPreflight,
  readBinaryPositionQuantity,
  translateDeepBookPredictError,
} from "@rangepilot/sdk/deepbookPredict";
import {
  buildPrimitiveExecutionBlockers,
  buildPrimitivePreflightDependencyKey,
  buildPrimitiveQuoteDependencyKey,
  type PrimitiveExecutionInput,
} from "./primitiveQuoteGate";
import type { PrimitivePreflightController } from "./usePrimitivePreflight";
import type { PrimitiveQuoteState } from "./usePrimitiveQuote";
import { useSuiWallet } from "./useSuiWallet";
import { DEEPVOL_STORAGE_KEYS, TESTNET_CHAIN } from "../lib/constants";
import {
  buildPrimitivePositionKey,
  persistPrimitiveTrade,
} from "../lib/deepVolPrimitiveStorage";

type UsePrimitiveWalletExecutionParams = {
  quote: PrimitiveQuoteState;
  preflight: PrimitivePreflightController;
  predictManagerId: string | null;
};

type SuiTransactionEffectsClient = Parameters<typeof readBinaryPositionQuantity>[0]["client"] & {
  waitForTransaction(input: {
    digest: string;
    options?: {
      showEffects?: boolean;
      showEvents?: boolean;
    };
  }): Promise<unknown>;
};

export function usePrimitiveWalletExecution({
  quote,
  preflight,
  predictManagerId,
}: UsePrimitiveWalletExecutionParams) {
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const wallet = useSuiWallet();
  const inFlightRef = useRef(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({
    state: "idle",
  });
  const isSubmitting = transactionStatus.state === "building" || transactionStatus.state === "awaiting_wallet";
  const expectedQuoteDependencyKey = useMemo(() => buildPrimitiveQuoteDependencyKey({
    primitiveKind: quote.primitiveKind,
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
    series: quote.series,
    quantity: quote.quantity,
    strike: quote.strike,
    lowerStrike: quote.lowerStrike,
    upperStrike: quote.upperStrike,
  }), [quote.lowerStrike, quote.primitiveKind, quote.quantity, quote.series, quote.strike, quote.upperStrike, wallet.address, wallet.isConnected, wallet.isTestnet]);
  const expectedPreflightDependencyKey = useMemo(() => buildPrimitivePreflightDependencyKey({
    primitiveKind: quote.primitiveKind,
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
    series: quote.series,
    quantity: quote.quantity,
    strike: quote.strike,
    lowerStrike: quote.lowerStrike,
    upperStrike: quote.upperStrike,
    predictManagerId,
    mintCostAtomic: quote.mintCostAtomic,
    redeemPayoutAtomic: quote.redeemPayoutAtomic,
    quoteDependencyKey: quote.dependencyKey,
    preflightQuoteDependencyKey: quote.dependencyKey,
  }), [predictManagerId, quote.dependencyKey, quote.lowerStrike, quote.mintCostAtomic, quote.primitiveKind, quote.quantity, quote.redeemPayoutAtomic, quote.series, quote.strike, quote.upperStrike, wallet.address, wallet.isConnected, wallet.isTestnet]);
  const executionInput = useMemo<PrimitiveExecutionInput>(() => ({
    primitiveKind: quote.primitiveKind,
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
    series: quote.series,
    quantity: quote.quantity,
    strike: quote.strike,
    lowerStrike: quote.lowerStrike,
    upperStrike: quote.upperStrike,
    predictManagerId,
    mintCostAtomic: quote.mintCostAtomic,
    redeemPayoutAtomic: quote.redeemPayoutAtomic,
    quoteStatus: quote.status,
    quotedAtMs: quote.quotedAtMs,
    quoteDependencyKey: quote.dependencyKey,
    expectedQuoteDependencyKey,
    preflightStatus: preflight.status,
    preflightDependencyKey: preflight.dependencyKey,
    expectedPreflightDependencyKey,
    preflightLastRunAtMs: preflight.lastRunAtMs,
    managerBalanceAtomic: preflight.managerBalanceAtomic,
    isSubmitting,
  }), [expectedPreflightDependencyKey, expectedQuoteDependencyKey, isSubmitting, predictManagerId, preflight.dependencyKey, preflight.lastRunAtMs, preflight.managerBalanceAtomic, preflight.status, quote.dependencyKey, quote.lowerStrike, quote.mintCostAtomic, quote.primitiveKind, quote.quantity, quote.quotedAtMs, quote.redeemPayoutAtomic, quote.series, quote.status, quote.strike, quote.upperStrike, wallet.address, wallet.isConnected, wallet.isTestnet]);
  const blockers = useMemo(() => buildPrimitiveExecutionBlockers(executionInput), [executionInput]);
  const canSubmit = blockers.length === 0;
  const signAndExecuteTransaction = useSignAndExecuteTransaction();

  async function submit() {
    if (inFlightRef.current) {
      return;
    }

    if (!canSubmit || !wallet.address || !quote.series || !predictManagerId || !quote.quantity || !quote.strike || quote.primitiveKind === "RANGE") {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: blockers.join(" "),
      });
      return;
    }

    const owner = wallet.address;
    const series = quote.series;
    const primitiveType = quote.primitiveKind;
    const direction = primitiveType === "UP" ? "up" : "down";
    const strike = quote.strike;

    inFlightRef.current = true;
    setTransactionStatus({
      state: "building",
      message: `Re-running ${primitiveType} quote, balance, and mint preflight before wallet review.`,
    });

    try {
      const positionBefore = await readBinaryPositionQuantity({
        client,
        sender: owner,
        managerId: predictManagerId,
        oracleId: series.oracleId,
        expiry: series.expiry,
        strike,
        direction,
        config: DEEPBOOK_PREDICT_TESTNET,
      });
      const freshQuote = await devInspectBinaryQuote({
        client,
        sender: owner,
        oracleId: series.oracleId,
        oracleObjectId: series.oracleId,
        expiry: series.expiry,
        strike,
        direction,
        quantity: quote.quantity,
        config: DEEPBOOK_PREDICT_TESTNET,
      });

      if (BigInt(freshQuote.mintCostAtomic) <= 0n) {
        blockBeforeWallet("Fresh primitive mint cost must be positive before wallet review.");
        return;
      }

      if (quote.mintCostAtomic && freshQuote.mintCostAtomic !== quote.mintCostAtomic) {
        blockBeforeWallet("Fresh primitive quote changed. Refresh quote and rerun preflight before wallet review.");
        return;
      }

      const managerBalance = await devInspectManagerBalance({
        client,
        sender: owner,
        managerId: predictManagerId,
        config: DEEPBOOK_PREDICT_TESTNET,
      });

      if (BigInt(managerBalance.balanceAtomic) < BigInt(freshQuote.mintCostAtomic)) {
        blockBeforeWallet("PredictManager DUSDC balance must cover the fresh primitive mint cost.");
        return;
      }

      const latestPreflight = await devInspectMintBinaryPreflight({
        client,
        sender: owner,
        managerId: predictManagerId,
        oracleId: series.oracleId,
        oracleObjectId: series.oracleId,
        expiry: series.expiry,
        strike,
        direction,
        quantity: quote.quantity,
        config: DEEPBOOK_PREDICT_TESTNET,
        candidateParams: {
          mintCostAtomic: freshQuote.mintCostAtomic,
          redeemPayoutAtomic: freshQuote.redeemPayoutAtomic,
        },
      });

      if (latestPreflight.status !== "passed") {
        blockBeforeWallet(latestPreflight.abort.message);
        return;
      }

      const transaction = buildMintBinaryPrimitiveTransaction({
        managerId: predictManagerId,
        oracleId: series.oracleId,
        oracleObjectId: series.oracleId,
        expiry: series.expiry,
        strike,
        direction,
        quantity: quote.quantity,
        config: DEEPBOOK_PREDICT_TESTNET,
        allowRealTestnetMint: true,
      });

      setTransactionStatus({
        state: "awaiting_wallet",
        message: `Confirm ${primitiveType} primitive mint in your Sui Testnet wallet.`,
      });

      signAndExecuteTransaction.mutate(
        {
          transaction,
          chain: TESTNET_CHAIN,
        },
        {
          onSuccess: async (result) => {
            const digest = result.digest;
            const explorerUrl = buildSuiExplorerTransactionUrl(digest);

            try {
              await verifyPrimitiveMintSuccess({
                client,
                digest,
                sender: owner,
                managerId: predictManagerId,
                oracleId: series.oracleId,
                expiry: series.expiry,
                strike,
                direction,
                quantity: quote.quantity,
                positionBeforeAtomic: positionBefore.quantity,
              });
            } catch (error) {
              setTransactionStatus({
                state: "blocked_unconfirmed",
                digest,
                explorerUrl,
                error: translateDeepBookPredictError(error),
              });
              return;
            }

            const record = {
              primitiveType,
              digest,
              explorerUrl,
              executedAtMs: Date.now(),
              wallet: owner,
              predictManagerId,
              seriesId: series.seriesId,
              oracleId: series.oracleId,
              expiry: series.expiry,
              strike,
              lowerStrike: null,
              upperStrike: null,
              quantity: quote.quantity,
              mintCost: freshQuote.mintCostAtomic,
              redeemPayout: freshQuote.redeemPayoutAtomic,
              positionKey: buildPrimitivePositionKey({
                primitiveType,
                oracleId: series.oracleId,
                expiry: series.expiry,
                strike,
                lowerStrike: null,
                upperStrike: null,
              }),
              status: "success" as const,
            };

            persistPrimitiveTrade(DEEPVOL_STORAGE_KEYS, record);
            setTransactionStatus({
              state: "success",
              digest,
              explorerUrl,
              message: `${primitiveType} primitive mint succeeded, effects/readback were verified, and a local primitive trade record was stored.`,
            });
            void queryClient.invalidateQueries({ queryKey: ["primitive-position-readback"] });
          },
          onError: (error) => {
            setTransactionStatus({
              state: "failed",
              error: translateDeepBookPredictError(error),
            });
          },
          onSettled: () => {
            inFlightRef.current = false;
          },
        },
      );
    } catch (error) {
      inFlightRef.current = false;
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: translateDeepBookPredictError(error),
      });
    }

    function blockBeforeWallet(error: string) {
      inFlightRef.current = false;
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error,
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

async function verifyPrimitiveMintSuccess({
  client,
  digest,
  sender,
  managerId,
  oracleId,
  expiry,
  strike,
  direction,
  quantity,
  positionBeforeAtomic,
}: {
  client: SuiTransactionEffectsClient;
  digest: string;
  sender: string;
  managerId: string;
  oracleId: string;
  expiry: string;
  strike: string;
  direction: "up" | "down";
  quantity: string;
  positionBeforeAtomic: string;
}) {
  const result = await client.waitForTransaction({
    digest,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });
  const status = readTransactionStatus(result);

  if (status?.status !== "success") {
    throw new Error(status?.error ?? "Primitive mint transaction effects did not report success.");
  }

  const positionAfter = await readBinaryPositionQuantity({
    client,
    sender,
    managerId,
    oracleId,
    expiry,
    strike,
    direction,
    config: DEEPBOOK_PREDICT_TESTNET,
  });
  const expectedAfter = BigInt(positionBeforeAtomic) + BigInt(quantity);

  if (BigInt(positionAfter.quantity) !== expectedAfter) {
    throw new Error(`Primitive position readback ${positionAfter.quantity} does not match expected ${expectedAfter.toString()}.`);
  }
}

function readTransactionStatus(result: unknown): { status?: string; error?: string } | null {
  if (!isRecord(result) || !isRecord(result.effects) || !isRecord(result.effects.status)) {
    return null;
  }

  return {
    status: typeof result.effects.status.status === "string" ? result.effects.status.status : undefined,
    error: typeof result.effects.status.error === "string" ? result.effects.status.error : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
