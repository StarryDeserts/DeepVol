import { useCallback, useEffect, useMemo, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import { findMintableRangePrimitiveCandidate } from "@deepvol/sdk/deepbookPredict";
import type {
  RangePrimitiveMintableCandidate,
  RangePrimitiveMintableAttempt,
  RangePrimitiveMintableCandidateDiagnostic,
  RangePrimitiveMintabilitySummary,
  PrimitiveActiveMarketContext,
} from "@deepvol/types/deepbookPredict";
import {
  buildRangePrimitiveMintabilityKey,
  clearRangePrimitiveMintabilityRecord,
  recordRangePrimitiveMintabilityPass,
  type PrimitiveMintabilityRecord,
} from "./primitiveMintability";
import { useSuiWallet } from "../core/useSuiWallet";

export type RangePrimitiveMintableStatus = "idle" | "blocked" | "running" | "passed" | "failed";

export type RangePrimitiveMintableController = {
  status: RangePrimitiveMintableStatus;
  candidate: RangePrimitiveMintableCandidate | null;
  validationRecord: PrimitiveMintabilityRecord | null;
  attempts: RangePrimitiveMintableAttempt[];
  diagnosticSummary: RangePrimitiveMintabilitySummary | null;
  candidateDiagnostics: RangePrimitiveMintableCandidateDiagnostic[];
  blockers: string[];
  advancedDiagnostics: string[];
  quoteAtomic: string | null;
  regenerate: () => Promise<void>;
  invalidate: () => void;
};

type RangePrimitiveMintableState = Omit<RangePrimitiveMintableController, "regenerate" | "invalidate">;

const EMPTY_RANGE_MINTABILITY_STATE: RangePrimitiveMintableState = {
  status: "idle",
  candidate: null,
  validationRecord: null,
  attempts: [],
  diagnosticSummary: null,
  candidateDiagnostics: [],
  blockers: [],
  advancedDiagnostics: [],
  quoteAtomic: null,
};

function collectCandidateDiagnostics(
  summary: RangePrimitiveMintabilitySummary | null,
): RangePrimitiveMintableCandidateDiagnostic[] {
  if (!summary) return [];

  const diagnostics = [...summary.firstFewFailures];
  if (summary.lastFailure && !diagnostics.some((diagnostic) => sameCandidateDiagnostic(diagnostic, summary.lastFailure!))) {
    diagnostics.push(summary.lastFailure);
  }

  return diagnostics;
}

function sameCandidateDiagnostic(
  left: RangePrimitiveMintableCandidateDiagnostic,
  right: RangePrimitiveMintableCandidateDiagnostic,
): boolean {
  return left.candidate.lowerStrike === right.candidate.lowerStrike &&
    left.candidate.higherStrike === right.candidate.higherStrike &&
    left.candidate.strategy === right.candidate.strategy &&
    left.candidate.widthMultiplier === right.candidate.widthMultiplier &&
    left.failureFamily === right.failureFamily;
}

export function usePrimitiveMintableRange({
  activeMarket,
  predictManagerId,
  quantity,
}: {
  activeMarket: PrimitiveActiveMarketContext | null;
  predictManagerId: string | null;
  quantity: string;
}): RangePrimitiveMintableController {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const [state, setState] = useState<RangePrimitiveMintableState>(EMPTY_RANGE_MINTABILITY_STATE);

  const prerequisiteBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (!wallet.address || !wallet.isConnected) blockers.push("Connect a Sui wallet before validating a mintable RANGE interval.");
    if (wallet.isConnected && !wallet.isTestnet) blockers.push("Switch to Sui Testnet before validating a mintable RANGE interval.");
    if (!predictManagerId) blockers.push("Create or store a PredictManager before validating a mintable RANGE interval.");
    if (!activeMarket) blockers.push("Discover an active BTC market first.");
    if (activeMarket && activeMarket.status !== "live") blockers.push("Active BTC market must be live before validating a mintable RANGE interval.");

    return blockers;
  }, [activeMarket, predictManagerId, wallet.address, wallet.isConnected, wallet.isTestnet]);

  const resetValidationScopeKey = useMemo(() => [
    wallet.address ?? "",
    wallet.isConnected ? "connected" : "disconnected",
    wallet.isTestnet ? "testnet" : "non-testnet",
    predictManagerId ?? "",
    quantity,
    activeMarket?.oracleId ?? "",
    activeMarket?.expiry ?? "",
    activeMarket?.status ?? "",
  ].join(":"), [
    activeMarket?.expiry,
    activeMarket?.oracleId,
    activeMarket?.status,
    predictManagerId,
    quantity,
    wallet.address,
    wallet.isConnected,
    wallet.isTestnet,
  ]);

  useEffect(() => {
    setState((current) => {
      if (
        current.status === "idle" &&
        !current.candidate &&
        current.attempts.length === 0 &&
        current.blockers.length === 0
      ) {
        return current;
      }

      return EMPTY_RANGE_MINTABILITY_STATE;
    });
  }, [resetValidationScopeKey]);

  const invalidate = useCallback(() => {
    if (state.candidate) {
      clearRangePrimitiveMintabilityRecord({
        oracleId: state.candidate.oracleId,
        expiry: state.candidate.expiry,
        lowerStrike: state.candidate.lowerStrike,
        upperStrike: state.candidate.higherStrike,
        quantity,
        predictManagerId,
      });
    }

    setState(EMPTY_RANGE_MINTABILITY_STATE);
  }, [predictManagerId, quantity, state.candidate]);

  const regenerate = useCallback(async () => {
    if (prerequisiteBlockers.length > 0 || !activeMarket || !wallet.address || !predictManagerId) {
      setState({
        ...EMPTY_RANGE_MINTABILITY_STATE,
        status: "blocked",
        blockers: prerequisiteBlockers,
      });
      return;
    }

    setState({
      ...EMPTY_RANGE_MINTABILITY_STATE,
      status: "running",
    });

    const result = await findMintableRangePrimitiveCandidate({
      client,
      sender: wallet.address,
      managerId: predictManagerId,
      oracleId: activeMarket.oracleId,
      oracleObjectId: activeMarket.oracleObjectId,
      expiry: activeMarket.expiry,
      quantity,
      underlyingAsset: activeMarket.underlyingAsset,
      spot: activeMarket.spot,
      forward: activeMarket.forward,
      tickSize: activeMarket.tickSize,
      minStrike: activeMarket.minStrike,
      config: DEEPBOOK_PREDICT_TESTNET,
    });

    if (result.status === "found") {
      const cacheInput = {
        oracleId: result.candidate.oracleId,
        expiry: result.candidate.expiry,
        lowerStrike: result.candidate.lowerStrike,
        upperStrike: result.candidate.higherStrike,
        quantity,
        predictManagerId,
      };

      const validationRecord = recordRangePrimitiveMintabilityPass(
        cacheInput,
        "Mintable RANGE interval found. Quote and mint preflight passed for this BTC market.",
      );

      setState({
        status: "passed",
        candidate: result.candidate,
        validationRecord,
        attempts: result.attempts,
        diagnosticSummary: result.summary,
        candidateDiagnostics: collectCandidateDiagnostics(result.summary),
        blockers: [],
        advancedDiagnostics: [
          ...result.diagnostics,
          `rangeSummary totalCandidates=${result.summary.totalCandidates} quotedCandidates=${result.summary.quotedCandidates} preflightPassedCandidates=${result.summary.preflightPassedCandidates}`,
          `validationKey=${buildRangePrimitiveMintabilityKey(cacheInput)}`,
        ],
        quoteAtomic: result.quote.mintCostAtomic,
      });
      return;
    }

    setState({
      status: "failed",
      candidate: null,
      validationRecord: null,
      attempts: result.attempts,
      diagnosticSummary: result.summary,
      candidateDiagnostics: collectCandidateDiagnostics(result.summary),
      blockers: result.blockers.length > 0
        ? result.blockers
        : ["No mintable RANGE interval was found for the current market. Try refreshing the active BTC market."],
      advancedDiagnostics: [
        ...result.diagnostics,
        `rangeSummary totalCandidates=${result.summary.totalCandidates} quotedCandidates=${result.summary.quotedCandidates} preflightPassedCandidates=${result.summary.preflightPassedCandidates}`,
      ],
      quoteAtomic: null,
    });
  }, [activeMarket, client, predictManagerId, prerequisiteBlockers, quantity, wallet.address]);

  return {
    ...state,
    blockers: [...new Set([...prerequisiteBlockers, ...state.blockers])],
    regenerate,
    invalidate,
  };
}
