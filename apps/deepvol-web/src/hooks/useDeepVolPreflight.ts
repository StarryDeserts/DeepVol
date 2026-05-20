import { useEffect, useMemo, useState } from "react";
import type { DeepVolPreflightState, DeepVolQuoteState } from "./useDeepVolQuote";
import { useSuiWallet } from "./useSuiWallet";

type PreflightStatus = "idle" | "ready" | "running" | "blocked" | "passed";

type UseDeepVolPreflightParams = {
  quote: DeepVolQuoteState;
  predictManagerId: string | null;
  walletDusdcChecked: boolean;
};

export type DeepVolPreflightController = {
  status: PreflightStatus;
  preflight: DeepVolPreflightState;
  blockers: string[];
  warnings: string[];
  canRun: boolean;
  isRunning: boolean;
  lastRunAtMs: number | null;
  runPreflight: () => void;
};

const MISSING_BROWSER_PREFLIGHT_BLOCKERS = [
  "Browser direct two-leg binary mint preflight is still script-only, so wallet buy remains disabled.",
  "Browser buy_move_receipt<DUSDC> preflight is not implemented in the DeepVol web app yet, so wallet buy remains disabled.",
] as const;

export function useDeepVolPreflight({
  quote,
  predictManagerId,
  walletDusdcChecked,
}: UseDeepVolPreflightParams): DeepVolPreflightController {
  const wallet = useSuiWallet();
  const [runState, setRunState] = useState<{
    status: PreflightStatus;
    lastRunAtMs: number | null;
    blockers: string[];
  }>({
    status: "idle",
    lastRunAtMs: null,
    blockers: [],
  });
  const dependencyKey = [
    wallet.address ?? "",
    wallet.isTestnet ? "testnet" : "not-testnet",
    predictManagerId ?? "",
    quote.series?.seriesId ?? "",
    quote.quantity,
    quote.upQuoteAtomic ?? "",
    quote.downQuoteAtomic ?? "",
    quote.maxPremiumPaidAtomic ?? "",
    quote.feeCoin?.coinObjectId ?? "",
  ].join(":");

  useEffect(() => {
    setRunState({
      status: "idle",
      lastRunAtMs: null,
      blockers: [],
    });
  }, [dependencyKey]);

  const prerequisiteBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (!wallet.address || !wallet.isConnected) {
      blockers.push("Connect a Sui wallet before running DeepVol preflight.");
    }

    if (wallet.isConnected && !wallet.isTestnet) {
      blockers.push("Switch the connected wallet to Sui Testnet before running DeepVol preflight.");
    }

    if (!predictManagerId) {
      blockers.push("Create or store a PredictManager before running DeepVol preflight.");
    }

    if (!walletDusdcChecked) {
      blockers.push("Load wallet DUSDC balance before running DeepVol preflight.");
    }

    if (!quote.series) {
      blockers.push("Load the configured BTC MOVE VolSeries before running DeepVol preflight.");
    }

    if (!quote.upQuoteAtomic || !quote.downQuoteAtomic || !quote.expectedPremiumAtomic || !quote.maxPremiumPaidAtomic) {
      blockers.push("Refresh fresh UP and DOWN quotes before running DeepVol preflight.");
    }

    if (!quote.feeCoin) {
      blockers.push("Prepare a sender-owned Coin<DUSDC> covering the Create Fee before running DeepVol preflight.");
    }

    return [...new Set(blockers)];
  }, [predictManagerId, quote.downQuoteAtomic, quote.expectedPremiumAtomic, quote.feeCoin, quote.maxPremiumPaidAtomic, quote.series, quote.upQuoteAtomic, wallet.address, wallet.isConnected, wallet.isTestnet, walletDusdcChecked]);
  const canRun = prerequisiteBlockers.length === 0;
  const runBlockers = runState.status === "blocked" ? runState.blockers : [];
  const blockers = [...new Set([...prerequisiteBlockers, ...runBlockers])];
  const status: PreflightStatus = runState.status === "running"
    ? "running"
    : runState.status === "blocked"
      ? "blocked"
      : canRun
        ? "ready"
        : "idle";

  function runPreflight() {
    if (!canRun) {
      setRunState({
        status: "blocked",
        lastRunAtMs: Date.now(),
        blockers: prerequisiteBlockers,
      });
      return;
    }

    setRunState({
      status: "blocked",
      lastRunAtMs: Date.now(),
      blockers: [...MISSING_BROWSER_PREFLIGHT_BLOCKERS],
    });
  }

  return {
    status,
    preflight: {
      binaryMintPassed: false,
      buyReceiptPassed: false,
      message: status === "ready"
        ? "Run full browser preflight before wallet submission is enabled."
        : status === "blocked" && runState.lastRunAtMs
          ? "Preflight ran and found blockers."
          : "Full browser preflight must pass before wallet submission is enabled.",
    },
    blockers,
    warnings: canRun && status !== "blocked"
      ? ["Run preflight is available, but final buy stays disabled until browser-safe binary mint and receipt preflight helpers pass."]
      : [],
    canRun,
    isRunning: status === "running",
    lastRunAtMs: runState.lastRunAtMs,
    runPreflight,
  };
}
