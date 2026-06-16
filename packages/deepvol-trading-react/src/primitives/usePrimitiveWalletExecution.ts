import { useMemo, useRef, useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import type { TransactionStatus } from "@deepvol/types/deepbookPredict";
import {
  buildMintBinaryPrimitiveTransaction,
  buildMintRangeTransaction,
  buildSuiExplorerTransactionUrl,
  devInspectBinaryQuote,
  devInspectManagerBalance,
  devInspectMintBinaryPreflight,
  devInspectMintRangePreflight,
  devInspectRangeQuote,
  readBinaryPositionQuantity,
  readRangePositionQuantity,
  translateDeepBookPredictError,
} from "@deepvol/sdk/deepbookPredict";
import {
  buildPrimitiveExecutionBlockers,
  buildPrimitivePreflightDependencyKey,
  buildPrimitiveQuoteDependencyKey,
  type PrimitiveExecutionInput,
} from "./primitiveQuoteGate";
import type { PrimitivePreflightController } from "./usePrimitivePreflight";
import type { PrimitiveQuoteState } from "./usePrimitiveQuote";
import { useSuiWallet } from "../core/useSuiWallet";
import { DEEPVOL_STORAGE_KEYS, TESTNET_CHAIN } from "../core/constants";
import {
  buildPrimitivePositionKey,
  persistPrimitiveTrade,
} from "./deepVolPrimitiveStorage";

type UsePrimitiveWalletExecutionParams = {
  quote: PrimitiveQuoteState;
  preflight: PrimitivePreflightController;
  predictManagerId: string | null;
  primitiveMintabilityStatus?: "idle" | "blocked" | "running" | "passed" | "failed" | null;
  rangeMintabilityStatus?: "idle" | "blocked" | "running" | "passed" | "failed" | null;
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
  primitiveMintabilityStatus,
  rangeMintabilityStatus,
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
    oracleObjectId: quote.oracleObjectId,
    marketStatus: quote.marketStatus,
    marketStatusMessage: quote.marketStatusMessage,
    quantity: quote.quantity,
    strike: quote.strike,
    lowerStrike: quote.lowerStrike,
    upperStrike: quote.upperStrike,
  }), [quote.lowerStrike, quote.marketStatus, quote.marketStatusMessage, quote.oracleObjectId, quote.primitiveKind, quote.quantity, quote.series, quote.strike, quote.upperStrike, wallet.address, wallet.isConnected, wallet.isTestnet]);
  const expectedPreflightDependencyKey = useMemo(() => buildPrimitivePreflightDependencyKey({
    primitiveKind: quote.primitiveKind,
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
    series: quote.series,
    oracleObjectId: quote.oracleObjectId,
    marketStatus: quote.marketStatus,
    marketStatusMessage: quote.marketStatusMessage,
    quantity: quote.quantity,
    strike: quote.strike,
    lowerStrike: quote.lowerStrike,
    upperStrike: quote.upperStrike,
    predictManagerId,
  }), [predictManagerId, quote.lowerStrike, quote.marketStatus, quote.marketStatusMessage, quote.oracleObjectId, quote.primitiveKind, quote.quantity, quote.series, quote.strike, quote.upperStrike, wallet.address, wallet.isConnected, wallet.isTestnet]);
  const executionInput = useMemo<PrimitiveExecutionInput>(() => ({
    primitiveKind: quote.primitiveKind,
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
    series: quote.series,
    oracleObjectId: quote.oracleObjectId,
    marketStatus: quote.marketStatus,
    marketStatusMessage: quote.marketStatusMessage,
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
    primitiveMintabilityStatus: primitiveMintabilityStatus ?? null,
    rangeMintabilityStatus: rangeMintabilityStatus ?? null,
  }), [expectedPreflightDependencyKey, expectedQuoteDependencyKey, isSubmitting, predictManagerId, preflight.dependencyKey, preflight.lastRunAtMs, preflight.managerBalanceAtomic, preflight.status, primitiveMintabilityStatus, rangeMintabilityStatus, quote.dependencyKey, quote.lowerStrike, quote.marketStatus, quote.marketStatusMessage, quote.mintCostAtomic, quote.oracleObjectId, quote.primitiveKind, quote.quantity, quote.quotedAtMs, quote.redeemPayoutAtomic, quote.series, quote.status, quote.strike, quote.upperStrike, wallet.address, wallet.isConnected, wallet.isTestnet]);
  const blockers = useMemo(() => buildPrimitiveExecutionBlockers(executionInput), [executionInput]);
  const canSubmit = blockers.length === 0;
  const signAndExecuteTransaction = useSignAndExecuteTransaction();

  async function submit() {
    if (inFlightRef.current) {
      return;
    }

    if (!canSubmit || !wallet.address || !quote.series || !quote.oracleObjectId || !predictManagerId || !quote.quantity) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: blockers.join(" "),
      });
      return;
    }

    if (quote.primitiveKind === "RANGE") {
      await submitRange();
      return;
    }

    if (!quote.strike) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: blockers.join(" "),
      });
      return;
    }

    const owner = wallet.address;
    const series = quote.series;
    const oracleObjectId = quote.oracleObjectId;
    const primitiveType = quote.primitiveKind;
    const direction = primitiveType === "UP" ? "up" : "down";
    const strike = quote.strike;

    try {
      if (BigInt(series.expiry) <= BigInt(Date.now())) {
        setTransactionStatus({
          state: "blocked_unconfirmed",
          error: "This BTC market is no longer live for minting. Refresh or select a new active market.",
        });
        return;
      }
    } catch {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: "This BTC market is no longer live for minting. Refresh or select a new active market.",
      });
      return;
    }

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
        oracleObjectId,
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

      if (quote.mintCostAtomic) {
        const originalCost = BigInt(quote.mintCostAtomic);
        const freshCost = BigInt(freshQuote.mintCostAtomic);
        const maxAcceptableCost = originalCost + (originalCost * 10n) / 100n;
        if (freshCost > maxAcceptableCost) {
          blockBeforeWallet(
            `Fresh primitive mint cost ${freshQuote.mintCostAtomic} exceeds original ${quote.mintCostAtomic} by more than 10%. Refresh quote and rerun preflight.`,
          );
          return;
        }
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
        oracleObjectId,
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
        blockBeforeWallet(translateDeepBookPredictError(latestPreflight.abort.message));
        return;
      }

      const transaction = buildMintBinaryPrimitiveTransaction({
        managerId: predictManagerId,
        oracleId: series.oracleId,
        oracleObjectId,
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

  async function submitRange() {
    if (inFlightRef.current) {
      return;
    }

    if (!quote.lowerStrike || !quote.upperStrike) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: "RANGE requires both lower and upper strikes.",
      });
      return;
    }

    const owner = wallet.address!;
    const series = quote.series!;
    const oracleObjectId = quote.oracleObjectId!;
    const lowerStrike = quote.lowerStrike;
    const upperStrike = quote.upperStrike;

    try {
      if (BigInt(series.expiry) <= BigInt(Date.now())) {
        setTransactionStatus({
          state: "blocked_unconfirmed",
          error: "This BTC market is no longer live for minting. Refresh or select a new active market.",
        });
        return;
      }
    } catch {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: "This BTC market is no longer live for minting. Refresh or select a new active market.",
      });
      return;
    }

    inFlightRef.current = true;
    setTransactionStatus({
      state: "building",
      message: "Re-running RANGE quote, balance, and mint preflight before wallet review.",
    });

    try {
      const positionBefore = await readRangePositionQuantity({
        client,
        sender: owner,
        managerId: predictManagerId!,
        oracleId: series.oracleId,
        expiry: series.expiry,
        lowerStrike,
        higherStrike: upperStrike,
        config: DEEPBOOK_PREDICT_TESTNET,
      });
      const freshQuote = await devInspectRangeQuote({
        client,
        sender: owner,
        oracleId: series.oracleId,
        oracleObjectId,
        expiry: series.expiry,
        lowerStrike,
        higherStrike: upperStrike,
        quantity: quote.quantity!,
        config: DEEPBOOK_PREDICT_TESTNET,
      });

      if (BigInt(freshQuote.mintCostAtomic) <= 0n) {
        blockRangeBeforeWallet("Fresh RANGE mint cost must be positive before wallet review.");
        return;
      }

      if (quote.mintCostAtomic) {
        const originalCost = BigInt(quote.mintCostAtomic);
        const freshCost = BigInt(freshQuote.mintCostAtomic);
        const maxAcceptableCost = originalCost + (originalCost * 10n) / 100n;
        if (freshCost > maxAcceptableCost) {
          blockRangeBeforeWallet(
            `Fresh RANGE mint cost ${freshQuote.mintCostAtomic} exceeds original ${quote.mintCostAtomic} by more than 10%. Refresh quote and rerun preflight.`,
          );
          return;
        }
      }

      const managerBalance = await devInspectManagerBalance({
        client,
        sender: owner,
        managerId: predictManagerId!,
        config: DEEPBOOK_PREDICT_TESTNET,
      });

      if (BigInt(managerBalance.balanceAtomic) < BigInt(freshQuote.mintCostAtomic)) {
        blockRangeBeforeWallet("PredictManager DUSDC balance must cover the fresh RANGE mint cost.");
        return;
      }

      const latestPreflight = await devInspectMintRangePreflight({
        client,
        sender: owner,
        managerId: predictManagerId!,
        oracleId: series.oracleId,
        oracleObjectId,
        expiry: series.expiry,
        lowerStrike,
        higherStrike: upperStrike,
        quantity: quote.quantity!,
        config: DEEPBOOK_PREDICT_TESTNET,
        candidateParams: {
          mintCostAtomic: freshQuote.mintCostAtomic,
          redeemPayoutAtomic: freshQuote.redeemPayoutAtomic,
        },
      });

      if (latestPreflight.status !== "passed") {
        blockRangeBeforeWallet(translateDeepBookPredictError(latestPreflight.abort.message));
        return;
      }

      const transaction = buildMintRangeTransaction({
        managerId: predictManagerId!,
        oracleId: series.oracleId,
        oracleObjectId,
        expiry: series.expiry,
        lowerStrike,
        higherStrike: upperStrike,
        quantity: quote.quantity!,
        config: DEEPBOOK_PREDICT_TESTNET,
        allowRealTestnetMint: true,
      });

      setTransactionStatus({
        state: "awaiting_wallet",
        message: "Confirm RANGE primitive mint in your Sui Testnet wallet.",
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
              await verifyRangeMintSuccess({
                client,
                digest,
                sender: owner,
                managerId: predictManagerId!,
                oracleId: series.oracleId,
                expiry: series.expiry,
                lowerStrike,
                higherStrike: upperStrike,
                quantity: quote.quantity!,
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
              primitiveType: "RANGE" as const,
              digest,
              explorerUrl,
              executedAtMs: Date.now(),
              wallet: owner,
              predictManagerId: predictManagerId!,
              seriesId: series.seriesId,
              oracleId: series.oracleId,
              expiry: series.expiry,
              strike: null,
              lowerStrike,
              upperStrike,
              quantity: quote.quantity!,
              mintCost: freshQuote.mintCostAtomic,
              redeemPayout: freshQuote.redeemPayoutAtomic,
              positionKey: buildPrimitivePositionKey({
                primitiveType: "RANGE",
                oracleId: series.oracleId,
                expiry: series.expiry,
                strike: null,
                lowerStrike,
                upperStrike,
              }),
              status: "success" as const,
            };

            persistPrimitiveTrade(DEEPVOL_STORAGE_KEYS, record);
            setTransactionStatus({
              state: "success",
              digest,
              explorerUrl,
              message: "RANGE primitive mint succeeded, effects/readback were verified, and a local primitive trade record was stored.",
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

    function blockRangeBeforeWallet(error: string) {
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

async function verifyRangeMintSuccess({
  client,
  digest,
  sender,
  managerId,
  oracleId,
  expiry,
  lowerStrike,
  higherStrike,
  quantity,
  positionBeforeAtomic,
}: {
  client: SuiTransactionEffectsClient;
  digest: string;
  sender: string;
  managerId: string;
  oracleId: string;
  expiry: string;
  lowerStrike: string;
  higherStrike: string;
  quantity: string;
  positionBeforeAtomic: string;
}) {
  const result = await client.waitForTransaction({
    digest,
    options: { showEffects: true, showEvents: true },
  });
  const status = readTransactionStatus(result);

  if (status?.status !== "success") {
    throw new Error(status?.error ?? "RANGE primitive mint transaction effects did not report success.");
  }

  const positionAfter = await readRangePositionQuantity({
    client,
    sender,
    managerId,
    oracleId,
    expiry,
    lowerStrike,
    higherStrike,
    config: DEEPBOOK_PREDICT_TESTNET,
  });
  const expectedAfter = BigInt(positionBeforeAtomic) + BigInt(quantity);

  if (BigInt(positionAfter.quantity) !== expectedAfter) {
    throw new Error(`RANGE position readback ${positionAfter.quantity} does not match expected ${expectedAfter.toString()}.`);
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
