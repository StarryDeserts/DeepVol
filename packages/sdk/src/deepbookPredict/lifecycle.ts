import type {
  DeepBookPredictManagerSummary,
  DeepBookPredictNetworkConfig,
  DeepBookPredictObjectId,
  DeepBookPredictOracleRecord,
  DeepBookPredictOracleState,
  ManagerRangePositionResult,
  MintAbortClassification,
  MintRangePreflightResult,
  OnchainAskBoundsResult,
  RangeKeyInput,
  RangeQuoteAttempt,
  RangeQuoteAttemptSuccess,
  RangeQuoteCandidate,
  RangeQuotePreview,
  RedeemRangePreflightResult,
} from "@deepvol/types/deepbookPredict";
import { resolveDeepBookPredictConfig } from "./config.ts";
import { translateDeepBookPredictError } from "./errors.ts";
import {
  deriveSourceInformedRangeCandidates,
  devInspectAskBounds,
  devInspectRangeQuote,
  rangeCandidateFamilyPriority,
  rangeCandidateKey,
  rangeQuoteAttemptKey,
  rankRangeCandidates,
  RANGE_QUOTE_QUANTITY_SWEEP,
  scanRangeQuoteQuantities,
} from "./quote.ts";
import { normalizePositiveInteger, normalizeRangeKeyInput } from "./rangeKey.ts";
import { readRangePositionQuantity } from "./portfolio.ts";
import { createDeepBookPredictServerClient, type DeepBookPredictServerClient } from "./server.ts";
import {
  devInspectMintRangePreflight,
  devInspectRedeemRangePreflight,
  isMintPreflightPassed,
  isRedeemPreflightPassed,
} from "./trade.ts";

export type DeepBookPredictLifecycleClient = {
  devInspectTransactionBlock(input: {
    sender: string;
    transactionBlock: unknown;
  }): Promise<unknown>;
};

export type GuidedLifecycleBlocker = {
  code: string;
  message: string;
};

export type ActiveRangeOracleContext = {
  oracleId: DeepBookPredictObjectId;
  oracleObjectId: DeepBookPredictObjectId;
  underlyingAsset: string | null;
  status: string;
  expiry: string;
  minStrike: string | null;
  tickSize: string | null;
  spot: string | null;
  forward: string | null;
  publicAskBounds: unknown | null;
  onchainAskBounds: OnchainAskBoundsResult | null;
  candidates: RangeQuoteCandidate[];
  warnings: string[];
  blockers: GuidedLifecycleBlocker[];
};

export type LoadActiveRangeOracleContextsParams = {
  server?: DeepBookPredictServerClient;
  client: DeepBookPredictLifecycleClient;
  sender: string;
  config?: DeepBookPredictNetworkConfig;
  underlyingAsset?: string;
  nowMs?: number;
  maxOracles?: number;
};

export type MintableRangeCandidate = RangeQuoteAttemptSuccess & {
  preflight: MintRangePreflightResult;
};

export type ScanProgressStage =
  | "idle"
  | "loading_oracles"
  | "deriving_candidates"
  | "quoting"
  | "preflighting"
  | "success"
  | "no_candidate"
  | "cancelled"
  | "error";

export type MintableRangeScanProgress = {
  stage: ScanProgressStage;
  oracleIndex: number;
  oracleTotal: number;
  quoteAttempts: number;
  maxQuoteAttempts: number;
  preflightAttempts: number;
  maxPreflightAttempts: number;
  currentCandidate: RangeQuoteCandidate | null;
  message: string;
};

export type MintableRangeAbortGroup = {
  key: string;
  count: number;
  module: string | null;
  function: string | null;
  code: string | null;
  constantName: string | null;
  message: string;
};

export type MintableRangeScanDiagnostics = {
  candidateCount: number;
  dedupedCandidateCount: number;
  quoteAttemptLimitHit: boolean;
  preflightAttemptLimitHit: boolean;
  quoteSuccessCount: number;
  quoteFailureCount: number;
  zeroCostQuoteCount: number;
  positiveAffordableQuoteCount: number;
  preflightPassCount: number;
  preflightFailureCount: number;
  dominantAbortGroup: MintableRangeAbortGroup | null;
  abortGroups: MintableRangeAbortGroup[];
  summary: string[];
};

export type MintableRangeScanResult = {
  managerId: DeepBookPredictObjectId;
  managerSummary: DeepBookPredictManagerSummary | null;
  managerBalanceAtomic: string | null;
  oracleContexts: ActiveRangeOracleContext[];
  quoteAttempts: RangeQuoteAttempt[];
  preflightAttempts: MintableRangeCandidate[];
  selectedCandidate: MintableRangeCandidate | null;
  blockers: GuidedLifecycleBlocker[];
  warnings: string[];
  diagnostics: MintableRangeScanDiagnostics;
  cancelled: boolean;
};

export type ScanMintableRangeCandidatesParams = {
  client: DeepBookPredictLifecycleClient;
  sender: string;
  managerId: DeepBookPredictObjectId;
  server?: DeepBookPredictServerClient;
  config?: DeepBookPredictNetworkConfig;
  underlyingAsset?: string;
  maxQuoteAttempts?: number;
  maxPreflightAttempts?: number;
  maxOracleContexts?: number;
  maxMintCostAtomic?: string | bigint;
  quantities?: readonly (string | bigint)[];
  signal?: AbortSignal;
  onProgress?: (progress: MintableRangeScanProgress) => void;
};

export type GuidedRangeMintPreparation = {
  candidate: RangeQuoteCandidate;
  quantity: string;
  quote: RangeQuotePreview | null;
  preflight: MintRangePreflightResult | null;
  canMint: boolean;
  blockers: GuidedLifecycleBlocker[];
  warnings: string[];
};

export type PrepareRangeMintParams = {
  client: DeepBookPredictLifecycleClient;
  sender: string;
  managerId: DeepBookPredictObjectId;
  candidate: RangeQuoteCandidate;
  quantity: string | bigint;
  config?: DeepBookPredictNetworkConfig;
};

export type GuidedRangeRedeemPreparation = {
  rangeKey: RangeKeyInput & { oracleObjectId: DeepBookPredictObjectId };
  quantity: string;
  position: ManagerRangePositionResult | null;
  quote: RangeQuotePreview | null;
  preflight: RedeemRangePreflightResult | null;
  canRedeem: boolean;
  blockers: GuidedLifecycleBlocker[];
  warnings: string[];
};

export type PrepareRangeRedeemParams = {
  client: DeepBookPredictLifecycleClient;
  sender: string;
  managerId: DeepBookPredictObjectId;
  rangeKey: RangeKeyInput & { oracleObjectId: DeepBookPredictObjectId };
  quantity: string | bigint;
  config?: DeepBookPredictNetworkConfig;
  allowZeroPayout?: boolean;
};

export function extractManagerDusdcBalanceAtomic(summary: unknown): string | null {
  if (!isRecord(summary)) {
    return null;
  }

  const balanceRecords = Array.isArray(summary.balances) ? summary.balances : [];
  const dusdcRecord = balanceRecords.find((entry) => {
    if (!isRecord(entry)) {
      return false;
    }

    const symbol = stringOrNull(entry.symbol) ?? stringOrNull(entry.asset) ?? stringOrNull(entry.quote_asset);
    const coinType = stringOrNull(entry.coin_type) ?? stringOrNull(entry.coinType) ?? stringOrNull(entry.type);

    return symbol?.toUpperCase() === "DUSDC" || coinType?.toLowerCase().includes("::dusdc::dusdc") === true;
  });

  if (isRecord(dusdcRecord)) {
    const balance = integerStringOrNull(dusdcRecord.balance ?? dusdcRecord.amount ?? dusdcRecord.value);

    if (balance !== null) {
      return balance;
    }
  }

  return integerStringOrNull(summary.trading_balance);
}

export async function loadActiveRangeOracleContexts(
  params: LoadActiveRangeOracleContextsParams,
): Promise<ActiveRangeOracleContext[]> {
  const config = resolveDeepBookPredictConfig(params.config);
  const server = params.server ?? createDeepBookPredictServerClient({ config });
  const nowMs = params.nowMs ?? Date.now();
  const oracleRecords = await server.getOracles(config.predictId);
  const activeOracles = oracleRecords
    .filter((oracle) => oracle.status === "active")
    .filter((oracle) => stringOrNull(oracle.underlying_asset) === (params.underlyingAsset ?? "BTC"))
    .filter((oracle) => {
      const expiry = integerStringOrNull(oracle.expiry);
      return expiry !== null && BigInt(expiry) > BigInt(nowMs);
    })
    .sort(compareOracleExpiry)
    .slice(0, params.maxOracles ?? 4);

  const contexts: ActiveRangeOracleContext[] = [];

  for (const oracle of activeOracles) {
    contexts.push(await loadOracleContext({
      oracle,
      server,
      client: params.client,
      sender: params.sender,
      config,
    }));
  }

  return contexts;
}

export async function scanMintableRangeCandidates(
  params: ScanMintableRangeCandidatesParams,
): Promise<MintableRangeScanResult> {
  const config = resolveDeepBookPredictConfig(params.config);
  const server = params.server ?? createDeepBookPredictServerClient({ config });
  const blockers: GuidedLifecycleBlocker[] = [];
  const warnings: string[] = [];
  const maxQuoteAttempts = params.maxQuoteAttempts ?? 120;
  const maxPreflightAttempts = params.maxPreflightAttempts ?? 30;
  const maxOracleContexts = params.maxOracleContexts ?? 4;
  const progressBase = {
    oracleIndex: 0,
    oracleTotal: 0,
    quoteAttempts: 0,
    maxQuoteAttempts,
    preflightAttempts: 0,
    maxPreflightAttempts,
    currentCandidate: null,
  } satisfies Omit<MintableRangeScanProgress, "stage" | "message">;
  let managerSummary: DeepBookPredictManagerSummary | null = null;
  let managerBalanceAtomic: string | null = null;

  const emitProgress = (progress: Partial<MintableRangeScanProgress> & Pick<MintableRangeScanProgress, "stage" | "message">) => {
    params.onProgress?.({
      ...progressBase,
      ...progress,
    });
  };
  const emptyDiagnostics = (): MintableRangeScanDiagnostics => ({
    candidateCount: 0,
    dedupedCandidateCount: 0,
    quoteAttemptLimitHit: false,
    preflightAttemptLimitHit: false,
    quoteSuccessCount: 0,
    quoteFailureCount: 0,
    zeroCostQuoteCount: 0,
    positiveAffordableQuoteCount: 0,
    preflightPassCount: 0,
    preflightFailureCount: 0,
    dominantAbortGroup: null,
    abortGroups: [],
    summary: [],
  });
  const buildResult = ({
    oracleContexts,
    quoteAttempts,
    preflightAttempts,
    selectedCandidate,
    cancelled,
  }: {
    oracleContexts: ActiveRangeOracleContext[];
    quoteAttempts: RangeQuoteAttempt[];
    preflightAttempts: MintableRangeCandidate[];
    selectedCandidate: MintableRangeCandidate | null;
    cancelled: boolean;
  }): MintableRangeScanResult => ({
    managerId: params.managerId,
    managerSummary,
    managerBalanceAtomic,
    oracleContexts,
    quoteAttempts,
    preflightAttempts,
    selectedCandidate,
    blockers,
    warnings,
    diagnostics: buildMintableRangeScanDiagnostics({
      candidateCount: oracleContexts.reduce((count, context) => count + context.candidates.length, 0),
      dedupedCandidateCount: dedupeRangeCandidates(oracleContexts.flatMap((context) => context.candidates)).length,
      quoteAttempts,
      preflightAttempts,
      positiveAffordableQuoteCount: quoteAttempts.filter((attempt): attempt is RangeQuoteAttemptSuccess => isPositiveAffordableQuote(attempt, managerBalanceAtomic, params.maxMintCostAtomic)).length,
      quoteAttemptLimitHit: quoteAttempts.length >= maxQuoteAttempts,
      preflightAttemptLimitHit: preflightAttempts.length >= maxPreflightAttempts,
    }),
    cancelled,
  });

  emitProgress({ stage: "loading_oracles", message: "Loading manager summary and active oracle contexts." });

  try {
    managerSummary = await server.getManagerSummary(params.managerId);
    managerBalanceAtomic = extractManagerDusdcBalanceAtomic(managerSummary);
  } catch (error) {
    warnings.push(`Manager summary unavailable: ${translateDeepBookPredictError(error)}`);
  }

  if (params.signal?.aborted) {
    return buildResult({ oracleContexts: [], quoteAttempts: [], preflightAttempts: [], selectedCandidate: null, cancelled: true });
  }

  if (managerBalanceAtomic === null) {
    warnings.push("Public server manager DUSDC balance was unavailable; affordability is shown as diagnostic only.");
  }

  const oracleContexts = await loadActiveRangeOracleContexts({
    server,
    client: params.client,
    sender: params.sender,
    config,
    underlyingAsset: params.underlyingAsset,
    maxOracles: maxOracleContexts,
  });

  if (params.signal?.aborted) {
    return buildResult({ oracleContexts, quoteAttempts: [], preflightAttempts: [], selectedCandidate: null, cancelled: true });
  }

  emitProgress({
    stage: "deriving_candidates",
    oracleTotal: oracleContexts.length,
    message: "Ranking runtime-derived candidate families.",
  });

  const candidates = rankRangeCandidates(dedupeRangeCandidates(oracleContexts.flatMap((context) => context.candidates)));

  if (candidates.length === 0) {
    blockers.push({
      code: "no_range_candidates",
      message: "No active oracle produced range candidates from runtime strike and price metadata.",
    });
  }

  emitProgress({
    stage: "quoting",
    oracleTotal: oracleContexts.length,
    message: "Running official quote devInspect over bounded runtime candidates.",
  });

  const quoteAttempts = candidates.length > 0
    ? await scanRangeQuoteQuantities({
        candidates,
        client: params.client,
        sender: params.sender,
        quantities: params.quantities ?? RANGE_QUOTE_QUANTITY_SWEEP,
        maxAttempts: maxQuoteAttempts,
        signal: params.signal,
        config,
        onAttempt: ({ attemptCount, candidate }) => {
          emitProgress({
            stage: "quoting",
            oracleIndex: oracleIndexForCandidate(oracleContexts, candidate),
            oracleTotal: oracleContexts.length,
            quoteAttempts: attemptCount,
            currentCandidate: candidate,
            message: "Running official quote devInspect over bounded runtime candidates.",
          });
        },
      })
    : [];

  if (params.signal?.aborted) {
    return buildResult({ oracleContexts, quoteAttempts, preflightAttempts: [], selectedCandidate: null, cancelled: true });
  }

  const positiveQuotes = dedupeRangeQuoteAttempts(
    quoteAttempts.filter((attempt): attempt is RangeQuoteAttemptSuccess => isPositiveAffordableQuote(attempt, managerBalanceAtomic, params.maxMintCostAtomic)),
  ).sort(comparePreflightCandidates);

  if (positiveQuotes.length === 0 && quoteAttempts.length > 0) {
    blockers.push({
      code: "no_positive_affordable_quote",
      message: "Quote scan did not find a positive mint cost covered by the manager DUSDC balance or configured max cost.",
    });
  }

  const preflightAttempts: MintableRangeCandidate[] = [];
  let selectedCandidate: MintableRangeCandidate | null = null;

  for (const candidate of positiveQuotes.slice(0, maxPreflightAttempts)) {
    if (params.signal?.aborted) {
      return buildResult({ oracleContexts, quoteAttempts, preflightAttempts, selectedCandidate: null, cancelled: true });
    }

    emitProgress({
      stage: "preflighting",
      oracleIndex: oracleIndexForCandidate(oracleContexts, candidate),
      oracleTotal: oracleContexts.length,
      quoteAttempts: quoteAttempts.length,
      preflightAttempts: preflightAttempts.length + 1,
      currentCandidate: candidate,
      message: "Running full mint_range preflight over positive quote candidates.",
    });

    const preflight = await devInspectMintRangePreflight({
      ...candidate,
      managerId: params.managerId,
      quantity: candidate.quantity,
      client: params.client,
      sender: params.sender,
      config,
      candidateParams: {
        widthTicks: candidate.widthTicks,
        strategy: candidate.strategy,
        family: candidate.family,
        mintCostAtomic: candidate.mintCostAtomic,
        redeemPayoutAtomic: candidate.redeemPayoutAtomic,
      },
    });
    const attempt = {
      ...candidate,
      preflight,
    };

    preflightAttempts.push(attempt);

    if (isMintPreflightPassed(preflight)) {
      selectedCandidate = attempt;
      break;
    }
  }

  if (!selectedCandidate && positiveQuotes.length > 0) {
    blockers.push({
      code: "mint_preflight_failed",
      message: "Positive quotes were found, but none passed the official mint preflight.",
    });
  }

  emitProgress({
    stage: selectedCandidate ? "success" : "no_candidate",
    oracleTotal: oracleContexts.length,
    quoteAttempts: quoteAttempts.length,
    preflightAttempts: preflightAttempts.length,
    currentCandidate: selectedCandidate,
    message: selectedCandidate ? "Found a preflight-passing mint candidate." : "No mintable candidate found within browser scan limits.",
  });

  return buildResult({
    oracleContexts,
    quoteAttempts,
    preflightAttempts,
    selectedCandidate,
    cancelled: false,
  });
}

export async function prepareRangeMint(
  params: PrepareRangeMintParams,
): Promise<GuidedRangeMintPreparation> {
  const config = resolveDeepBookPredictConfig(params.config);
  const quantity = normalizePositiveInteger(params.quantity, "Range mint quantity");
  const blockers: GuidedLifecycleBlocker[] = [];
  const warnings: string[] = [];
  let quote: RangeQuotePreview | null = null;
  let preflight: MintRangePreflightResult | null = null;

  try {
    quote = await devInspectRangeQuote({
      ...params.candidate,
      client: params.client,
      sender: params.sender,
      quantity,
      config,
    });
  } catch (error) {
    blockers.push({
      code: "quote_failed",
      message: translateDeepBookPredictError(error),
    });
  }

  if (quote && BigInt(quote.mintCostAtomic) <= 0n) {
    blockers.push({
      code: "zero_mint_cost",
      message: "Official range quote returned zero mint cost; full mint remains blocked.",
    });
  }

  if (quote && BigInt(quote.mintCostAtomic) > 0n) {
    preflight = await devInspectMintRangePreflight({
      ...params.candidate,
      managerId: params.managerId,
      quantity,
      client: params.client,
      sender: params.sender,
      config,
      candidateParams: {
        widthTicks: params.candidate.widthTicks,
        strategy: params.candidate.strategy,
        mintCostAtomic: quote.mintCostAtomic,
        redeemPayoutAtomic: quote.redeemPayoutAtomic,
      },
    });

    if (preflight.status === "failed") {
      blockers.push({
        code: "mint_preflight_failed",
        message: formatAbort(preflight.abort),
      });
    }
  }

  return {
    candidate: params.candidate,
    quantity,
    quote,
    preflight,
    canMint: blockers.length === 0 && preflight !== null && isMintPreflightPassed(preflight),
    blockers,
    warnings,
  };
}

export async function prepareRangeRedeem(
  params: PrepareRangeRedeemParams,
): Promise<GuidedRangeRedeemPreparation> {
  const config = resolveDeepBookPredictConfig(params.config);
  const quantity = normalizePositiveInteger(params.quantity, "Range redeem quantity");
  const normalizedRangeKey = normalizeRangeKeyInput(params.rangeKey);
  const rangeKey = {
    ...normalizedRangeKey,
    oracleObjectId: params.rangeKey.oracleObjectId,
  };
  const blockers: GuidedLifecycleBlocker[] = [];
  const warnings: string[] = [];
  let position: ManagerRangePositionResult | null = null;
  let quote: RangeQuotePreview | null = null;
  let preflight: RedeemRangePreflightResult | null = null;

  try {
    position = await readRangePositionQuantity({
      ...rangeKey,
      managerId: params.managerId,
      client: params.client,
      sender: params.sender,
      config,
    });
  } catch (error) {
    blockers.push({
      code: "range_position_failed",
      message: translateDeepBookPredictError(error),
    });
  }

  if (position) {
    const activeQuantity = BigInt(position.quantity);
    const requestedQuantity = BigInt(quantity);

    if (activeQuantity === 0n) {
      blockers.push({
        code: "no_active_quantity",
        message: "Direct range_position readback returned zero active quantity.",
      });
    }

    if (requestedQuantity > activeQuantity) {
      blockers.push({
        code: "redeem_quantity_exceeds_position",
        message: `Requested redeem quantity ${quantity} exceeds direct active quantity ${position.quantity}.`,
      });
    }
  }

  if (blockers.length === 0) {
    try {
      quote = await devInspectRangeQuote({
        ...rangeKey,
        client: params.client,
        sender: params.sender,
        quantity,
        config,
      });
    } catch (error) {
      blockers.push({
        code: "quote_failed",
        message: translateDeepBookPredictError(error),
      });
    }
  }

  if (quote && !params.allowZeroPayout && BigInt(quote.redeemPayoutAtomic) <= 0n) {
    blockers.push({
      code: "zero_redeem_payout",
      message: "Official range quote returned zero redeem payout; redeem is blocked by default.",
    });
  }

  if (quote && blockers.length === 0) {
    preflight = await devInspectRedeemRangePreflight({
      ...rangeKey,
      managerId: params.managerId,
      quantity,
      client: params.client,
      sender: params.sender,
      config,
      candidateParams: {
        redeemQuantity: quantity,
        positionQuantityBefore: position?.quantity,
        redeemPayoutAtomic: quote.redeemPayoutAtomic,
      },
    });

    if (preflight.status === "failed") {
      blockers.push({
        code: "redeem_preflight_failed",
        message: formatAbort(preflight.abort),
      });
    }
  }

  return {
    rangeKey,
    quantity,
    position,
    quote,
    preflight,
    canRedeem: blockers.length === 0 && preflight !== null && isRedeemPreflightPassed(preflight),
    blockers,
    warnings,
  };
}

function dedupeRangeCandidates(candidates: readonly RangeQuoteCandidate[]): RangeQuoteCandidate[] {
  const deduped = new Map<string, RangeQuoteCandidate>();

  for (const candidate of rankRangeCandidates(candidates)) {
    const key = rangeCandidateKey(candidate);

    if (!deduped.has(key)) {
      deduped.set(key, candidate);
    }
  }

  return [...deduped.values()];
}

function dedupeRangeQuoteAttempts(attempts: readonly RangeQuoteAttemptSuccess[]): RangeQuoteAttemptSuccess[] {
  const deduped = new Map<string, RangeQuoteAttemptSuccess>();

  for (const attempt of attempts) {
    const key = rangeQuoteAttemptKey(attempt, attempt.quantity);
    const previous = deduped.get(key);

    if (!previous || comparePreflightCandidates(attempt, previous) < 0) {
      deduped.set(key, attempt);
    }
  }

  return [...deduped.values()];
}

function isPositiveAffordableQuote(
  attempt: RangeQuoteAttempt,
  managerBalanceAtomic: string | null,
  maxMintCostAtomic: string | bigint | undefined,
): attempt is RangeQuoteAttemptSuccess {
  if (attempt.status !== "success") {
    return false;
  }

  const mintCost = BigInt(attempt.mintCostAtomic);

  if (mintCost <= 0n) {
    return false;
  }

  if (maxMintCostAtomic !== undefined && mintCost > BigInt(maxMintCostAtomic)) {
    return false;
  }

  return managerBalanceAtomic === null || BigInt(managerBalanceAtomic) >= mintCost;
}

function comparePreflightCandidates(left: RangeQuoteAttemptSuccess, right: RangeQuoteAttemptSuccess): number {
  const familyDelta = rangeCandidateFamilyPriority(left) - rangeCandidateFamilyPriority(right);

  if (familyDelta !== 0) {
    return familyDelta;
  }

  const leftCost = BigInt(left.mintCostAtomic);
  const rightCost = BigInt(right.mintCostAtomic);

  if (leftCost !== rightCost) {
    return leftCost < rightCost ? -1 : 1;
  }

  const leftWidth = BigInt(left.widthTicks);
  const rightWidth = BigInt(right.widthTicks);

  if (leftWidth !== rightWidth) {
    return leftWidth < rightWidth ? -1 : 1;
  }

  const leftQuantity = BigInt(left.quantity);
  const rightQuantity = BigInt(right.quantity);

  return leftQuantity < rightQuantity ? -1 : leftQuantity > rightQuantity ? 1 : 0;
}

function oracleIndexForCandidate(
  oracleContexts: readonly ActiveRangeOracleContext[],
  candidate: RangeQuoteCandidate,
): number {
  const index = oracleContexts.findIndex((context) => context.oracleId === candidate.oracleId);
  return index >= 0 ? index + 1 : 0;
}

function buildMintableRangeScanDiagnostics(params: {
  candidateCount: number;
  dedupedCandidateCount: number;
  quoteAttempts: readonly RangeQuoteAttempt[];
  preflightAttempts: readonly MintableRangeCandidate[];
  positiveAffordableQuoteCount: number;
  quoteAttemptLimitHit: boolean;
  preflightAttemptLimitHit: boolean;
}): MintableRangeScanDiagnostics {
  const quoteSuccessCount = params.quoteAttempts.filter((attempt) => attempt.status === "success").length;
  const quoteFailureCount = params.quoteAttempts.length - quoteSuccessCount;
  const zeroCostQuoteCount = params.quoteAttempts.filter((attempt) => attempt.status === "success" && BigInt(attempt.mintCostAtomic) === 0n).length;
  const preflightPassCount = params.preflightAttempts.filter((attempt) => attempt.preflight.status === "passed").length;
  const preflightFailureCount = params.preflightAttempts.length - preflightPassCount;
  const abortGroups = groupMintPreflightAborts(params.preflightAttempts);
  const dominantAbortGroup = abortGroups[0] ?? null;
  const summary: string[] = [];

  if (params.positiveAffordableQuoteCount > 0 && preflightPassCount === 0 && params.preflightAttempts.length > 0) {
    summary.push("Positive quotes were found, but none passed the official mint preflight.");
  }

  if (dominantAbortGroup?.constantName === "EAskPriceOutOfBounds") {
    summary.push("Most failures were EAskPriceOutOfBounds, meaning the post-trade ask was outside DeepBook Predict's allowed bounds.");
  }

  if (params.quoteAttemptLimitHit || params.preflightAttemptLimitHit) {
    summary.push("No mintable candidate found within browser scan limits. Try again later, refresh market data, or use Advanced Diagnostics.");
  }

  return {
    candidateCount: params.candidateCount,
    dedupedCandidateCount: params.dedupedCandidateCount,
    quoteAttemptLimitHit: params.quoteAttemptLimitHit,
    preflightAttemptLimitHit: params.preflightAttemptLimitHit,
    quoteSuccessCount,
    quoteFailureCount,
    zeroCostQuoteCount,
    positiveAffordableQuoteCount: params.positiveAffordableQuoteCount,
    preflightPassCount,
    preflightFailureCount,
    dominantAbortGroup,
    abortGroups,
    summary,
  };
}

function groupMintPreflightAborts(preflightAttempts: readonly MintableRangeCandidate[]): MintableRangeAbortGroup[] {
  const groups = new Map<string, MintableRangeAbortGroup>();

  for (const attempt of preflightAttempts) {
    if (attempt.preflight.status !== "failed") {
      continue;
    }

    const abort = attempt.preflight.abort;
    const key = [abort.module, abort.function, abort.code, abort.constantName].filter(Boolean).join("::") || "Move abort";
    const current = groups.get(key);

    if (current) {
      current.count += 1;
    } else {
      groups.set(key, {
        key,
        count: 1,
        module: abort.module,
        function: abort.function,
        code: abort.code,
        constantName: abort.constantName ?? null,
        message: abort.message,
      });
    }
  }

  return [...groups.values()].sort((left, right) => right.count - left.count);
}

async function loadOracleContext(params: {
  oracle: DeepBookPredictOracleRecord;
  server: DeepBookPredictServerClient;
  client: DeepBookPredictLifecycleClient;
  sender: string;
  config: DeepBookPredictNetworkConfig;
}): Promise<ActiveRangeOracleContext> {
  const warnings: string[] = [];
  const blockers: GuidedLifecycleBlocker[] = [];
  const oracleId = params.oracle.oracle_id;
  const expiry = integerStringOrNull(params.oracle.expiry);
  const minStrike = integerStringOrNull(params.oracle.min_strike);
  const tickSize = integerStringOrNull(params.oracle.tick_size);
  let oracleState: DeepBookPredictOracleState | null = null;
  let publicAskBounds: unknown | null = null;
  let onchainAskBounds: OnchainAskBoundsResult | null = null;
  let latestPrice: { spot?: unknown; forward?: unknown } | null = null;

  try {
    oracleState = await params.server.getOracleState(oracleId);
  } catch (error) {
    warnings.push(`Oracle state unavailable for ${oracleId}: ${translateDeepBookPredictError(error)}`);
  }

  try {
    publicAskBounds = await params.server.getOracleAskBounds(oracleId);
  } catch (error) {
    warnings.push(`Public ask-bounds unavailable for ${oracleId}: ${translateDeepBookPredictError(error)}`);
  }

  try {
    latestPrice = await params.server.getLatestOraclePrice(oracleId);
  } catch (error) {
    warnings.push(`Latest price unavailable for ${oracleId}: ${translateDeepBookPredictError(error)}`);
  }

  onchainAskBounds = await devInspectAskBounds({
    oracleId,
    client: params.client,
    sender: params.sender,
    config: params.config,
  });

  if (onchainAskBounds.status === "unavailable") {
    warnings.push(`Onchain ask-bounds unavailable for ${oracleId}: ${formatAbort(onchainAskBounds.abort)}`);
  }

  const spot = integerStringOrNull(latestPrice?.spot ?? oracleState?.latest_price?.spot);
  const forward = integerStringOrNull(latestPrice?.forward ?? oracleState?.latest_price?.forward);
  let candidates: RangeQuoteCandidate[] = [];

  if (!expiry || !minStrike || !tickSize) {
    blockers.push({
      code: "missing_strike_grid",
      message: "Oracle is missing expiry, min_strike, or tick_size metadata needed for RangeKey candidates.",
    });
  } else if (!spot && !forward) {
    blockers.push({
      code: "missing_price_anchor",
      message: "Oracle is missing live spot/forward price anchors needed for candidate generation.",
    });
  } else {
    candidates = deriveSourceInformedRangeCandidates({
      oracleId,
      oracleObjectId: oracleId,
      underlyingAsset: stringOrNull(params.oracle.underlying_asset),
      expiry,
      minStrike,
      tickSize,
      spot,
      forward,
    });
  }

  return {
    oracleId,
    oracleObjectId: oracleId,
    underlyingAsset: stringOrNull(params.oracle.underlying_asset),
    status: String(params.oracle.status),
    expiry: expiry ?? String(params.oracle.expiry),
    minStrike,
    tickSize,
    spot,
    forward,
    publicAskBounds,
    onchainAskBounds,
    candidates,
    warnings,
    blockers,
  };
}

function compareOracleExpiry(left: DeepBookPredictOracleRecord, right: DeepBookPredictOracleRecord): number {
  const leftExpiry = integerStringOrNull(left.expiry);
  const rightExpiry = integerStringOrNull(right.expiry);

  if (leftExpiry === null && rightExpiry === null) {
    return 0;
  }

  if (leftExpiry === null) {
    return 1;
  }

  if (rightExpiry === null) {
    return -1;
  }

  const leftBigInt = BigInt(leftExpiry);
  const rightBigInt = BigInt(rightExpiry);

  return leftBigInt < rightBigInt ? -1 : leftBigInt > rightBigInt ? 1 : 0;
}

function formatAbort(abort: MintAbortClassification): string {
  const label = [abort.module, abort.function, abort.code].filter(Boolean).join("::");
  const known = abort.constantName ? ` (${abort.constantName})` : "";
  const likelyCause = abort.likelyCause ? ` ${abort.likelyCause}` : "";

  return `${label || "Move abort"}${known}: ${abort.message}${likelyCause}`;
}

function integerStringOrNull(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    return null;
  }

  try {
    const integer = BigInt(value);
    return integer >= 0n ? integer.toString() : null;
  } catch {
    return null;
  }
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
