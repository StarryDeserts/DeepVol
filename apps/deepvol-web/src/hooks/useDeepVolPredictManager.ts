import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { isValidSuiObjectId, normalizeSuiAddress } from "@mysten/sui/utils";
import type { TransactionStatus } from "@rangepilot/types/deepbookPredict";
import {
  buildCreateManagerTransaction,
  buildSuiExplorerTransactionUrl,
  findPredictManagerByOwner,
  recoverPredictManagerIdFromCreateResult,
  translateDeepBookPredictError,
} from "@rangepilot/sdk/deepbookPredict";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { useDeepVolConfig } from "./useDeepVolConfig";
import { useSuiWallet } from "./useSuiWallet";
import { DEEPVOL_STORAGE_KEYS, TESTNET_CHAIN } from "../lib/constants";

export function useDeepVolPredictManager() {
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const wallet = useSuiWallet();
  const config = useDeepVolConfig();
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>({ state: "idle" });
  const storageKey = useMemo(
    () => wallet.address ? `${DEEPVOL_STORAGE_KEYS.predictManager}:${config.network}:${wallet.address}` : null,
    [config.network, wallet.address],
  );
  const [knownManagerId, setKnownManagerId] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) {
      setKnownManagerId(null);
      return;
    }

    setKnownManagerId(window.localStorage.getItem(storageKey));
  }, [storageKey]);

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
  const managerId = validatedHintQuery.data?.valid ? validatedHintQuery.data.managerId : null;
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

  function rememberManagerId(managerId: string) {
    const trimmedManagerId = managerId.trim();

    if (!storageKey || !trimmedManagerId) {
      return;
    }

    window.localStorage.setItem(storageKey, trimmedManagerId);
    setKnownManagerId(trimmedManagerId);
    void queryClient.invalidateQueries({ queryKey: ["deepvol-predict-manager"] });
  }

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
              rememberManagerId(recovery.managerId);
            }

            setTransactionStatus({
              state: "success",
              digest: result.digest,
              explorerUrl,
              message: recovery.managerId
                ? `${recovery.message} Manager ID stored for DeepVol.`
                : `${recovery.message} Copy the manager ID from Sui Explorer and store it manually.`,
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

  return {
    managerQuery,
    validatedHintQuery,
    knownManagerId,
    managerId,
    transactionStatus,
    createManager,
    setManualManagerId: rememberManagerId,
  };
}

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

async function validatePredictManagerHint(
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

function readAddressField(value: unknown): string | null {
  if (typeof value === "string") {
    return normalizeSuiAddress(value);
  }

  if (typeof value === "object" && value !== null && "fields" in value) {
    return readAddressField((value as { fields?: unknown }).fields);
  }

  return null;
}
