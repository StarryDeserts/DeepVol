import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { isValidSuiObjectId, normalizeSuiAddress } from "@mysten/sui/utils";
import type { ManagerDiscoveryResult, TransactionStatus } from "@rangepilot/types/deepbookPredict";
import {
  buildCreateManagerTransaction,
  buildSuiExplorerTransactionUrl,
  devInspectManagerBalance,
  findPredictManagerByOwner,
  recoverPredictManagerIdFromCreateResult,
  translateDeepBookPredictError,
} from "@rangepilot/sdk/deepbookPredict";
import type { ManagerBalanceResult } from "@rangepilot/sdk/deepbookPredict";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { useDeepVolConfig } from "./useDeepVolConfig";
import { useSuiWallet } from "./useSuiWallet";
import { DEEPVOL_STORAGE_KEYS, TESTNET_CHAIN } from "../lib/constants";
import { recoverPredictManagerIdFromPrimitiveRecords } from "../lib/deepVolPrimitiveStorage";
import {
  clearStoredPredictManagerSession,
  readStoredPredictManagerSession,
  type PredictManagerStorageSource,
  type StoredPredictManagerSession,
  writeStoredPredictManagerSession,
} from "../lib/predictManagerStorage";

export type PredictManagerSessionStatus =
  | "idle"
  | "wallet_required"
  | "wrong_network"
  | "loading"
  | "missing"
  | "ready"
  | "invalid"
  | "error";

export type PredictManagerSession = {
  status: PredictManagerSessionStatus;
  predictManagerId: string | null;
  knownManagerId: string | null;
  source: PredictManagerStorageSource | null;
  balance: string | null;
  blockers: string[];
  validationMessage: string | null;
  discoveryMessage: string | null;
  transactionStatus: TransactionStatus;
  isCreating: boolean;
  canCreate: boolean;
  createManager: () => void;
  refresh: () => void;
  clear: () => void;
  setManualManager: (managerId: string) => void;
  managerQuery: UseQueryResult<ManagerDiscoveryResult, Error>;
  validatedHintQuery: UseQueryResult<ValidatedPredictManagerHint, Error>;
  balanceQuery: UseQueryResult<ManagerBalanceResult, Error>;
};

type ValidatedPredictManagerHint =
  | {
      valid: true;
      managerId: string;
      message: string;
    }
  | {
      valid: false;
      message: string;
    };

type ParsedMoveObject = {
  data?: {
    content?: {
      type?: string;
      fields?: Record<string, unknown>;
    };
  };
};

export function usePredictManagerSession(): PredictManagerSession {
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const wallet = useSuiWallet();
  const config = useDeepVolConfig();
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({ state: "idle" });
  const [storedSession, setStoredSession] = useState<StoredPredictManagerSession | null>(null);
  const [localRecordManagerId, setLocalRecordManagerId] = useState<string | null>(null);

  const candidate = useMemo(() => {
    if (storedSession?.predictManagerId) {
      return {
        managerId: storedSession.predictManagerId,
        source: storedSession.source,
      };
    }

    if (localRecordManagerId) {
      return {
        managerId: localRecordManagerId,
        source: "local_record" as const,
      };
    }

    return null;
  }, [localRecordManagerId, storedSession]);
  const knownManagerId = candidate?.managerId ?? null;

  useEffect(() => {
    if (!wallet.address) {
      setStoredSession(null);
      setLocalRecordManagerId(null);
      return;
    }

    const stored = readStoredPredictManagerSession(config.network, wallet.address);
    setStoredSession(stored);
    setLocalRecordManagerId(stored ? null : recoverPredictManagerIdFromPrimitiveRecords(DEEPVOL_STORAGE_KEYS, wallet.address));
  }, [config.network, wallet.address]);

  const managerQuery = useQuery({
    queryKey: ["deepvol-predict-manager", wallet.address, wallet.isTestnet, knownManagerId],
    queryFn: () =>
      findPredictManagerByOwner({
        owner: wallet.address!,
        knownManagerId,
        config: DEEPBOOK_PREDICT_TESTNET,
      }),
    enabled: Boolean(wallet.address && wallet.isTestnet),
  });
  const validatedHintQuery = useQuery({
    queryKey: ["deepvol-predict-manager-validation", wallet.address, wallet.isTestnet, knownManagerId],
    queryFn: () => validatePredictManagerHint(client, knownManagerId!, wallet.address!),
    enabled: Boolean(wallet.address && wallet.isTestnet && knownManagerId),
  });
  const predictManagerId = validatedHintQuery.data?.valid ? validatedHintQuery.data.managerId : null;
  const balanceQuery = useQuery({
    queryKey: ["deepvol-predict-manager-balance", wallet.address, wallet.isTestnet, predictManagerId],
    queryFn: () =>
      devInspectManagerBalance({
        client,
        sender: wallet.address!,
        managerId: predictManagerId!,
        config: DEEPBOOK_PREDICT_TESTNET,
      }),
    enabled: Boolean(wallet.address && wallet.isTestnet && predictManagerId),
    staleTime: 10_000,
  });
  const signAndExecuteTransaction = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEvents: true,
          showEffects: true,
          showObjectChanges: true,
          showRawEffects: true,
        },
      }),
  });

  const persistSession = useCallback((record: StoredPredictManagerSession) => {
    writeStoredPredictManagerSession(config.network, record);
    setStoredSession(record);
    setLocalRecordManagerId(null);
    void queryClient.invalidateQueries({ queryKey: ["deepvol-predict-manager"] });
    void queryClient.invalidateQueries({ queryKey: ["deepvol-predict-manager-validation"] });
    void queryClient.invalidateQueries({ queryKey: ["deepvol-predict-manager-balance"] });
  }, [config.network, queryClient]);

  useEffect(() => {
    if (!wallet.address || storedSession || candidate?.source !== "local_record" || !validatedHintQuery.data?.valid) {
      return;
    }

    persistSession({
      walletAddress: wallet.address,
      predictManagerId: validatedHintQuery.data.managerId,
      source: "local_record",
      updatedAt: Date.now(),
    });
  }, [candidate?.source, persistSession, storedSession, validatedHintQuery.data, wallet.address]);

  const refresh = useCallback(() => {
    if (!wallet.address) {
      return;
    }

    const stored = readStoredPredictManagerSession(config.network, wallet.address);
    setStoredSession(stored);
    setLocalRecordManagerId(stored ? null : recoverPredictManagerIdFromPrimitiveRecords(DEEPVOL_STORAGE_KEYS, wallet.address));
    void queryClient.invalidateQueries({ queryKey: ["deepvol-predict-manager"] });
    void queryClient.invalidateQueries({ queryKey: ["deepvol-predict-manager-validation"] });
    void queryClient.invalidateQueries({ queryKey: ["deepvol-predict-manager-balance"] });
  }, [config.network, queryClient, wallet.address]);

  const clear = useCallback(() => {
    if (!wallet.address) {
      return;
    }

    clearStoredPredictManagerSession(config.network, wallet.address);
    setStoredSession(null);
    setLocalRecordManagerId(null);
    void queryClient.invalidateQueries({ queryKey: ["deepvol-predict-manager"] });
    void queryClient.invalidateQueries({ queryKey: ["deepvol-predict-manager-validation"] });
    void queryClient.invalidateQueries({ queryKey: ["deepvol-predict-manager-balance"] });
  }, [config.network, queryClient, wallet.address]);

  const setManualManager = useCallback((managerId: string) => {
    const trimmedManagerId = managerId.trim();

    if (!wallet.address || !trimmedManagerId) {
      return;
    }

    persistSession({
      walletAddress: wallet.address,
      predictManagerId: trimmedManagerId,
      source: "manual",
      updatedAt: Date.now(),
    });
  }, [persistSession, wallet.address]);

  function createManager() {
    if (!wallet.address || !wallet.isConnected || !wallet.isTestnet) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: "Connect a Sui Testnet wallet before creating a PredictManager.",
      });
      return;
    }

    setTransactionStatus({
      state: "awaiting_wallet",
      message: "Confirm create_manager in your Sui Testnet wallet.",
    });

    try {
      const transaction = buildCreateManagerTransaction({ config: DEEPBOOK_PREDICT_TESTNET });

      signAndExecuteTransaction.mutate(
        {
          transaction,
          chain: TESTNET_CHAIN,
        },
        {
          onSuccess: (result) => {
            const recovery = recoverPredictManagerIdFromCreateResult(result, DEEPBOOK_PREDICT_TESTNET);
            const explorerUrl = buildSuiExplorerTransactionUrl(result.digest);

            if (recovery.managerId) {
              persistSession({
                walletAddress: wallet.address!,
                predictManagerId: recovery.managerId,
                createdDigest: result.digest,
                source: "created",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }

            setTransactionStatus({
              state: "success",
              digest: result.digest,
              explorerUrl,
              message: recovery.managerId
                ? `${recovery.message} Manager ID stored for DeepVol.`
                : `${recovery.message} Copy the manager ID from Sui Explorer and store it manually from Advanced / Developer settings.`,
            });
          },
          onError: (error) => {
            setTransactionStatus({
              state: "failed",
              error: translateDeepBookPredictError(error),
            });
          },
        },
      );
    } catch (error) {
      setTransactionStatus({
        state: "blocked_unconfirmed",
        error: translateDeepBookPredictError(error),
      });
    }
  }

  const status = getPredictManagerSessionStatus({
    walletConnected: wallet.isConnected,
    walletAddress: wallet.address,
    walletTestnet: wallet.isTestnet,
    knownManagerId,
    validationLoading: validatedHintQuery.isLoading,
    validationError: validatedHintQuery.isError,
    validationResult: validatedHintQuery.data,
  });
  const validationMessage = validatedHintQuery.isLoading
    ? "Checking PredictManager object type and owner on Sui Testnet."
    : validatedHintQuery.data?.message ?? null;
  const discoveryMessage = managerQuery.data?.status === "found"
    ? "Using a locally stored manager hint; deposits and quotes unlock only after validation."
    : managerQuery.data?.status === "unconfirmed"
      ? managerQuery.data.reason
      : managerQuery.data?.status === "error"
        ? managerQuery.data.error
        : null;

  return {
    status,
    predictManagerId,
    knownManagerId,
    source: candidate?.source ?? null,
    balance: balanceQuery.data?.balanceAtomic ?? null,
    blockers: buildSessionBlockers(status, balanceQuery.error),
    validationMessage,
    discoveryMessage,
    transactionStatus,
    isCreating: signAndExecuteTransaction.isPending,
    canCreate: Boolean(wallet.address && wallet.isConnected && wallet.isTestnet),
    createManager,
    refresh,
    clear,
    setManualManager,
    managerQuery,
    validatedHintQuery,
    balanceQuery,
  };
}

export async function validatePredictManagerHint(
  client: {
    getObject(input: {
      id: string;
      options?: { showContent?: boolean; showOwner?: boolean };
    }): Promise<unknown>;
  },
  managerId: string,
  owner: string,
): Promise<ValidatedPredictManagerHint> {
  const trimmedManagerId = managerId.trim();

  if (!isValidSuiObjectId(trimmedManagerId)) {
    return {
      valid: false,
      message: "Stored PredictManager hint is not a valid Sui object ID.",
    };
  }

  const response = await client.getObject({
    id: trimmedManagerId,
    options: { showContent: true, showOwner: true },
  });
  const data = (response as ParsedMoveObject).data;
  const objectType = data?.content?.type;

  if (objectType !== `${DEEPBOOK_PREDICT_TESTNET.packageId}::predict_manager::PredictManager`) {
    return {
      valid: false,
      message: "Stored manager hint is not a DeepBook PredictManager object on Sui Testnet.",
    };
  }

  if (readAddressField(data?.content?.fields?.owner) !== normalizeSuiAddress(owner)) {
    return {
      valid: false,
      message: "Stored PredictManager hint internal owner does not match the connected wallet.",
    };
  }

  return {
    valid: true,
    managerId: trimmedManagerId,
    message: "PredictManager object exists on Testnet and is owned by the connected wallet.",
  };
}

function getPredictManagerSessionStatus({
  walletConnected,
  walletAddress,
  walletTestnet,
  knownManagerId,
  validationLoading,
  validationError,
  validationResult,
}: {
  walletConnected: boolean;
  walletAddress: string | null;
  walletTestnet: boolean;
  knownManagerId: string | null;
  validationLoading: boolean;
  validationError: boolean;
  validationResult: ValidatedPredictManagerHint | undefined;
}): PredictManagerSessionStatus {
  if (!walletConnected || !walletAddress) {
    return "wallet_required";
  }

  if (!walletTestnet) {
    return "wrong_network";
  }

  if (!knownManagerId) {
    return "missing";
  }

  if (validationLoading) {
    return "loading";
  }

  if (validationError) {
    return "error";
  }

  if (validationResult?.valid) {
    return "ready";
  }

  return "invalid";
}

function buildSessionBlockers(status: PredictManagerSessionStatus, balanceError: unknown): string[] {
  const blockers: string[] = [];

  if (status === "wallet_required") {
    blockers.push("Connect a Sui Testnet wallet before using DeepVol Predict actions.");
  } else if (status === "wrong_network") {
    blockers.push("Switch the connected wallet to Sui Testnet before using DeepVol Predict actions.");
  } else if (status === "missing") {
    blockers.push("Create a PredictManager before quoting, preflight, or trading.");
  } else if (status === "loading") {
    blockers.push("PredictManager validation is still loading.");
  } else if (status === "invalid") {
    blockers.push("Stored PredictManager is invalid for the connected Testnet wallet.");
  } else if (status === "error") {
    blockers.push("PredictManager validation failed. Refresh or clear the stored manager.");
  }

  if (balanceError) {
    blockers.push("PredictManager DUSDC balance readback failed; funding-dependent actions may stay blocked.");
  }

  return blockers;
}

function readAddressField(value: unknown): string | null {
  if (typeof value === "string") {
    return normalizeSuiAddress(value);
  }

  if (typeof value === "object" && value !== null && "fields" in value) {
    return readAddressField((value as { fields?: unknown }).fields);
  }

  return null;
}
