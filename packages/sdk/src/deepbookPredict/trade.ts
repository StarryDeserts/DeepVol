import { Transaction } from "@mysten/sui/transactions";
import type {
  DeepBookPredictNetworkConfig,
  MintAbortCandidateParams,
  MintAbortClassification,
  MintRangePreflightResult,
  RangeMintParams,
} from "@rangepilot/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import {
  classifyDeepBookPredictAbort,
  type ClassifyDeepBookPredictAbortOptions,
  DeepBookPredictUnconfirmedBindingError,
} from "./errors.ts";
import {
  buildRangeKeyTransactionArgument,
  normalizePositiveInteger,
} from "./rangeKey.ts";

const SUI_CLOCK_OBJECT_ID = "0x6";

export type BuildMintRangeTransactionOptions = RangeMintParams & {
  config?: DeepBookPredictNetworkConfig;
  allowRealTestnetMint?: boolean;
};

export type DevInspectMintRangePreflightParams = RangeMintParams & {
  client: {
    devInspectTransactionBlock(input: {
      sender: string;
      transactionBlock: Transaction;
    }): Promise<unknown>;
  };
  sender: string;
  config?: DeepBookPredictNetworkConfig;
  candidateParams?: MintAbortCandidateParams;
};

export function buildMintRangeTransaction(
  params: BuildMintRangeTransactionOptions,
): Transaction {
  const config = resolveDeepBookPredictConfig(params.config);
  const quantity = normalizePositiveInteger(params.quantity, "Range mint quantity");

  if (!params.allowRealTestnetMint) {
    throw new DeepBookPredictUnconfirmedBindingError(
      `MUST CONFIRM BEFORE REAL MINT: ${config.packageId}::predict::mint_range<${config.quoteAssets.DUSDC.coinType}> must only be built by the gated Testnet validation flow after quote and safety gates pass.`,
    );
  }

  if (config.network !== "testnet") {
    throw new DeepBookPredictUnconfirmedBindingError(
      "Real range mint transaction building is only allowed for Sui Testnet validation.",
    );
  }

  const tx = new Transaction();
  const rangeKey = buildRangeKeyTransactionArgument(tx, params, config);

  tx.moveCall({
    target: `${config.packageId}::predict::mint_range`,
    typeArguments: [config.quoteAssets.DUSDC.coinType],
    arguments: [
      tx.object(config.predictId),
      tx.object(params.managerId),
      tx.object(params.oracleObjectId),
      rangeKey,
      tx.pure.u64(quantity),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export async function devInspectMintRangePreflight(
  params: DevInspectMintRangePreflightParams,
): Promise<MintRangePreflightResult> {
  try {
    const transactionBlock = buildMintRangeTransaction({
      ...params,
      allowRealTestnetMint: true,
    });
    const result = await params.client.devInspectTransactionBlock({
      sender: params.sender,
      transactionBlock,
    });

    if (isRecord(result) && typeof result.error === "string") {
      return {
        status: "failed",
        abort: classifyMintAbort(result.error, { candidateParams: mintAbortCandidateParams(params) }),
      };
    }

    const status = isRecord(result) && isRecord(result.effects) && isRecord(result.effects.status)
      ? result.effects.status
      : null;

    if (status?.status !== "success") {
      return {
        status: "failed",
        abort: classifyMintAbort(
          typeof status?.error === "string" ? status.error : "mint_range devInspect did not succeed.",
          { candidateParams: mintAbortCandidateParams(params) },
        ),
      };
    }

    return { status: "passed" };
  } catch (error) {
    return {
      status: "failed",
      abort: classifyMintAbort(error, { candidateParams: mintAbortCandidateParams(params) }),
    };
  }
}

export function isMintPreflightPassed(result: MintRangePreflightResult): boolean {
  return result.status === "passed";
}

export function classifyMintAbort(
  errorOrMessage: unknown,
  options?: ClassifyDeepBookPredictAbortOptions,
): MintAbortClassification {
  return classifyDeepBookPredictAbort(errorOrMessage, options);
}

function mintAbortCandidateParams(params: RangeMintParams & { candidateParams?: MintAbortCandidateParams }): MintAbortCandidateParams {
  return {
    oracleId: params.oracleId,
    oracleObjectId: params.oracleObjectId,
    expiry: String(params.expiry),
    lowerStrike: String(params.lowerStrike),
    higherStrike: String(params.higherStrike),
    quantity: String(params.quantity),
    ...params.candidateParams,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
