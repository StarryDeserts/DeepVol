import type {
  AskBoundSideInference,
  MintAbortCandidateParams,
  MintAbortClassification,
  MintAbortKnownReason,
} from "@rangepilot/types/deepbookPredict";

export class DeepBookPredictUnconfirmedBindingError extends Error {
  readonly code = "DEEPBOOK_PREDICT_UNCONFIRMED_BINDING";

  constructor(message: string) {
    super(message);
    this.name = "DeepBookPredictUnconfirmedBindingError";
  }
}

export class DeepBookPredictCoinSelectionError extends Error {
  readonly code = "DEEPBOOK_PREDICT_COIN_SELECTION";

  constructor(message: string) {
    super(message);
    this.name = "DeepBookPredictCoinSelectionError";
  }
}

type AbortMetadata = {
  constantName: string;
  likelyCause: string;
};

export type ClassifyDeepBookPredictAbortOptions = {
  candidateParams?: MintAbortCandidateParams;
  askBoundSide?: AskBoundSideInference;
};

export type InferAskBoundSideParams = {
  abort: Pick<MintAbortClassification, "knownReason">;
  mintCostAtomic?: string | bigint | number | null;
  quantity?: string | bigint | number | null;
  minAskPrice?: string | bigint | number | null;
  maxAskPrice?: string | bigint | number | null;
};

const FLOAT_SCALING = 1_000_000_000n;

export const DEEPBOOK_PREDICT_ABORT_CONSTANTS: Record<string, Record<string, AbortMetadata>> = {
  i64: {
    "0": {
      constantName: "EOverflow",
      likelyCause: "Signed fixed-point arithmetic overflowed while evaluating oracle or pricing math.",
    },
    "1": {
      constantName: "EZeroDivisor",
      likelyCause: "Signed fixed-point division attempted to divide by zero.",
    },
  },
  math: {
    "0": {
      constantName: "EInputZero",
      likelyCause: "Math helper received zero where the source requires a positive input.",
    },
    "1": {
      constantName: "EExpOverflow",
      likelyCause: "Math helper exponential input exceeded the source-defined safe range.",
    },
    "2": {
      constantName: "EInvalidPrecision",
      likelyCause: "Math helper received an invalid precision argument.",
    },
  },
  oracle: {
    "0": {
      constantName: "EInvalidOracleCap",
      likelyCause: "Oracle capability did not match the oracle object being modified or inspected.",
    },
    "1": {
      constantName: "EOracleAlreadyActive",
      likelyCause: "Oracle activation was attempted for an oracle that is already active.",
    },
    "2": {
      constantName: "EOracleExpired",
      likelyCause: "Oracle operation required a non-expired oracle, but the oracle was expired.",
    },
    "3": {
      constantName: "EZeroForward",
      likelyCause: "Oracle pricing rejected a zero forward price.",
    },
    "4": {
      constantName: "ECannotBeNegative",
      likelyCause: "Oracle SVI math produced or received a value that cannot be negative for this path.",
    },
    "5": {
      constantName: "EZeroVariance",
      likelyCause: "Oracle SVI pricing rejected zero variance.",
    },
    "6": {
      constantName: "EOracleSettled",
      likelyCause: "Live oracle pricing path was used after the oracle had settled.",
    },
  },
  oracle_config: {
    "0": {
      constantName: "EMarketKeyOracleMismatch",
      likelyCause: "MarketKey oracle ID did not match the OracleSVI object.",
    },
    "1": {
      constantName: "EMarketKeyExpiryMismatch",
      likelyCause: "MarketKey expiry did not match the OracleSVI object.",
    },
    "2": {
      constantName: "EInvalidStrike",
      likelyCause: "Strike was outside or unaligned with the oracle strike grid.",
    },
    "3": {
      constantName: "EOracleSettled",
      likelyCause: "Quote path expected an unsettled oracle but received a settled oracle.",
    },
    "4": {
      constantName: "EOracleExpired",
      likelyCause: "Quote path rejected an expired oracle.",
    },
    "5": {
      constantName: "EOracleInactive",
      likelyCause: "Quote or mint path rejected an inactive oracle.",
    },
    "6": {
      constantName: "EOracleStale",
      likelyCause: "Oracle data was stale relative to the source-defined staleness threshold.",
    },
    "7": {
      constantName: "EOracleConfigNotFound",
      likelyCause: "Predict oracle configuration was missing for the oracle ID.",
    },
    "8": {
      constantName: "EInvalidCurveRange",
      likelyCause: "Oracle curve range was invalid for the requested strike grid operation.",
    },
    "9": {
      constantName: "ERangeKeyOracleMismatch",
      likelyCause: "RangeKey oracle ID did not match the OracleSVI object.",
    },
    "10": {
      constantName: "ERangeKeyExpiryMismatch",
      likelyCause: "RangeKey expiry did not match the OracleSVI object.",
    },
    "11": {
      constantName: "EInvalidAskBound",
      likelyCause: "Oracle-specific ask bounds were invalid for the configured global ask bound rules.",
    },
  },
  predict: {
    "0": {
      constantName: "ETradingPaused",
      likelyCause: "Predict trading was paused.",
    },
    "1": {
      constantName: "ENotOwner",
      likelyCause: "Transaction sender did not match the PredictManager owner.",
    },
    "2": {
      constantName: "EWithdrawExceedsAvailable",
      likelyCause: "Requested withdrawal exceeded available vault liquidity.",
    },
    "3": {
      constantName: "EZeroQuantity",
      likelyCause: "Mint or redeem was called with zero quantity.",
    },
    "4": {
      constantName: "EZeroAmount",
      likelyCause: "A vault or account operation received a zero amount where positive amount is required.",
    },
    "5": {
      constantName: "EZeroVaultValue",
      likelyCause: "Vault value was zero for an operation that requires nonzero vault value.",
    },
    "6": {
      constantName: "EZeroSharesMinted",
      likelyCause: "PLP supply path would have minted zero shares.",
    },
    "7": {
      constantName: "EAskPriceOutOfBounds",
      likelyCause: "Post-trade ask price was outside resolved ask bounds after mint_range inserted range exposure and refreshed oracle risk.",
    },
    "8": {
      constantName: "EAskBoundLooserThanGlobal",
      likelyCause: "Oracle-specific ask bounds were looser than the global pricing configuration allows.",
    },
    "9": {
      constantName: "EOracleNotSettled",
      likelyCause: "Settlement-only path was called before the oracle had settled.",
    },
  },
  predict_manager: {
    "0": {
      constantName: "EInvalidOwner",
      likelyCause: "PredictManager owner did not match the required owner for this operation.",
    },
    "1": {
      constantName: "EInsufficientPosition",
      likelyCause: "PredictManager binary position was insufficient for the requested operation.",
    },
    "2": {
      constantName: "EInsufficientRangePosition",
      likelyCause: "PredictManager range position was insufficient for the requested operation.",
    },
  },
  pricing_config: {
    "0": {
      constantName: "EInvalidSpread",
      likelyCause: "Pricing configuration spread value was invalid.",
    },
    "1": {
      constantName: "EFairPriceAlreadySettled",
      likelyCause: "Pricing spread path received a boundary fair price of 0 or 1 instead of a live-market fair price strictly between them.",
    },
    "2": {
      constantName: "EInvalidAskBound",
      likelyCause: "Pricing ask-bound configuration violated min/max constraints.",
    },
  },
  range_key: {
    "0": {
      constantName: "EInvalidStrikes",
      likelyCause: "RangeKey lower strike was not strictly less than higher strike.",
    },
  },
  rate_limiter: {
    "0": {
      constantName: "EExceedsCapacity",
      likelyCause: "Rate limiter request exceeded configured capacity.",
    },
    "1": {
      constantName: "EInsufficientWithdrawalBudget",
      likelyCause: "Withdrawal request exceeded the current rate-limited withdrawal budget.",
    },
    "2": {
      constantName: "EInvalidConfig",
      likelyCause: "Rate limiter configuration was invalid.",
    },
  },
  registry: {
    "0": {
      constantName: "EPredictAlreadyCreated",
      likelyCause: "Registry already has a Predict object for this configuration.",
    },
    "1": {
      constantName: "EInvalidTickSize",
      likelyCause: "Registry rejected an invalid oracle tick size.",
    },
    "2": {
      constantName: "EInvalidStrikeGrid",
      likelyCause: "Registry rejected an invalid oracle strike grid.",
    },
  },
  risk_config: {
    "0": {
      constantName: "EExceedsMaxPct",
      likelyCause: "Risk configuration percentage exceeded the source-defined maximum.",
    },
  },
  strike_matrix: {
    "0": {
      constantName: "EInvalidTickSize",
      likelyCause: "Strike matrix received an invalid tick size.",
    },
    "1": {
      constantName: "EInvalidStrikeRange",
      likelyCause: "Strike matrix received an invalid strike range.",
    },
    "2": {
      constantName: "EInsufficientQuantity",
      likelyCause: "Strike matrix quantity was insufficient for the requested removal or payout operation.",
    },
    "3": {
      constantName: "ENonMonotoneCurve",
      likelyCause: "Strike matrix curve update was not monotone.",
    },
    "4": {
      constantName: "EInvalidCurveRange",
      likelyCause: "Strike matrix curve range was invalid.",
    },
    "5": {
      constantName: "EUnalignedStrike",
      likelyCause: "Strike matrix rejected a strike that was not aligned to the grid.",
    },
  },
  treasury_config: {
    "0": {
      constantName: "ECoinAlreadyAccepted",
      likelyCause: "Treasury config already accepts this quote asset.",
    },
    "1": {
      constantName: "EQuoteAssetNotAccepted",
      likelyCause: "Mint path used a quote asset type that Predict treasury config does not accept.",
    },
    "2": {
      constantName: "EInvalidQuoteDecimals",
      likelyCause: "Quote asset decimals did not match the source-required decimals.",
    },
  },
  vault: {
    "0": {
      constantName: "EInsufficientBalance",
      likelyCause: "Vault balance was insufficient for the requested payout or withdrawal.",
    },
    "1": {
      constantName: "EExceedsMaxTotalExposure",
      likelyCause: "Post-trade vault exposure exceeded the configured max total exposure percentage.",
    },
    "2": {
      constantName: "EOracleExposureNotFound",
      likelyCause: "Vault exposure state was missing for the oracle ID.",
    },
    "3": {
      constantName: "EMtmExceedsBalance",
      likelyCause: "Vault mark-to-market exceeded vault balance.",
    },
    "4": {
      constantName: "EAssetNotInVault",
      likelyCause: "Requested quote asset was not present in the vault.",
    },
  },
};

export function classifyDeepBookPredictAbort(
  errorOrMessage: unknown,
  options: ClassifyDeepBookPredictAbortOptions = {},
): MintAbortClassification {
  const message = normalizeErrorMessage(errorOrMessage);
  const location = parseAbortLocation(message);
  const parsedCode = parseAbortCode(message);
  const inferredAskCode = location.module === "predict" && location.function === "assert_mintable_ask";
  const code = parsedCode ?? (inferredAskCode ? "7" : null);
  const sourceAbort = location.module && code
    ? DEEPBOOK_PREDICT_ABORT_CONSTANTS[location.module]?.[code]
    : undefined;
  const knownReason = inferKnownReason(location.module, location.function, code, sourceAbort);

  return {
    packageId: location.packageId,
    module: location.module,
    function: location.function,
    code,
    message,
    knownReason,
    constantName: sourceAbort?.constantName ?? null,
    likelyCause: sourceAbort?.likelyCause ?? null,
    candidateParams: normalizeCandidateParams(options.candidateParams),
    askBoundSide: options.askBoundSide,
  };
}

export function inferAskBoundSide(params: InferAskBoundSideParams): AskBoundSideInference {
  if (params.abort.knownReason !== "EAskPriceOutOfBounds") {
    return {
      side: "unknown",
      confidence: "low",
      reason: "Ask-bound side is only meaningful for EAskPriceOutOfBounds aborts.",
    };
  }

  const mintCost = parseNonNegativeBigInt(params.mintCostAtomic);
  const quantity = parsePositiveBigInt(params.quantity);
  const minAsk = parseNonNegativeBigInt(params.minAskPrice);
  const maxAsk = parseNonNegativeBigInt(params.maxAskPrice);

  if (mintCost === null || quantity === null || minAsk === null || maxAsk === null) {
    return {
      side: "unknown",
      confidence: "low",
      reason: "Resolved ask bounds, quote cost, or quantity were unavailable; exact post-trade ask_price is not returned by mint_range preflight.",
    };
  }

  const quoteCostScaled = mintCost * FLOAT_SCALING;
  const minBoundCostScaled = minAsk * quantity;
  const maxBoundCostScaled = maxAsk * quantity;

  if (quoteCostScaled < minBoundCostScaled) {
    return {
      side: "below_min",
      confidence: "low",
      reason: "Pre-trade quote cost is below the resolved min-ask cost threshold, but the failing mint ask is recomputed after exposure insertion and is not directly observable.",
    };
  }

  if (quoteCostScaled > maxBoundCostScaled) {
    return {
      side: "above_max",
      confidence: "low",
      reason: "Pre-trade quote cost is above the resolved max-ask cost threshold, but the failing mint ask is recomputed after exposure insertion and is not directly observable.",
    };
  }

  return {
    side: "unknown",
    confidence: "medium",
    reason: "Pre-trade quote cost is within resolved ask-bound cost thresholds; code 7 came from the post-trade ask after range exposure insertion and risk refresh, and that exact ask_price is not exposed.",
  };
}

export function isNonLiveOracleAbort(error: unknown): boolean {
  const abort = classifyDeepBookPredictAbort(error);

  if (abort.module !== "oracle_config") {
    return false;
  }

  return abort.code === "3" || abort.code === "4" || abort.code === "5" || abort.code === "6";
}

export function translateDeepBookPredictError(error: unknown): string {
  if (isNonLiveOracleAbort(error)) {
    return "This oracle is no longer live for new minting. Refresh the active BTC market before trading this primitive.";
  }

  if (error instanceof DeepBookPredictUnconfirmedBindingError) {
    return error.message;
  }

  if (error instanceof DeepBookPredictCoinSelectionError) {
    return error.message;
  }

  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("reject") ||
    lowerMessage.includes("declin") ||
    lowerMessage.includes("denied") ||
    lowerMessage.includes("cancel")
  ) {
    return "Wallet confirmation was rejected or cancelled.";
  }

  if (lowerMessage.includes("insufficient") && lowerMessage.includes("dusdc")) {
    return "Insufficient DUSDC balance for this deposit.";
  }

  if (lowerMessage.includes("network") || lowerMessage.includes("chain")) {
    return "Wallet must be connected to Sui Testnet for this scaffold.";
  }

  if (lowerMessage.includes("moveabort") || lowerMessage.includes("move abort")) {
    return "Sui Move execution failed. Confirm the PredictManager, DUSDC coin, and entrypoint bindings before retrying.";
  }

  return message || "DeepBook Predict operation failed.";
}

function inferKnownReason(
  moduleName: string | null,
  functionName: string | null,
  code: string | null,
  sourceAbort: AbortMetadata | undefined,
): MintAbortKnownReason {
  if (moduleName === "predict" && functionName === "assert_mintable_ask" && code === "7") {
    return "EAskPriceOutOfBounds";
  }

  return sourceAbort ? "source_known_abort" : "unknown";
}

function parseAbortLocation(message: string): {
  packageId: string | null;
  module: string | null;
  function: string | null;
} {
  const pathMatches = [...message.matchAll(/(0x[0-9a-fA-F]+)::([A-Za-z0-9_]+)::([A-Za-z0-9_]+)/g)];
  const pathMatch = pathMatches.at(-1);

  if (pathMatch) {
    return {
      packageId: pathMatch[1],
      module: pathMatch[2],
      function: pathMatch[3],
    };
  }

  const packageMatch = message.match(/address:\s*(0x[0-9a-fA-F]+)/);
  const moduleMatch = message.match(/name:\s*Identifier\("([A-Za-z0-9_]+)"\)/);
  const functionMatch = message.match(/function_name:\s*Some\("([A-Za-z0-9_]+)"\)/);

  return {
    packageId: packageMatch?.[1] ?? null,
    module: moduleMatch?.[1] ?? null,
    function: functionMatch?.[1] ?? null,
  };
}

function parseAbortCode(message: string): string | null {
  const patterns = [
    /abort(?:ed)?(?: with)? code:?\s*(\d+)/i,
    /abort(?:ed)?(?: with)? code\s+(\d+)/i,
    /MoveAbort[\s\S]*?,\s*(\d+)\)/,
    /,\s*(\d+)\)\s*in command/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);

    if (match?.[1]) {
      return BigInt(match[1]).toString();
    }
  }

  return null;
}

function normalizeErrorMessage(errorOrMessage: unknown): string {
  if (errorOrMessage instanceof Error) {
    return errorOrMessage.message;
  }

  if (typeof errorOrMessage === "string") {
    return errorOrMessage;
  }

  if (errorOrMessage === null || errorOrMessage === undefined) {
    return String(errorOrMessage);
  }

  try {
    return JSON.stringify(errorOrMessage);
  } catch {
    return String(errorOrMessage);
  }
}

function normalizeCandidateParams(params: MintAbortCandidateParams | undefined): MintAbortCandidateParams | undefined {
  if (!params) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  ) as MintAbortCandidateParams;
}

function parseNonNegativeBigInt(value: string | bigint | number | null | undefined): bigint | null {
  const parsed = parseBigInt(value);
  return parsed !== null && parsed >= 0n ? parsed : null;
}

function parsePositiveBigInt(value: string | bigint | number | null | undefined): bigint | null {
  const parsed = parseBigInt(value);
  return parsed !== null && parsed > 0n ? parsed : null;
}

function parseBigInt(value: string | bigint | number | null | undefined): bigint | null {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return BigInt(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return BigInt(value);
  }

  return null;
}
