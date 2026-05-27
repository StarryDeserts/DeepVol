import { useCallback, useEffect, useMemo, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { findMintableBtcMoveRangeCandidate } from "@rangepilot/sdk/deepbookPredict";
import type {
  BtcMoveMintableRangeCandidate,
  BtcMoveMintableRangeAttempt,
  PrimitiveActiveMarketContext,
} from "@rangepilot/types/deepbookPredict";
import {
  attachSeriesToMoveSeriesMintabilityRecord,
  buildMoveSeriesMintabilityKey,
  clearMoveSeriesMintabilityRecord,
  recordMoveSeriesMintabilityPass,
  type MoveSeriesMintabilityRecord,
} from "../lib/moveSeriesMintability";
import { summarizeMoveAttempts, type RuntimeCandidateDiagnostic, type RuntimeMintabilitySummary } from "./mintabilityDiagnostics";
import { buildTradeRuntimeContext, type TradeRuntimeContext } from "./tradeRuntimeContext";
import { useSuiWallet } from "./useSuiWallet";

export type BtcMoveMintableRangeStatus = "idle" | "blocked" | "running" | "passed" | "failed";

export type BtcMoveMintableRangeController = {
  status: BtcMoveMintableRangeStatus;
  candidate: BtcMoveMintableRangeCandidate | null;
  validationRecord: MoveSeriesMintabilityRecord | null;
  attempts: BtcMoveMintableRangeAttempt[];
  runtimeContext: TradeRuntimeContext;
  diagnosticSummary: RuntimeMintabilitySummary | null;
  candidateDiagnostics: RuntimeCandidateDiagnostic[];
  blockers: string[];
  advancedDiagnostics: string[];
  upQuoteAtomic: string | null;
  downQuoteAtomic: string | null;
  regenerate: () => Promise<void>;
  invalidate: () => void;
  recordCreatedSeries: (seriesId: string) => void;
};

type BtcMoveMintableRangeState = Omit<BtcMoveMintableRangeController, "runtimeContext" | "regenerate" | "invalidate" | "recordCreatedSeries">;

const EMPTY_BTC_MOVE_MINTABILITY_STATE: BtcMoveMintableRangeState = {
  status: "idle",
  candidate: null,
  validationRecord: null,
  attempts: [],
  diagnosticSummary: null,
  candidateDiagnostics: [],
  blockers: [],
  advancedDiagnostics: [],
  upQuoteAtomic: null,
  downQuoteAtomic: null,
};

function collectRuntimeDiagnostics(summary: RuntimeMintabilitySummary): RuntimeCandidateDiagnostic[] {
  if (!summary.lastFailure) return summary.firstFewFailures;
  if (summary.firstFewFailures.some((diagnostic) => diagnostic.candidateLabel === summary.lastFailure?.candidateLabel && diagnostic.failureFamily === summary.lastFailure?.failureFamily)) {
    return summary.firstFewFailures;
  }

  return [...summary.firstFewFailures, summary.lastFailure];
}

export function useBtcMoveMintableRange({
  activeMarket,
  predictManagerId,
  quantity,
}: {
  activeMarket: PrimitiveActiveMarketContext | null;
  predictManagerId: string | null;
  quantity: string;
}): BtcMoveMintableRangeController {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const [state, setState] = useState<BtcMoveMintableRangeState>(EMPTY_BTC_MOVE_MINTABILITY_STATE);

  const runtimeContext = useMemo(() => buildTradeRuntimeContext({
    product: "MOVE",
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
    predictManagerId,
    activeMarket,
    quantityInput: quantity,
  }), [activeMarket, predictManagerId, quantity, wallet.address, wallet.isConnected, wallet.isTestnet]);

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

      return EMPTY_BTC_MOVE_MINTABILITY_STATE;
    });
  }, [runtimeContext.dependencyKey]);

  const invalidate = useCallback(() => {
    if (state.candidate) {
      clearMoveSeriesMintabilityRecord({
        oracleId: state.candidate.oracleId,
        expiry: state.candidate.expiry,
        lowerStrike: state.candidate.lowerStrike,
        upperStrike: state.candidate.upperStrike,
        quantity: runtimeContext.quantity ?? quantity,
        predictManagerId,
      });
    }

    setState(EMPTY_BTC_MOVE_MINTABILITY_STATE);
  }, [predictManagerId, quantity, runtimeContext.quantity, state.candidate]);

  const regenerate = useCallback(async () => {
    if (!runtimeContext.sdkInput) {
      setState({
        ...EMPTY_BTC_MOVE_MINTABILITY_STATE,
        status: "blocked",
        blockers: runtimeContext.blockers,
        advancedDiagnostics: runtimeContext.diagnostics,
      });
      return;
    }

    setState({
      ...EMPTY_BTC_MOVE_MINTABILITY_STATE,
      status: "running",
      advancedDiagnostics: runtimeContext.diagnostics,
    });

    const result = await findMintableBtcMoveRangeCandidate({
      client,
      sender: runtimeContext.sdkInput.sender,
      managerId: runtimeContext.sdkInput.managerId,
      oracleId: runtimeContext.sdkInput.oracleId,
      oracleObjectId: runtimeContext.sdkInput.oracleObjectId,
      expiry: runtimeContext.sdkInput.expiry,
      quantity: runtimeContext.sdkInput.quantity,
      underlyingAsset: runtimeContext.sdkInput.underlyingAsset,
      spot: runtimeContext.sdkInput.spot,
      forward: runtimeContext.sdkInput.forward,
      tickSize: runtimeContext.sdkInput.tickSize,
      minStrike: runtimeContext.sdkInput.minStrike,
      config: DEEPBOOK_PREDICT_TESTNET,
    });

    const diagnosticSummary = summarizeMoveAttempts(result.attempts);
    const candidateDiagnostics = collectRuntimeDiagnostics(diagnosticSummary);

    if (result.status === "found") {
      const validationInput = {
        oracleId: result.candidate.oracleId,
        expiry: result.candidate.expiry,
        lowerStrike: result.candidate.lowerStrike,
        upperStrike: result.candidate.upperStrike,
        quantity: runtimeContext.sdkInput.quantity,
        predictManagerId,
      };
      const validationRecord = recordMoveSeriesMintabilityPass(
        validationInput,
        "Mintable BTC MOVE range found. UP and DOWN legs passed quote and mint preflight.",
      );

      setState({
        status: "passed",
        candidate: result.candidate,
        validationRecord,
        attempts: result.attempts,
        diagnosticSummary,
        candidateDiagnostics,
        blockers: [],
        advancedDiagnostics: [
          ...runtimeContext.diagnostics,
          ...result.diagnostics,
          `validationKey=${buildMoveSeriesMintabilityKey(validationInput)}`,
        ],
        upQuoteAtomic: result.upQuote.mintCostAtomic,
        downQuoteAtomic: result.downQuote.mintCostAtomic,
      });
      return;
    }

    setState({
      status: "failed",
      candidate: null,
      validationRecord: null,
      attempts: result.attempts,
      diagnosticSummary,
      candidateDiagnostics,
      blockers: result.blockers.length > 0
        ? result.blockers
        : ["No mintable BTC MOVE range was found for the current market. Try refreshing the active BTC market or widening the search range."],
      advancedDiagnostics: [
        ...runtimeContext.diagnostics,
        ...result.diagnostics,
      ],
      upQuoteAtomic: null,
      downQuoteAtomic: null,
    });
  }, [client, runtimeContext, predictManagerId]);

  const recordCreatedSeries = useCallback((seriesId: string) => {
    if (!state.candidate) {
      return;
    }

    attachSeriesToMoveSeriesMintabilityRecord({
      oracleId: state.candidate.oracleId,
      expiry: state.candidate.expiry,
      lowerStrike: state.candidate.lowerStrike,
      upperStrike: state.candidate.upperStrike,
      quantity: runtimeContext.quantity ?? quantity,
      predictManagerId,
    }, seriesId);
  }, [predictManagerId, quantity, runtimeContext.quantity, state.candidate]);

  return {
    ...state,
    runtimeContext,
    blockers: [...new Set([...runtimeContext.blockers, ...state.blockers])],
    regenerate,
    invalidate,
    recordCreatedSeries,
  };
}
