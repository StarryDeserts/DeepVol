import { useMemo } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import type { VolSeries } from "@rangepilot/types/deepVol";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import {
  devInspectBinaryQuote,
  getDusdcCoins,
} from "@rangepilot/sdk/deepbookPredict";
import { useDeepVolConfig } from "./useDeepVolConfig";
import { useSuiWallet } from "./useSuiWallet";
import {
  calculateCreateFeeAtomic,
  computeMaxPremiumPaidAtomic,
  normalizePositiveIntegerInput,
} from "../lib/format";
import { readVolSeries } from "../lib/deepVolSeries";

type QuoteStatus = "idle" | "loading" | "ready" | "blocked" | "error";

type CoinSelection = {
  coinObjectId: string;
  balanceAtomic: string;
};

export type DeepVolPreflightState = {
  binaryMintPassed: boolean;
  buyReceiptPassed: boolean;
  managerBalanceAtomic: string | null;
  dependencyKey: string | null;
  message: string;
};

export type DeepVolQuoteState = {
  status: QuoteStatus;
  series: VolSeries | null;
  quantity: string;
  upQuoteAtomic: string | null;
  downQuoteAtomic: string | null;
  expectedPremiumAtomic: string | null;
  createFeeAtomic: string | null;
  maxPremiumPaidAtomic: string | null;
  feeCoin: CoinSelection | null;
  quotedAtMs: number | null;
  preflight: DeepVolPreflightState;
  blockers: string[];
  warnings: string[];
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refreshQuote: () => void;
};

type UseDeepVolQuoteParams = {
  quantityInput: string;
  predictManagerId: string | null;
  seriesId?: string | null;
};

export function useDeepVolQuote({
  quantityInput,
  predictManagerId,
  seriesId,
}: UseDeepVolQuoteParams): DeepVolQuoteState {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const config = useDeepVolConfig();
  const effectiveSeriesId = seriesId ?? config.configuredSeriesId;
  const quantity = normalizePositiveIntegerInput(quantityInput);
  const baseBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (!wallet.isConnected) {
      blockers.push("Connect a Sui wallet before DeepVol can prepare wallet-specific quotes.");
    }

    if (wallet.isConnected && !wallet.isTestnet) {
      blockers.push("Switch the connected wallet to Sui Testnet.");
    }

    if (!quantity) {
      blockers.push("Enter a positive integer quantity.");
    }

    if (!predictManagerId) {
      blockers.push("Enter or store a PredictManager ID before preparing buy_move_receipt.");
    }

    if (!config.isPackageConfigured || !config.isProtocolVaultConfigured || !config.isDusdcConfigured) {
      blockers.push("DeepVol Testnet package, ProtocolVault, or DUSDC config is incomplete.");
    }

    return blockers;
  }, [config.isDusdcConfigured, config.isPackageConfigured, config.isProtocolVaultConfigured, predictManagerId, quantity, wallet.isConnected, wallet.isTestnet]);

  const query = useQuery({
    queryKey: [
      "deepvol-quote",
      wallet.address,
      wallet.isTestnet,
      effectiveSeriesId,
      quantity,
      predictManagerId,
    ],
    enabled: Boolean(effectiveSeriesId && quantity),
    queryFn: async () => {
      const series = await readVolSeries(client, effectiveSeriesId);
      const blockers = [...baseBlockers];
      const warnings: string[] = [];

      if (!series.active) {
        blockers.push("Configured BTC MOVE VolSeries is inactive.");
      }

      if (BigInt(series.lowerStrike) >= BigInt(series.upperStrike)) {
        blockers.push("Configured BTC MOVE VolSeries has invalid strike ordering.");
      }

      if (!wallet.address || !wallet.isTestnet || !quantity) {
        return buildState({
          status: blockers.length > 0 ? "blocked" : "idle",
          series,
          quantity: quantityInput,
          blockers,
          warnings,
        });
      }

      let upQuoteAtomic: string | null = null;
      let downQuoteAtomic: string | null = null;
      let expectedPremiumAtomic: string | null = null;
      let createFeeAtomic: string | null = null;
      let maxPremiumPaidAtomic: string | null = null;
      let feeCoin: CoinSelection | null = null;

      try {
        const [upQuote, downQuote] = await Promise.all([
          devInspectBinaryQuote({
            client,
            sender: wallet.address,
            oracleId: series.oracleId,
            oracleObjectId: series.oracleId,
            expiry: series.expiry,
            strike: series.upperStrike,
            direction: "up",
            quantity,
            config: DEEPBOOK_PREDICT_TESTNET,
          }),
          devInspectBinaryQuote({
            client,
            sender: wallet.address,
            oracleId: series.oracleId,
            oracleObjectId: series.oracleId,
            expiry: series.expiry,
            strike: series.lowerStrike,
            direction: "down",
            quantity,
            config: DEEPBOOK_PREDICT_TESTNET,
          }),
        ]);

        upQuoteAtomic = upQuote.mintCostAtomic;
        downQuoteAtomic = downQuote.mintCostAtomic;
        expectedPremiumAtomic = (BigInt(upQuoteAtomic) + BigInt(downQuoteAtomic)).toString();
        createFeeAtomic = calculateCreateFeeAtomic(expectedPremiumAtomic, series.createFeeBps);
        maxPremiumPaidAtomic = computeMaxPremiumPaidAtomic(expectedPremiumAtomic);

        if (BigInt(upQuoteAtomic) <= 0n || BigInt(downQuoteAtomic) <= 0n) {
          blockers.push("Fresh UP and DOWN quotes must both be positive.");
        }

        if (BigInt(createFeeAtomic) <= 0n) {
          warnings.push("Create Fee rounds to zero for the selected quantity; use a larger quantity for fee visibility.");
        }

        const coins = await getDusdcCoins(client, wallet.address, DEEPBOOK_PREDICT_TESTNET);
        const requiredFee = BigInt(createFeeAtomic);
        const selectedCoin = coins.find((coin) => BigInt(coin.balanceAtomic) >= requiredFee);

        if (selectedCoin) {
          feeCoin = {
            coinObjectId: selectedCoin.coinObjectId,
            balanceAtomic: selectedCoin.balanceAtomic,
          };
        } else {
          blockers.push("No sender-owned Coin<DUSDC> can cover the quoted Create Fee as a whole fee coin.");
        }
      } catch (error) {
        return buildState({
          status: "error",
          series,
          quantity,
          blockers,
          warnings,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return buildState({
        status: blockers.length > 0 ? "blocked" : "ready",
        series,
        quantity,
        upQuoteAtomic,
        downQuoteAtomic,
        expectedPremiumAtomic,
        createFeeAtomic,
        maxPremiumPaidAtomic,
        feeCoin,
        blockers,
        warnings,
        quotedAtMs: Date.now(),
      });
    },
  });

  const state = query.isLoading
    ? buildState({
        status: "loading",
        quantity: quantity ?? quantityInput,
        blockers: baseBlockers,
        warnings: [],
      })
    : query.isError
      ? buildState({
          status: "error",
          quantity: quantity ?? quantityInput,
          blockers: baseBlockers,
          warnings: [],
          error: query.error instanceof Error ? query.error.message : String(query.error),
        })
      : query.data ?? buildState({
          status: baseBlockers.length > 0 ? "blocked" : "idle",
          quantity: quantity ?? quantityInput,
          blockers: baseBlockers,
          warnings: [],
        });

  return {
    ...state,
    isRefreshing: query.isFetching,
    refreshQuote: () => {
      void query.refetch();
    },
  };
}

function buildState(params: Partial<DeepVolQuoteState> & {
  status: QuoteStatus;
  quantity: string;
  blockers: string[];
  warnings: string[];
}): DeepVolQuoteState {
  return {
    series: null,
    upQuoteAtomic: null,
    downQuoteAtomic: null,
    expectedPremiumAtomic: null,
    createFeeAtomic: null,
    maxPremiumPaidAtomic: null,
    feeCoin: null,
    quotedAtMs: null,
    preflight: {
      binaryMintPassed: false,
      buyReceiptPassed: false,
      managerBalanceAtomic: null,
      dependencyKey: null,
      message: "buy_move_receipt<DUSDC> browser preflight must pass before wallet submission is enabled.",
    },
    error: null,
    isLoading: params.status === "loading",
    isRefreshing: false,
    refreshQuote: () => undefined,
    ...params,
  };
}
