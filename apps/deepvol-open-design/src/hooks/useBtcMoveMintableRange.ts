import { useCallback, useMemo, useState } from "react";
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
import { useSuiWallet } from "./useSuiWallet";

export type BtcMoveMintableRangeStatus = "idle" | "blocked" | "running" | "passed" | "failed";

export type BtcMoveMintableRangeController = {
  status: BtcMoveMintableRangeStatus;
  candidate: BtcMoveMintableRangeCandidate | null;
  validationRecord: MoveSeriesMintabilityRecord | null;
  attempts: BtcMoveMintableRangeAttempt[];
  blockers: string[];
  advancedDiagnostics: string[];
  upQuoteAtomic: string | null;
  downQuoteAtomic: string | null;
  regenerate: () => Promise<void>;
  invalidate: () => void;
  recordCreatedSeries: (seriesId: string) => void;
};

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
  const [state, setState] = useState<{
    status: BtcMoveMintableRangeStatus;
    candidate: BtcMoveMintableRangeCandidate | null;
    validationRecord: MoveSeriesMintabilityRecord | null;
    attempts: BtcMoveMintableRangeAttempt[];
    blockers: string[];
    advancedDiagnostics: string[];
    upQuoteAtomic: string | null;
    downQuoteAtomic: string | null;
  }>({
    status: "idle",
    candidate: null,
    validationRecord: null,
    attempts: [],
    blockers: [],
    advancedDiagnostics: [],
    upQuoteAtomic: null,
    downQuoteAtomic: null,
  });

  const prerequisiteBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (!wallet.address || !wallet.isConnected) blockers.push("Connect a Sui wallet before validating a mintable BTC MOVE range.");
    if (wallet.isConnected && !wallet.isTestnet) blockers.push("Switch to Sui Testnet before validating a mintable BTC MOVE range.");
    if (!predictManagerId) blockers.push("Create or store a PredictManager before validating a mintable BTC MOVE range.");
    if (!activeMarket) blockers.push("Discover an active BTC market first.");
    if (activeMarket && activeMarket.status !== "live") blockers.push("Active BTC market must be live before validating a mintable BTC MOVE range.");

    return blockers;
  }, [activeMarket, predictManagerId, wallet.address, wallet.isConnected, wallet.isTestnet]);

  const invalidate = useCallback(() => {
    if (state.candidate) {
      clearMoveSeriesMintabilityRecord({
        oracleId: state.candidate.oracleId,
        expiry: state.candidate.expiry,
        lowerStrike: state.candidate.lowerStrike,
        upperStrike: state.candidate.upperStrike,
        quantity,
        predictManagerId,
      });
    }

    setState({
      status: "idle",
      candidate: null,
      validationRecord: null,
      attempts: [],
      blockers: [],
      advancedDiagnostics: [],
      upQuoteAtomic: null,
      downQuoteAtomic: null,
    });
  }, [predictManagerId, quantity, state.candidate]);

  const regenerate = useCallback(async () => {
    if (prerequisiteBlockers.length > 0 || !activeMarket || !wallet.address || !predictManagerId) {
      setState((current) => ({
        ...current,
        status: "blocked",
        blockers: prerequisiteBlockers,
      }));
      return;
    }

    setState({
      status: "running",
      candidate: null,
      validationRecord: null,
      attempts: [],
      blockers: [],
      advancedDiagnostics: [],
      upQuoteAtomic: null,
      downQuoteAtomic: null,
    });

    const result = await findMintableBtcMoveRangeCandidate({
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
      const validationRecord = recordMoveSeriesMintabilityPass({
        oracleId: result.candidate.oracleId,
        expiry: result.candidate.expiry,
        lowerStrike: result.candidate.lowerStrike,
        upperStrike: result.candidate.upperStrike,
        quantity,
        predictManagerId,
      }, "Mintable BTC MOVE range found. UP and DOWN legs passed quote and mint preflight.");

      setState({
        status: "passed",
        candidate: result.candidate,
        validationRecord,
        attempts: result.attempts,
        blockers: [],
        advancedDiagnostics: [
          ...result.diagnostics,
          `validationKey=${buildMoveSeriesMintabilityKey({
            oracleId: result.candidate.oracleId,
            expiry: result.candidate.expiry,
            lowerStrike: result.candidate.lowerStrike,
            upperStrike: result.candidate.upperStrike,
            quantity,
            predictManagerId,
          })}`,
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
      blockers: result.blockers.length > 0
        ? result.blockers
        : ["No mintable BTC MOVE range was found for the current market. Try refreshing the active BTC market or widening the search range."],
      advancedDiagnostics: result.diagnostics,
      upQuoteAtomic: null,
      downQuoteAtomic: null,
    });
  }, [activeMarket, client, predictManagerId, prerequisiteBlockers, quantity, wallet.address]);

  const recordCreatedSeries = useCallback((seriesId: string) => {
    if (!state.candidate) {
      return;
    }

    attachSeriesToMoveSeriesMintabilityRecord({
      oracleId: state.candidate.oracleId,
      expiry: state.candidate.expiry,
      lowerStrike: state.candidate.lowerStrike,
      upperStrike: state.candidate.upperStrike,
      quantity,
      predictManagerId,
    }, seriesId);
  }, [predictManagerId, quantity, state.candidate]);

  return {
    ...state,
    blockers: [...new Set([...prerequisiteBlockers, ...state.blockers])],
    regenerate,
    invalidate,
    recordCreatedSeries,
  };
}
