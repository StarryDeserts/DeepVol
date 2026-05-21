import { Transaction } from "@mysten/sui/transactions";
import type {
  DeepBookPredictAmountLike,
  DeepBookPredictNetworkConfig,
  ManagerDiscoveryLayerResult,
  ManagerDiscoveryResult,
  PredictManagerRef,
} from "@rangepilot/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import { DeepBookPredictUnconfirmedBindingError } from "./errors.ts";
import {
  inspectDevInspectU64,
  summarizeDevInspectU64Diagnostic,
} from "./quote.ts";

export type FindPredictManagerByOwnerParams = {
  owner: string;
  knownManagerId?: string | null;
  config?: DeepBookPredictNetworkConfig;
};

export type GetManagerBalanceParams = {
  managerId: string;
  config?: DeepBookPredictNetworkConfig;
};

export type DevInspectManagerBalanceParams = GetManagerBalanceParams & {
  client: {
    devInspectTransactionBlock(input: {
      sender: string;
      transactionBlock: Transaction;
    }): Promise<unknown>;
  };
  sender: string;
};

export type ManagerBalanceResult = {
  managerId: string;
  coinType: string;
  decimals: 6;
  balanceAtomic: string;
  source: "direct_read" | "dev_inspect" | "public_server";
};

export async function findPredictManagerByOwner({
  owner,
  knownManagerId,
  config,
}: FindPredictManagerByOwnerParams): Promise<ManagerDiscoveryResult> {
  const resolvedConfig = resolveDeepBookPredictConfig(config);
  const layers: ManagerDiscoveryLayerResult[] = [];

  if (knownManagerId) {
    const manager: PredictManagerRef = {
      managerId: knownManagerId,
      owner,
      network: resolvedConfig.network,
      source: "local_storage",
    };

    layers.push({
      layer: "local_storage",
      status: "found",
      message:
        "Using locally stored manager ID as a hint; direct owner validation remains pending.",
    });

    return {
      status: "found",
      manager,
      layers,
    };
  }

  layers.push({
    layer: "local_storage",
    status: "not_found",
    message: "No local manager ID hint is stored for this wallet and network.",
  });
  layers.push({
    layer: "public_server",
    status: "unconfirmed",
    message:
      "Public server /managers owner filtering and response schema are MUST CONFIRM BEFORE CODING.",
  });
  layers.push({
    layer: "event_scan",
    status: "unconfirmed",
    message:
      "PredictManagerCreated event fields and event-scan query are MUST CONFIRM BEFORE CODING.",
  });

  return {
    status: "unconfirmed",
    owner,
    network: resolvedConfig.network,
    reason:
      "Manager discovery beyond a local hint is not confirmed. UI may offer create_manager but must not claim discovery is complete.",
    layers,
  };
}

export async function getManagerBalance(
  params: GetManagerBalanceParams,
): Promise<ManagerBalanceResult> {
  const config = resolveDeepBookPredictConfig(params.config);

  throw new DeepBookPredictUnconfirmedBindingError(
    `MUST CONFIRM BEFORE CODING: predict_manager::balance<DUSDC> read strategy for manager ${params.managerId} requires a browser client and sender. Use devInspectManagerBalance with coin type ${config.quoteAssets.DUSDC.coinType}.`,
  );
}

export function buildManagerBalanceTransaction(
  params: GetManagerBalanceParams,
): Transaction {
  const config = resolveDeepBookPredictConfig(params.config);
  const tx = new Transaction();

  tx.moveCall({
    target: `${config.packageId}::predict_manager::balance`,
    typeArguments: [config.quoteAssets.DUSDC.coinType],
    arguments: [tx.object(params.managerId)],
  });

  return tx;
}

export async function devInspectManagerBalance(
  params: DevInspectManagerBalanceParams,
): Promise<ManagerBalanceResult> {
  const config = resolveDeepBookPredictConfig(params.config);
  const result = await params.client.devInspectTransactionBlock({
    sender: params.sender,
    transactionBlock: buildManagerBalanceTransaction(params),
  });

  const error = readDevInspectError(result);

  if (error) {
    throw new DeepBookPredictUnconfirmedBindingError(
      `predict_manager::balance<DUSDC> devInspect failed: ${error}`,
    );
  }

  const diagnostic = inspectDevInspectU64(result);

  if (!diagnostic.decoded) {
    throw new DeepBookPredictUnconfirmedBindingError(
      `predict_manager::balance<DUSDC> devInspect return shape did not decode to one u64. ${summarizeDevInspectU64Diagnostic(diagnostic)}`,
    );
  }

  return {
    managerId: params.managerId,
    coinType: config.quoteAssets.DUSDC.coinType,
    decimals: config.quoteAssets.DUSDC.decimals,
    balanceAtomic: diagnostic.decoded,
    source: "dev_inspect",
  };
}

export function createManualPredictManagerRef(
  managerId: string,
  owner: string,
  config?: DeepBookPredictNetworkConfig,
): PredictManagerRef {
  const resolvedConfig = resolveDeepBookPredictConfig(config);

  return {
    managerId,
    owner,
    network: resolvedConfig.network,
    source: "manual",
  };
}

export function normalizeManagerDepositAmount(
  amountAtomic: DeepBookPredictAmountLike,
): string {
  const amount = BigInt(amountAtomic);

  if (amount <= 0n) {
    throw new DeepBookPredictUnconfirmedBindingError(
      "Deposit amount must be greater than 0 atomic units.",
    );
  }

  return amount.toString();
}

function readDevInspectError(result: unknown): string | null {
  if (!isRecord(result)) {
    return null;
  }

  if (typeof result.error === "string") {
    return result.error;
  }

  const status = isRecord(result.effects) && isRecord(result.effects.status)
    ? result.effects.status
    : null;

  if (status?.status === "success") {
    return null;
  }

  return typeof status?.error === "string" ? status.error : "devInspect did not return success.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
