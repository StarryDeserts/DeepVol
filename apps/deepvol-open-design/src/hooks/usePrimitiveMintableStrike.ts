import { useCallback, useMemo, useState } from "react";
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
import { useSuiWallet } from "./useSuiWallet";

export type PrimitiveMintableStrikeStatus = "idle" | "blocked" | "running" | "passed" | "failed";

export type PrimitiveMintableStrikeController = {
  status: PrimitiveMintableStrikeStatus;
  candidate: PrimitiveMintableStrikeCandidate | null;
  validationRecord: PrimitiveMintabilityRecord | null;
  attempts: PrimitiveMintableStrikeAttempt[];
  blockers: string[];
  advancedDiagnostics: string[];
  quoteAtomic: string | null;
  regenerate: () => Promise<void>;
  invalidate: () => void;
};

export function usePrimitiveMintableStrike({
  activeMarket,
  predictManagerId,
  quantity,
  primitiveKind,
}: {
  activeMarket: PrimitiveActiveMarketContext | null;
  predictManagerId: string | null;
  quantity: string;
  primitiveKind: "UP" | "DOWN" | "RANGE";
}): PrimitiveMintableStrikeController {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const [state, setState] = useState<{
    status: PrimitiveMintableStrikeStatus;
    candidate: PrimitiveMintableStrikeCandidate | null;
    validationRecord: PrimitiveMintabilityRecord | null;
    attempts: PrimitiveMintableStrikeAttempt[];
    blockers: string[];
    advancedDiagnostics: string[];
    quoteAtomic: string | null;
  }>({
    status: "idle",
    candidate: null,
    validationRecord: null,
    attempts: [],
    blockers: [],
    advancedDiagnostics: [],
    quoteAtomic: null,
  });

  const prerequisiteBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (!wallet.address || !wallet.isConnected) blockers.push("Connect a Sui wallet before validating a mintable primitive strike.");
    if (wallet.isConnected && !wallet.isTestnet) blockers.push("Switch to Sui Testnet before validating a mintable primitive strike.");
    if (!predictManagerId) blockers.push("Create or store a PredictManager before validating a mintable primitive strike.");
    if (!activeMarket) blockers.push("Discover an active BTC market first.");
    if (activeMarket && activeMarket.status !== "live") blockers.push("Active BTC market must be live before validating a mintable primitive strike.");

    return blockers;
  }, [activeMarket, predictManagerId, wallet.address, wallet.isConnected, wallet.isTestnet, primitiveKind]);

  const invalidate = useCallback(() => {
    if (state.candidate) {
      clearPrimitiveMintabilityRecord({
        oracleId: state.candidate.oracleId,
        expiry: state.candidate.expiry,
        direction: state.candidate.direction,
        strike: state.candidate.strike,
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
      quoteAtomic: null,
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

    const direction = primitiveKind === "UP" ? "up" as const : "down" as const;

    setState({
      status: "running",
      candidate: null,
      validationRecord: null,
      attempts: [],
      blockers: [],
      advancedDiagnostics: [],
      quoteAtomic: null,
    });

    const result = await findMintableBinaryPrimitiveCandidate({
      client,
      sender: wallet.address,
      managerId: predictManagerId,
      oracleId: activeMarket.oracleId,
      oracleObjectId: activeMarket.oracleObjectId,
      expiry: activeMarket.expiry,
      quantity,
      direction,
      underlyingAsset: activeMarket.underlyingAsset,
      spot: activeMarket.spot,
      forward: activeMarket.forward,
      tickSize: activeMarket.tickSize,
      minStrike: activeMarket.minStrike,
      config: DEEPBOOK_PREDICT_TESTNET,
    });

    if (result.status === "found") {
      const validationRecord = recordPrimitiveMintabilityPass({
        oracleId: result.candidate.oracleId,
        expiry: result.candidate.expiry,
        direction: result.candidate.direction,
        strike: result.candidate.strike,
        quantity,
        predictManagerId,
      }, `Mintable ${primitiveKind} strike found. Quote and mint preflight passed for this BTC market.`);

      setState({
        status: "passed",
        candidate: result.candidate,
        validationRecord,
        attempts: result.attempts,
        blockers: [],
        advancedDiagnostics: [
          ...result.diagnostics,
          `validationKey=${buildPrimitiveMintabilityKey({
            oracleId: result.candidate.oracleId,
            expiry: result.candidate.expiry,
            direction: result.candidate.direction,
            strike: result.candidate.strike,
            quantity,
            predictManagerId,
          })}`,
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
      blockers: result.blockers.length > 0
        ? result.blockers
        : [`No mintable ${primitiveKind} strike was found for the current market. Try refreshing the active BTC market.`],
      advancedDiagnostics: result.diagnostics,
      quoteAtomic: null,
    });
  }, [activeMarket, client, predictManagerId, prerequisiteBlockers, primitiveKind, quantity, wallet.address]);

  return {
    ...state,
    blockers: [...new Set([...prerequisiteBlockers, ...state.blockers])],
    regenerate,
    invalidate,
  };
}
