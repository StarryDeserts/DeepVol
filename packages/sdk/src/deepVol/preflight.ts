import type { Transaction } from "@mysten/sui/transactions";
import type {
  DeepBookPredictNetworkConfig,
} from "@rangepilot/types/deepbookPredict";
import type {
  BuyMoveReceiptParams,
  DeepVolBuyReceiptPreflightResult,
  DeepVolTestnetConfig,
} from "@rangepilot/types/deepVol";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { devInspectManagerBalance } from "../deepbookPredict/manager.ts";
import { DeepBookPredictUnconfirmedBindingError } from "../deepbookPredict/errors.ts";
import {
  buildBuyMoveReceiptTransaction,
  type DeepVolPackageOptions,
} from "./transactions.ts";

export type DevInspectBuyMoveReceiptPreflightParams = BuyMoveReceiptParams & DeepVolPackageOptions & {
  client: {
    devInspectTransactionBlock(input: {
      sender: string;
      transactionBlock: Transaction;
    }): Promise<unknown>;
    dryRunTransactionBlock?: unknown;
  };
  sender: string;
  expectedPremiumAtomic: string;
  feeAmountAtomic: string;
  predictConfig?: DeepBookPredictNetworkConfig;
  config?: DeepVolTestnetConfig;
  runDryRun?: boolean;
};

export async function devInspectBuyMoveReceiptPreflight(
  params: DevInspectBuyMoveReceiptPreflightParams,
): Promise<DeepVolBuyReceiptPreflightResult> {
  const diagnostics: string[] = [];
  const baseResult = {
    managerBalanceAtomic: null,
    expectedPremiumAtomic: params.expectedPremiumAtomic,
    feeCoinId: params.feeCoinId,
    feeAmountAtomic: params.feeAmountAtomic,
    dryRunError: null,
    diagnostics,
  };

  let managerBalanceAtomic: string;

  try {
    const managerBalance = await devInspectManagerBalance({
      client: params.client,
      sender: params.sender,
      managerId: params.predictManagerId,
      config: params.predictConfig ?? DEEPBOOK_PREDICT_TESTNET,
    });
    managerBalanceAtomic = managerBalance.balanceAtomic;
    diagnostics.push(`PredictManager DUSDC balance: ${managerBalanceAtomic}.`);
  } catch (error) {
    return {
      ...baseResult,
      passed: false,
      devInspectError: `PredictManager DUSDC balance read blocked: ${formatError(error)}`,
    };
  }

  if (BigInt(managerBalanceAtomic) < BigInt(params.expectedPremiumAtomic)) {
    return {
      ...baseResult,
      passed: false,
      managerBalanceAtomic,
      devInspectError: `Deposit DUSDC to PredictManager before buying BTC MOVE. PredictManager DUSDC balance ${managerBalanceAtomic} is below expected premium ${params.expectedPremiumAtomic}.`,
    };
  }

  const feeCoinBalance = BigInt(params.feeAmountAtomic);

  if (feeCoinBalance < 0n) {
    return {
      ...baseResult,
      passed: false,
      managerBalanceAtomic,
      devInspectError: "Create Fee amount must not be negative.",
    };
  }

  let transactionBlock: Transaction;

  try {
    transactionBlock = buildBuyMoveReceiptTransaction({
      ...params,
      requireFreshBinaryQuotePassed: true,
      requireCreateFeeCoinPrepared: true,
      allowBrowserPreflightBuild: true,
    });
    transactionBlock.setSender(params.sender);
    transactionBlock.setGasBudget(200_000_000);
  } catch (error) {
    return {
      ...baseResult,
      passed: false,
      managerBalanceAtomic,
      devInspectError: formatError(error),
    };
  }

  try {
    const devInspect = await params.client.devInspectTransactionBlock({
      sender: params.sender,
      transactionBlock,
    });
    const devInspectError = readExecutionError(devInspect);

    if (devInspectError) {
      return {
        ...baseResult,
        passed: false,
        managerBalanceAtomic,
        devInspectError,
      };
    }

    diagnostics.push("buy_move_receipt<DUSDC> devInspect succeeded.");
  } catch (error) {
    return {
      ...baseResult,
      passed: false,
      managerBalanceAtomic,
      devInspectError: formatError(error),
    };
  }

  if (params.runDryRun && typeof params.client.dryRunTransactionBlock === "function") {
    try {
      const dryRun = await params.client.dryRunTransactionBlock({ transactionBlock });
      const dryRunError = readExecutionError(dryRun);

      if (dryRunError) {
        return {
          ...baseResult,
          passed: false,
          managerBalanceAtomic,
          devInspectError: null,
          dryRunError,
        };
      }

      diagnostics.push("buy_move_receipt<DUSDC> dry-run succeeded.");
    } catch (error) {
      return {
        ...baseResult,
        passed: false,
        managerBalanceAtomic,
        devInspectError: null,
        dryRunError: formatError(error),
      };
    }
  }

  return {
    ...baseResult,
    passed: true,
    managerBalanceAtomic,
    devInspectError: null,
  };
}

export function isBuyMoveReceiptPreflightPassed(
  result: DeepVolBuyReceiptPreflightResult,
): boolean {
  return result.passed;
}

function readExecutionError(result: unknown): string | null {
  if (!isRecord(result)) {
    return "Sui preflight did not return an object response.";
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

  return typeof status?.error === "string" ? status.error : "Sui preflight did not return success.";
}

function formatError(error: unknown): string {
  if (error instanceof DeepBookPredictUnconfirmedBindingError) {
    return error.message;
  }

  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
