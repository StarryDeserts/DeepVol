import { useCallback, useMemo, useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { buildCreateVolSeriesTransaction } from "@rangepilot/sdk/deepVol";
import { DEEPVOL_TESTNET } from "@rangepilot/config/deepVolTestnet";
import type { PrimitiveActiveMarketContext } from "@rangepilot/types/deepbookPredict";
import { buildSuiExplorerTransactionUrl } from "@rangepilot/sdk/deepbookPredict";
import { useSuiWallet } from "./useSuiWallet";
import { DEEPVOL_STORAGE_KEYS, TESTNET_CHAIN } from "../lib/constants";

export type CreateVolSeriesStatus = "idle" | "building" | "signing" | "confirmed" | "error";

export type CreateVolSeriesMintabilityValidation = {
  status: "passed" | "idle" | "blocked" | "running" | "failed";
  lowerStrike: string | null;
  upperStrike: string | null;
  recordCreatedSeries: (seriesId: string) => void;
};

export type CreateVolSeriesController = {
  status: CreateVolSeriesStatus;
  canCreate: boolean;
  blockers: string[];
  digest: string | null;
  explorerUrl: string | null;
  createdSeriesId: string | null;
  error: string | null;
  create: (params: {
    lowerStrike: string;
    upperStrike: string;
    metadataUri?: string;
    createFeeBps?: number;
  }) => void;
};

export function useCreateVolSeries(
  activeMarket: PrimitiveActiveMarketContext | null,
  mintabilityValidation: CreateVolSeriesMintabilityValidation | null = null,
): CreateVolSeriesController {
  const wallet = useSuiWallet();
  const client = useSuiClient();
  const [status, setStatus] = useState<CreateVolSeriesStatus>("idle");
  const [digest, setDigest] = useState<string | null>(null);
  const [createdSeriesId, setCreatedSeriesId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signAndExecuteTransaction = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEvents: true,
          showEffects: true,
          showObjectChanges: true,
        },
      }),
  });

  const blockers = useMemo(() => {
    const result: string[] = [];

    if (!wallet.isConnected) result.push("Connect a Sui wallet.");
    if (wallet.isConnected && !wallet.isTestnet) result.push("Switch to Sui Testnet.");
    if (!activeMarket) result.push("Discover an active BTC market first.");
    if (activeMarket && activeMarket.status !== "live") result.push("Active BTC market must be live.");
    if (!DEEPVOL_TESTNET.packageId) result.push("DeepVol package ID is not configured.");
    if (mintabilityValidation?.status !== "passed") result.push("Validate a mintable BTC MOVE range before creating a VolSeries.");
    if (status === "building" || status === "signing") result.push("Transaction in progress.");

    return result;
  }, [wallet.isConnected, wallet.isTestnet, activeMarket, mintabilityValidation?.status, status]);

  const canCreate = blockers.length === 0;

  const create = useCallback(
    (params: {
      lowerStrike: string;
      upperStrike: string;
      metadataUri?: string;
      createFeeBps?: number;
    }) => {
      if (!canCreate || !activeMarket || !DEEPVOL_TESTNET.packageId) return;

      const lower = BigInt(params.lowerStrike);
      const upper = BigInt(params.upperStrike);

      if (lower >= upper) {
        setError("Lower strike must be less than upper strike.");
        setStatus("error");
        return;
      }

      if (
        mintabilityValidation?.status !== "passed" ||
        mintabilityValidation.lowerStrike !== params.lowerStrike ||
        mintabilityValidation.upperStrike !== params.upperStrike
      ) {
        setError("Validate a mintable BTC MOVE range before creating a VolSeries.");
        setStatus("error");
        return;
      }

      setStatus("building");
      setError(null);
      setDigest(null);
      setCreatedSeriesId(null);

      const tx = buildCreateVolSeriesTransaction({
        oracleId: activeMarket.oracleId,
        expiry: activeMarket.expiry,
        lowerStrike: params.lowerStrike,
        upperStrike: params.upperStrike,
        metadataUri:
          params.metadataUri ??
          `btc-move:${activeMarket.oracleId.slice(0, 16)}:${activeMarket.expiry}`,
        createFeeBps: params.createFeeBps,
      });

      setStatus("signing");

      signAndExecuteTransaction.mutate(
        { transaction: tx, chain: TESTNET_CHAIN },
        {
          onSuccess: (result) => {
            setDigest(result.digest);
            const created = (result.objectChanges as { type?: string; objectType?: string; objectId?: string }[] | undefined)?.find(
              (change) => change.type === "created" && change.objectType?.includes("::series::VolSeries"),
            );
            const newSeriesId = created?.objectId ?? null;
            setCreatedSeriesId(newSeriesId);

            if (newSeriesId) {
              try {
                localStorage.setItem(
                  DEEPVOL_STORAGE_KEYS.createdSeries,
                  JSON.stringify({ seriesId: newSeriesId }),
                );
              } catch {
                // localStorage may be unavailable
              }

              mintabilityValidation.recordCreatedSeries(newSeriesId);
            }

            setStatus("confirmed");
          },
          onError: (err) => {
            setError(err instanceof Error ? err.message : String(err));
            setStatus("error");
          },
        },
      );
    },
    [canCreate, activeMarket, mintabilityValidation, signAndExecuteTransaction],
  );

  const explorerUrl = digest ? buildSuiExplorerTransactionUrl(digest, "testnet") : null;

  return { status, canCreate, blockers, digest, explorerUrl, createdSeriesId, error, create };
}
