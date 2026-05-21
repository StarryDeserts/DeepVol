import { useEffect, useMemo, useRef, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { DEEPVOL_TESTNET } from "@rangepilot/config/deepVolTestnet";
import { devInspectBuyMoveReceiptPreflight } from "@rangepilot/sdk/deepVol";
import type { DeepVolBuyReceiptPreflightResult } from "@rangepilot/types/deepVol";
import type { DeepVolPreflightState, DeepVolQuoteState } from "./useDeepVolQuote";
import { useDeepVolConfig } from "./useDeepVolConfig";
import { useSuiWallet } from "./useSuiWallet";

type PreflightStatus = "idle" | "ready" | "running" | "blocked" | "passed";
type KeyedDeepVolBuyReceiptPreflightResult = DeepVolBuyReceiptPreflightResult & { dependencyKey: string | null };

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
  dependencyKey: string;
  runPreflight: () => void;
};


export function useDeepVolPreflight({
  quote,
  predictManagerId,
  walletDusdcChecked,
}: UseDeepVolPreflightParams): DeepVolPreflightController {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const config = useDeepVolConfig();
  const latestRunId = useRef(0);
  const latestDependencyKey = useRef("");
  const [runState, setRunState] = useState<{
    status: PreflightStatus;
    lastRunAtMs: number | null;
    blockers: string[];
    result: KeyedDeepVolBuyReceiptPreflightResult | null;
  }>({
    status: "idle",
    lastRunAtMs: null,
    blockers: [],
    result: null,
  });
  const dependencyKey = buildPreflightDependencyKey({
    walletAddress: wallet.address,
    walletTestnet: wallet.isTestnet,
    predictManagerId,
    quote,
  });
  latestDependencyKey.current = dependencyKey;

  useEffect(() => {
    latestRunId.current += 1;
    setRunState({
      status: "idle",
      lastRunAtMs: null,
      blockers: [],
      result: null,
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

    if (!quote.createFeeAtomic) {
      blockers.push("Refresh a quote with a computed DeepVol Create Fee before running DeepVol preflight.");
    }

    if (!quote.feeCoin) {
      blockers.push("Prepare a sender-owned Coin<DUSDC> covering the Create Fee before running DeepVol preflight.");
    } else if (quote.createFeeAtomic && BigInt(quote.feeCoin.balanceAtomic) < BigInt(quote.createFeeAtomic)) {
      blockers.push("Selected sender-owned Coin<DUSDC> no longer covers the quoted Create Fee.");
    }

    return [...new Set(blockers)];
  }, [predictManagerId, quote.createFeeAtomic, quote.downQuoteAtomic, quote.expectedPremiumAtomic, quote.feeCoin, quote.maxPremiumPaidAtomic, quote.series, quote.upQuoteAtomic, wallet.address, wallet.isConnected, wallet.isTestnet, walletDusdcChecked]);
  const canRun = prerequisiteBlockers.length === 0;
  const runBlockers = runState.status === "blocked" ? runState.blockers : [];
  const blockers = [...new Set([...prerequisiteBlockers, ...runBlockers])];
  const status: PreflightStatus = runState.status === "running"
    ? "running"
    : runState.status === "blocked"
      ? "blocked"
      : runState.status === "passed"
        ? "passed"
        : canRun
          ? "ready"
          : "idle";

  async function runPreflight() {
    if (!canRun || !wallet.address || !predictManagerId || !quote.series || !quote.expectedPremiumAtomic || !quote.maxPremiumPaidAtomic || !quote.createFeeAtomic || !quote.feeCoin) {
      setRunState({
        status: "blocked",
        lastRunAtMs: Date.now(),
        blockers: prerequisiteBlockers,
        result: null,
      });
      return;
    }

    const runId = latestRunId.current + 1;
    const runDependencyKey = dependencyKey;
    latestRunId.current = runId;

    setRunState({
      status: "running",
      lastRunAtMs: Date.now(),
      blockers: [],
      result: null,
    });

    try {
      const result = await devInspectBuyMoveReceiptPreflight({
        client,
        sender: wallet.address,
        seriesId: quote.series.seriesId,
        predictId: config.predictId,
        predictManagerId,
        oracleId: quote.series.oracleId,
        protocolVaultId: config.protocolVaultId ?? undefined,
        feeCoinId: quote.feeCoin.coinObjectId,
        quoteCoinType: config.dusdcCoinType,
        quantity: quote.quantity,
        maxPremiumPaid: quote.maxPremiumPaidAtomic,
        expectedPremiumAtomic: quote.expectedPremiumAtomic,
        feeAmountAtomic: quote.createFeeAtomic,
        config: DEEPVOL_TESTNET,
        predictConfig: DEEPBOOK_PREDICT_TESTNET,
      });

      if (latestRunId.current !== runId || latestDependencyKey.current !== runDependencyKey) {
        return;
      }

      const resultWithKey = { ...result, dependencyKey: runDependencyKey };
      const resultBlockers = result.passed ? [] : [result.devInspectError, result.dryRunError].filter(isString);

      setRunState({
        status: result.passed ? "passed" : "blocked",
        lastRunAtMs: Date.now(),
        blockers: resultBlockers.length > 0 ? resultBlockers : ["buy_move_receipt<DUSDC> browser preflight did not pass."],
        result: resultWithKey,
      });
    } catch (error) {
      if (latestRunId.current !== runId || latestDependencyKey.current !== runDependencyKey) {
        return;
      }

      setRunState({
        status: "blocked",
        lastRunAtMs: Date.now(),
        blockers: [error instanceof Error ? error.message : String(error)],
        result: null,
      });
    }
  }

  const preflight = buildPreflightState(status, runState.result, runState.lastRunAtMs);

  return {
    status,
    preflight,
    blockers,
    warnings: buildWarnings(canRun, status, runState.result),
    canRun,
    isRunning: status === "running",
    lastRunAtMs: runState.lastRunAtMs,
    dependencyKey,
    runPreflight,
  };
}

export function buildPreflightDependencyKey({
  walletAddress,
  walletTestnet,
  predictManagerId,
  quote,
}: {
  walletAddress: string | null;
  walletTestnet: boolean;
  predictManagerId: string | null;
  quote: Pick<DeepVolQuoteState, "quantity" | "series" | "upQuoteAtomic" | "downQuoteAtomic" | "maxPremiumPaidAtomic" | "expectedPremiumAtomic" | "createFeeAtomic" | "feeCoin">;
}) {
  return [
    walletAddress ?? "",
    walletTestnet ? "testnet" : "not-testnet",
    predictManagerId ?? "",
    quote.series?.seriesId ?? "",
    quote.quantity,
    quote.upQuoteAtomic ?? "",
    quote.downQuoteAtomic ?? "",
    quote.maxPremiumPaidAtomic ?? "",
    quote.expectedPremiumAtomic ?? "",
    quote.createFeeAtomic ?? "",
    quote.feeCoin?.coinObjectId ?? "",
    quote.feeCoin?.balanceAtomic ?? "",
    quote.series?.oracleId ?? "",
  ].join(":");
}

function buildPreflightState(
  status: PreflightStatus,
  result: KeyedDeepVolBuyReceiptPreflightResult | null,
  lastRunAtMs: number | null,
): DeepVolPreflightState {
  if (status === "passed" && result?.passed) {
    return {
      binaryMintPassed: false,
      buyReceiptPassed: true,
      managerBalanceAtomic: result.managerBalanceAtomic,
      dependencyKey: result.dependencyKey,
      message: "buy_move_receipt<DUSDC> browser preflight passed. Wallet review is now available.",
    };
  }

  if (status === "running") {
    return {
      binaryMintPassed: false,
      buyReceiptPassed: false,
      managerBalanceAtomic: null,
      dependencyKey: null,
      message: "Running browser buy_move_receipt<DUSDC> preflight.",
    };
  }

  if (status === "ready") {
    return {
      binaryMintPassed: false,
      buyReceiptPassed: false,
      managerBalanceAtomic: result?.managerBalanceAtomic ?? null,
      dependencyKey: null,
      message: "Run buy_move_receipt<DUSDC> browser preflight before wallet submission is enabled.",
    };
  }

  return {
    binaryMintPassed: false,
    buyReceiptPassed: false,
    managerBalanceAtomic: result?.managerBalanceAtomic ?? null,
    dependencyKey: null,
    message: status === "blocked" && lastRunAtMs
      ? "Preflight ran and found blockers."
      : "buy_move_receipt<DUSDC> browser preflight must pass before wallet submission is enabled.",
  };
}

function buildWarnings(
  canRun: boolean,
  status: PreflightStatus,
  result: KeyedDeepVolBuyReceiptPreflightResult | null,
): string[] {
  const warnings = [...(result?.diagnostics ?? [])];

  if (canRun && status !== "blocked" && status !== "passed") {
    warnings.push("Direct two-leg binary mint preflight is diagnostic-only; final wallet gating uses buy_move_receipt<DUSDC> browser preflight.");
  }

  return [...new Set(warnings)];
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
