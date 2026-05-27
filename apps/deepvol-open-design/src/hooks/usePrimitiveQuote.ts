import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import type { VolSeries } from "@rangepilot/types/deepVol";
import type {
  PrimitiveActiveMarketContext,
  PrimitiveMarketStatus,
} from "@rangepilot/types/deepbookPredict";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import {
  devInspectBinaryQuote,
  devInspectRangeQuote,
  translateDeepBookPredictError,
} from "@rangepilot/sdk/deepbookPredict";
import { useSuiWallet } from "./useSuiWallet";
import { normalizePositiveIntegerInput } from "../lib/format";
import {
  buildPrimitiveQuoteBlockers,
  buildPrimitiveQuoteDependencyKey,
  type PrimitiveInputState,
  type PrimitiveKind,
} from "./primitiveQuoteGate";

export type PrimitiveQuoteStatus = "idle" | "loading" | "ready" | "blocked" | "error";

export type PrimitiveQuoteState = {
  status: PrimitiveQuoteStatus;
  primitiveKind: PrimitiveKind;
  series: VolSeries | null;
  oracleObjectId: string | null;
  marketStatus: PrimitiveMarketStatus;
  marketStatusMessage: string | null;
  quantity: string;
  strike: string | null;
  lowerStrike: string | null;
  upperStrike: string | null;
  mintCostAtomic: string | null;
  redeemPayoutAtomic: string | null;
  quotedAtMs: number | null;
  dependencyKey: string;
  blockers: string[];
  warnings: string[];
  error: string | null;
  diagnostic: unknown | null;
  isLoading: boolean;
  isRefreshing: boolean;
  canRefresh: boolean;
  refreshQuote: () => void;
};

type UsePrimitiveQuoteParams = {
  activeMarket: PrimitiveActiveMarketContext | null;
  primitiveKind: PrimitiveKind;
  quantityInput: string;
  strikeInput: string;
  lowerStrikeInput: string;
  upperStrikeInput: string;
};

type PrimitiveQuoteRunState = {
  status: PrimitiveQuoteStatus;
  dependencyKey: string | null;
  mintCostAtomic: string | null;
  redeemPayoutAtomic: string | null;
  quotedAtMs: number | null;
  blockers: string[];
  warnings: string[];
  error: string | null;
  diagnostic: unknown | null;
};

const EMPTY_RUN_STATE: PrimitiveQuoteRunState = {
  status: "idle",
  dependencyKey: null,
  mintCostAtomic: null,
  redeemPayoutAtomic: null,
  quotedAtMs: null,
  blockers: [],
  warnings: [],
  error: null,
  diagnostic: null,
};

const MARKET_REFRESH_MESSAGE = "Refresh the active BTC market before trading this primitive.";

export function usePrimitiveQuote({
  activeMarket,
  primitiveKind,
  quantityInput,
  strikeInput,
  lowerStrikeInput,
  upperStrikeInput,
}: UsePrimitiveQuoteParams): PrimitiveQuoteState {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const latestRunId = useRef(0);
  const [runState, setRunState] = useState<PrimitiveQuoteRunState>(EMPTY_RUN_STATE);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
  }, [activeMarket?.oracleObjectId, activeMarket?.expiry]);

  useEffect(() => {
    const activeMarketExpiry = activeMarket?.expiry;
    if (!activeMarketExpiry) {
      return;
    }

    let expiryMs: number;
    try {
      expiryMs = Number(BigInt(activeMarketExpiry));
    } catch {
      return;
    }

    if (!Number.isFinite(expiryMs) || nowMs >= expiryMs) {
      return;
    }

    const delayMs = Math.min(Math.max(0, expiryMs - Date.now() + 1), 2_147_483_647);
    const expiryTimer = setTimeout(() => {
      setNowMs(Date.now());
    }, delayMs);

    return () => clearTimeout(expiryTimer);
  }, [activeMarket?.expiry, nowMs]);

  const marketStatus: PrimitiveMarketStatus = deriveEffectiveMarketStatus(activeMarket, nowMs);
  const series = useMemo(() => buildSelectedMarketSeries(activeMarket, marketStatus), [activeMarket, marketStatus]);
  const quantity = normalizePositiveIntegerInput(quantityInput);
  const strike = primitiveKind === "UP" || primitiveKind === "DOWN"
    ? normalizePositiveIntegerInput(strikeInput)
    : null;
  const lowerStrike = primitiveKind === "RANGE"
    ? normalizePositiveIntegerInput(lowerStrikeInput)
    : null;
  const upperStrike = primitiveKind === "RANGE"
    ? normalizePositiveIntegerInput(upperStrikeInput)
    : null;
  const marketStatusMessage = marketStatus === "live"
    ? null
    : marketStatusMessageForActiveMarket(activeMarket, marketStatus);
  const oracleObjectId = activeMarket?.oracleObjectId ?? null;

  const currentInput = useMemo<PrimitiveInputState>(() => ({
    primitiveKind,
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
    series,
    oracleObjectId,
    marketStatus,
    marketStatusMessage,
    quantity,
    strike,
    lowerStrike,
    upperStrike,
  }), [lowerStrike, marketStatus, marketStatusMessage, oracleObjectId, primitiveKind, quantity, series, strike, upperStrike, wallet.address, wallet.isConnected, wallet.isTestnet]);

  const dependencyKey = useMemo(() => buildPrimitiveQuoteDependencyKey(currentInput), [currentInput]);
  const baseBlockers = useMemo(() => buildPrimitiveQuoteBlockers(currentInput), [currentInput]);

  useEffect(() => {
    latestRunId.current += 1;
    setRunState(EMPTY_RUN_STATE);
  }, [dependencyKey]);

  const refreshQuote = useCallback(() => {
    const runId = latestRunId.current + 1;
    latestRunId.current = runId;
    const refreshNowMs = Date.now();
    const freshMarketStatus: PrimitiveMarketStatus = deriveEffectiveMarketStatus(activeMarket, refreshNowMs);
    if (freshMarketStatus !== currentInput.marketStatus) {
      setNowMs(refreshNowMs);
    }
    const refreshInput: PrimitiveInputState = {
      ...currentInput,
      series: buildSelectedMarketSeries(activeMarket, freshMarketStatus),
      marketStatus: freshMarketStatus,
      marketStatusMessage: freshMarketStatus === "live"
        ? null
        : marketStatusMessageForActiveMarket(activeMarket, freshMarketStatus),
    };
    const blockers = buildPrimitiveQuoteBlockers(refreshInput);

    if (blockers.length > 0) {
      setRunState({
        status: "blocked",
        dependencyKey: buildPrimitiveQuoteDependencyKey(refreshInput),
        mintCostAtomic: null,
        redeemPayoutAtomic: null,
        quotedAtMs: null,
        blockers,
        warnings: [],
        error: null,
        diagnostic: null,
      });
      return;
    }

    const selectedSeries = refreshInput.series;
    const sender = refreshInput.walletAddress;
    const normalizedQuantity = refreshInput.quantity;
    const selectedOracleObjectId = refreshInput.oracleObjectId;

    if (!selectedSeries || !sender || !normalizedQuantity || !selectedOracleObjectId) {
      return;
    }

    setRunState({
      status: "loading",
      dependencyKey,
      mintCostAtomic: null,
      redeemPayoutAtomic: null,
      quotedAtMs: null,
      blockers: [],
      warnings: [],
      error: null,
      diagnostic: null,
    });

    void (async () => {
      try {
        const quote = primitiveKind === "RANGE"
          ? await devInspectRangeQuote({
              client,
              sender,
              oracleId: selectedSeries.oracleId,
              oracleObjectId: selectedOracleObjectId,
              expiry: selectedSeries.expiry,
              lowerStrike: lowerStrike ?? "",
              higherStrike: upperStrike ?? "",
              quantity: normalizedQuantity,
              config: DEEPBOOK_PREDICT_TESTNET,
            })
          : await devInspectBinaryQuote({
              client,
              sender,
              oracleId: selectedSeries.oracleId,
              oracleObjectId: selectedOracleObjectId,
              expiry: selectedSeries.expiry,
              strike: strike ?? "",
              direction: primitiveKind === "UP" ? "up" : "down",
              quantity: normalizedQuantity,
              config: DEEPBOOK_PREDICT_TESTNET,
            });

        if (latestRunId.current !== runId) {
          return;
        }

        setRunState({
          status: "ready",
          dependencyKey,
          mintCostAtomic: quote.mintCostAtomic,
          redeemPayoutAtomic: quote.redeemPayoutAtomic,
          quotedAtMs: Date.now(),
          blockers: [],
          warnings: [],
          error: null,
          diagnostic: quote.diagnostic ?? null,
        });
      } catch (error) {
        if (latestRunId.current !== runId) {
          return;
        }

        setRunState({
          status: "error",
          dependencyKey,
          mintCostAtomic: null,
          redeemPayoutAtomic: null,
          quotedAtMs: null,
          blockers: [],
          warnings: [],
          error: translateDeepBookPredictError(error),
          diagnostic: null,
        });
      }
    })();
  }, [activeMarket, client, currentInput, dependencyKey, lowerStrike, primitiveKind, strike, upperStrike]);

  const freshRun = runState.dependencyKey === dependencyKey ? runState : EMPTY_RUN_STATE;
  const status = freshRun.status === "idle" && baseBlockers.length > 0 ? "blocked" : freshRun.status;
  const staleWarning = runState.dependencyKey && runState.dependencyKey !== dependencyKey
    ? ["Primitive quote inputs changed; refresh quote before preflight."]
    : [];
  const isRefreshing = freshRun.status === "loading";

  return buildPrimitiveQuoteState({
    primitiveKind,
    series,
    oracleObjectId,
    marketStatus,
    marketStatusMessage,
    quantity: quantity ?? quantityInput,
    strike,
    lowerStrike,
    upperStrike,
    dependencyKey,
    status,
    mintCostAtomic: freshRun.mintCostAtomic,
    redeemPayoutAtomic: freshRun.redeemPayoutAtomic,
    quotedAtMs: freshRun.quotedAtMs,
    blockers: freshRun.status === "blocked" || freshRun.status === "error" ? freshRun.blockers : baseBlockers,
    warnings: [...freshRun.warnings, ...staleWarning],
    error: freshRun.error,
    diagnostic: freshRun.diagnostic,
    isLoading: isRefreshing,
    isRefreshing,
    canRefresh: baseBlockers.length === 0 && !isRefreshing,
    refreshQuote,
  });
}

function buildSelectedMarketSeries(
  activeMarket: PrimitiveActiveMarketContext | null,
  marketStatus: PrimitiveMarketStatus,
): VolSeries | null {
  if (!activeMarket) {
    return null;
  }

  return {
    seriesId: `${activeMarket.source}:${activeMarket.oracleId}:${activeMarket.expiry}`,
    creator: "",
    oracleId: activeMarket.oracleId,
    expiry: activeMarket.expiry,
    lowerStrike: activeMarket.suggestedLowerStrike ?? activeMarket.suggestedDownStrike ?? "0",
    upperStrike: activeMarket.suggestedUpperStrike ?? activeMarket.suggestedUpStrike ?? "0",
    metadataUri: "",
    createFeeBps: 0,
    active: marketStatus === "live",
    createdAtMs: "",
  };
}

function deriveEffectiveMarketStatus(activeMarket: PrimitiveActiveMarketContext | null, nowMs: number): PrimitiveMarketStatus {
  if (!activeMarket) {
    return "unknown";
  }

  try {
    if (BigInt(activeMarket.expiry) <= BigInt(nowMs)) {
      return "expired";
    }
  } catch {
    return "unknown";
  }

  return activeMarket.status;
}

function marketStatusMessageForActiveMarket(
  activeMarket: PrimitiveActiveMarketContext | null,
  marketStatus: PrimitiveMarketStatus,
): string {
  switch (marketStatus) {
    case "expired":
      return "The selected BTC market has expired. Refresh or select a new active BTC market before trading primitives.";
    case "stale":
      return "This BTC market is no longer live for minting. Refresh or select a new active market.";
    case "live":
      return "Active BTC market is live for primitive quote and mint preflight.";
    case "unknown":
      return activeMarket ? "Refresh the active BTC market before trading this primitive." : MARKET_REFRESH_MESSAGE;
  }
}

function buildPrimitiveQuoteState(params: Partial<PrimitiveQuoteState> & {
  primitiveKind: PrimitiveKind;
  quantity: string;
  dependencyKey: string;
  status: PrimitiveQuoteStatus;
  blockers: string[];
  warnings: string[];
  isLoading: boolean;
  isRefreshing: boolean;
  canRefresh: boolean;
  refreshQuote: () => void;
}): PrimitiveQuoteState {
  return {
    series: null,
    oracleObjectId: null,
    marketStatus: "unknown",
    marketStatusMessage: MARKET_REFRESH_MESSAGE,
    strike: null,
    lowerStrike: null,
    upperStrike: null,
    mintCostAtomic: null,
    redeemPayoutAtomic: null,
    quotedAtMs: null,
    error: null,
    diagnostic: null,
    ...params,
  };
}
