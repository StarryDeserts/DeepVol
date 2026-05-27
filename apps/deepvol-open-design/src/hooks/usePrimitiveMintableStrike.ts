import { useCallback, useEffect, useMemo, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { findMintableBinaryPrimitiveCandidate } from "@rangepilot/sdk/deepbookPredict";
import type {
  PrimitiveMintableStrikeCandidate,
  PrimitiveMintableStrikeAttempt,
  PrimitiveActiveMarketContext,
} from "@rangepilot/types/deepbookPredict";
import {
  buildPrimitiveMintabilityKey,
  clearPrimitiveMintabilityRecord,
  recordPrimitiveMintabilityPass,
  type PrimitiveMintabilityRecord,
} from "../lib/primitiveMintability";
import { summarizeBinaryAttempts, type RuntimeCandidateDiagnostic, type RuntimeMintabilitySummary } from "./mintabilityDiagnostics";
import { buildTradeRuntimeContext, type TradeRuntimeContext } from "./tradeRuntimeContext";
import { useSuiWallet } from "./useSuiWallet";

export type PrimitiveMintableStrikeStatus = "idle" | "blocked" | "running" | "passed" | "failed";

export type PrimitiveMintableStrikeController = {
  status: PrimitiveMintableStrikeStatus;
  candidate: PrimitiveMintableStrikeCandidate | null;
  validationRecord: PrimitiveMintabilityRecord | null;
  attempts: PrimitiveMintableStrikeAttempt[];
  runtimeContext: TradeRuntimeContext;
  diagnosticSummary: RuntimeMintabilitySummary | null;
  candidateDiagnostics: RuntimeCandidateDiagnostic[];
  blockers: string[];
  advancedDiagnostics: string[];
  quoteAtomic: string | null;
  regenerate: () => Promise<void>;
  invalidate: () => void;
};

type PrimitiveMintableStrikeState = Omit<PrimitiveMintableStrikeController, "runtimeContext" | "regenerate" | "invalidate">;

const EMPTY_PRIMITIVE_STRIKE_MINTABILITY_STATE: PrimitiveMintableStrikeState = {
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

function collectRuntimeDiagnostics(summary: RuntimeMintabilitySummary): RuntimeCandidateDiagnostic[] {
  if (!summary.lastFailure) return summary.firstFewFailures;
  if (summary.firstFewFailures.some((diagnostic) => diagnostic.candidateLabel === summary.lastFailure?.candidateLabel && diagnostic.failureFamily === summary.lastFailure?.failureFamily)) {
    return summary.firstFewFailures;
  }

  return [...summary.firstFewFailures, summary.lastFailure];
}

export function usePrimitiveMintableStrike({
  activeMarket,
  predictManagerId,
  quantity,
  primitiveKind,
}: {
  activeMarket: PrimitiveActiveMarketContext | null;
  predictManagerId: string | null;
  quantity: string;
  primitiveKind: "UP" | "DOWN";
}): PrimitiveMintableStrikeController {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const [state, setState] = useState<PrimitiveMintableStrikeState>(EMPTY_PRIMITIVE_STRIKE_MINTABILITY_STATE);

  const runtimeContext = useMemo(() => buildTradeRuntimeContext({
    product: primitiveKind,
    walletAddress: wallet.address,
    walletConnected: wallet.isConnected,
    walletTestnet: wallet.isTestnet,
    predictManagerId,
    activeMarket,
    quantityInput: quantity,
  }), [activeMarket, predictManagerId, primitiveKind, quantity, wallet.address, wallet.isConnected, wallet.isTestnet]);

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

      return EMPTY_PRIMITIVE_STRIKE_MINTABILITY_STATE;
    });
  }, [runtimeContext.dependencyKey]);

  const invalidate = useCallback(() => {
    if (state.candidate) {
      clearPrimitiveMintabilityRecord({
        oracleId: state.candidate.oracleId,
        expiry: state.candidate.expiry,
        direction: state.candidate.direction,
        strike: state.candidate.strike,
        quantity: runtimeContext.quantity ?? quantity,
        predictManagerId,
      });
    }

    setState(EMPTY_PRIMITIVE_STRIKE_MINTABILITY_STATE);
  }, [predictManagerId, quantity, runtimeContext.quantity, state.candidate]);

  const regenerate = useCallback(async () => {
    if (!runtimeContext.sdkInput) {
      setState({
        ...EMPTY_PRIMITIVE_STRIKE_MINTABILITY_STATE,
        status: "blocked",
        blockers: runtimeContext.blockers,
        advancedDiagnostics: runtimeContext.diagnostics,
      });
      return;
    }

    const direction = primitiveKind === "UP" ? "up" as const : "down" as const;

    setState({
      ...EMPTY_PRIMITIVE_STRIKE_MINTABILITY_STATE,
      status: "running",
      advancedDiagnostics: runtimeContext.diagnostics,
    });

    const result = await findMintableBinaryPrimitiveCandidate({
      client,
      sender: runtimeContext.sdkInput.sender,
      managerId: runtimeContext.sdkInput.managerId,
      oracleId: runtimeContext.sdkInput.oracleId,
      oracleObjectId: runtimeContext.sdkInput.oracleObjectId,
      expiry: runtimeContext.sdkInput.expiry,
      quantity: runtimeContext.sdkInput.quantity,
      direction,
      underlyingAsset: runtimeContext.sdkInput.underlyingAsset,
      spot: runtimeContext.sdkInput.spot,
      forward: runtimeContext.sdkInput.forward,
      tickSize: runtimeContext.sdkInput.tickSize,
      minStrike: runtimeContext.sdkInput.minStrike,
      config: DEEPBOOK_PREDICT_TESTNET,
    });

    const diagnosticSummary = summarizeBinaryAttempts(primitiveKind, result.attempts);
    const candidateDiagnostics = collectRuntimeDiagnostics(diagnosticSummary);

    if (result.status === "found") {
      const validationInput = {
        oracleId: result.candidate.oracleId,
        expiry: result.candidate.expiry,
        direction: result.candidate.direction,
        strike: result.candidate.strike,
        quantity: runtimeContext.sdkInput.quantity,
        predictManagerId,
      };
      const validationRecord = recordPrimitiveMintabilityPass(
        validationInput,
        `Mintable ${primitiveKind} strike found. Quote and mint preflight passed for this BTC market.`,
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
          `validationKey=${buildPrimitiveMintabilityKey(validationInput)}`,
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
      diagnosticSummary,
      candidateDiagnostics,
      blockers: result.blockers.length > 0
        ? result.blockers
        : [`No mintable ${primitiveKind} strike was found for the current market. Try refreshing the active BTC market.`],
      advancedDiagnostics: [
        ...runtimeContext.diagnostics,
        ...result.diagnostics,
      ],
      quoteAtomic: null,
    });
  }, [client, primitiveKind, runtimeContext, predictManagerId]);

  return {
    ...state,
    runtimeContext,
    blockers: [...new Set([...runtimeContext.blockers, ...state.blockers])],
    regenerate,
    invalidate,
  };
}
