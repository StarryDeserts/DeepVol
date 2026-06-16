import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import {
  RANGE_QUOTE_QUANTITY_SWEEP,
  createDeepBookPredictServerClient,
  deriveCandidateRanges,
  devInspectAskBounds,
  devInspectMintRangePreflight,
  inferAskBoundSide,
  scanRangeQuoteQuantities,
} from "@deepvol/sdk/deepbookPredict";

const config = DEEPBOOK_PREDICT_TESTNET;
const verifiedSignerAddress = "0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5";
const verifiedManagerId = "0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599";
const maxMintCostAtomic = 5_000_000n;
const maxQuoteCandidates = 120;
const maxMintPreflightAttempts = 40;
const oracleStrikeGridTicks = 100_000n;

main().catch((error) => {
  console.error("Mintable range scan failed:", sanitizeError(error));
  process.exitCode = 1;
});

async function main() {
  assertTestnetConfig();

  const args = parseArgs(process.argv.slice(2));
  const address = args.sender ?? verifiedSignerAddress;
  const managerId = args.manager ?? verifiedManagerId;
  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });
  const server = createDeepBookPredictServerClient({ config });
  const managerSummary = await server.getManagerSummary(managerId);
  const managerBalanceAtomic = findDusdcManagerBalance(managerSummary);

  console.log("Mode: mintable range scan");
  console.log(`DevInspect sender: ${address}`);
  console.log(`Manager ID: ${managerId}`);
  console.log(`Manager DUSDC balance: ${managerBalanceAtomic ?? "unknown"} atomic`);
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);
  console.log("Source inspected from local snapshot: deepbookv3-predict-package/predict");
  console.log(`Quantities tested: ${RANGE_QUOTE_QUANTITY_SWEEP.join(",")}`);
  console.log(`Max quote candidates: ${maxQuoteCandidates}`);
  console.log(`Max mint preflight attempts: ${maxMintPreflightAttempts}`);

  const oracleContexts = await loadActiveOracleContexts({ server, client, address });
  const allCandidates = oracleContexts.flatMap((context) => context.candidates);
  const candidates = rankCandidates(allCandidates).slice(0, maxQuoteCandidates);

  console.log(`Active oracles scanned: ${oracleContexts.length}`);
  console.log(`Candidate ranges derived: ${allCandidates.length}`);
  console.log(`Candidate ranges tested: ${candidates.length}`);

  if (candidates.length === 0) {
    printOracleBlockers(oracleContexts);
    console.log("mintable candidates found: 0");
    return;
  }

  const quoteAttempts = await scanRangeQuoteQuantities({
    candidates,
    client,
    sender: address,
    quantities: RANGE_QUOTE_QUANTITY_SWEEP,
    config,
  });
  const classified = await classifyAttempts({
    attempts: quoteAttempts,
    client,
    address,
    managerId,
    managerBalanceAtomic,
    oracleContexts,
  });
  const ranked = rankClassifiedAttempts(classified);

  printOracleSummary(oracleContexts);
  printMintabilityAttempts(ranked);
  printSummary(classified);
}

async function classifyAttempts({ attempts, client, address, managerId, managerBalanceAtomic, oracleContexts }) {
  const classified = [];
  const preflightable = [];

  for (const attempt of attempts) {
    const context = oracleContexts.find((item) => item.oracleId === attempt.oracleId) ?? null;

    if (attempt.status === "failure") {
      classified.push({
        attempt,
        classification: "quote_abort",
        quoteBucket: "quote_abort",
        preflight: null,
        askSide: null,
        abortClass: quoteAbortClass(attempt.abort),
      });
      continue;
    }

    const mintCost = BigInt(attempt.mintCostAtomic);
    const quoteBucket = classifyQuoteBucket(attempt, context?.onchainAskBounds ?? null);

    if (mintCost <= 0n) {
      classified.push({
        attempt,
        classification: "quote_zero_cost",
        quoteBucket,
        preflight: null,
        askSide: null,
        abortClass: null,
      });
      continue;
    }

    const quoteAllowed = mintCost <= maxMintCostAtomic &&
      managerBalanceAtomic !== null &&
      BigInt(managerBalanceAtomic) >= mintCost &&
      context?.status === "active";

    if (!quoteAllowed) {
      classified.push({
        attempt,
        classification: "quote_success",
        quoteBucket,
        preflight: null,
        askSide: null,
        abortClass: null,
      });
      continue;
    }

    preflightable.push({ attempt, context, quoteBucket });
  }

  const selectedForPreflight = new Set(selectPreflightAttempts(preflightable).map((entry) => attemptKey(entry.attempt)));

  for (const entry of rankPreflightable(preflightable)) {
    const { attempt, context, quoteBucket } = entry;

    if (!selectedForPreflight.has(attemptKey(attempt))) {
      classified.push({
        attempt,
        classification: "quote_success",
        quoteBucket,
        preflight: null,
        askSide: null,
        abortClass: null,
      });
      continue;
    }

    const preflight = await devInspectMintRangePreflight({
      managerId,
      oracleId: attempt.oracleId,
      oracleObjectId: attempt.oracleObjectId,
      expiry: attempt.expiry,
      lowerStrike: attempt.lowerStrike,
      higherStrike: attempt.higherStrike,
      quantity: attempt.quantity,
      client,
      sender: address,
      config,
      candidateParams: candidateParamsForAttempt(attempt),
    });

    if (preflight.status === "passed") {
      classified.push({
        attempt,
        classification: "mint_preflight_success",
        quoteBucket,
        preflight,
        askSide: null,
        abortClass: null,
      });
      continue;
    }

    const askSide = inferAskBoundSide({
      abort: preflight.abort,
      mintCostAtomic: attempt.mintCostAtomic,
      quantity: attempt.quantity,
      minAskPrice: context?.onchainAskBounds?.status === "available" ? context.onchainAskBounds.minAskPrice : null,
      maxAskPrice: context?.onchainAskBounds?.status === "available" ? context.onchainAskBounds.maxAskPrice : null,
    });
    preflight.abort.askBoundSide = askSide;

    classified.push({
      attempt,
      classification: preflight.abort.knownReason === "EAskPriceOutOfBounds"
        ? "mint_preflight_abort_code_7"
        : "mint_preflight_other_abort",
      quoteBucket,
      preflight,
      askSide,
      abortClass: mintAbortClass(preflight.abort),
    });
  }

  return classified;
}

async function loadActiveOracleContexts({ server, client, address }) {
  const oracles = await server.getOracles(config.predictId);
  const nowMs = BigInt(Date.now());
  const active = oracles.filter((oracle) => {
    const expiry = normalizeIntegerOrNull(oracle.expiry);
    return oracle.status === "active" && expiry !== null && BigInt(expiry) > nowMs;
  });
  const contexts = [];

  for (const oracle of active) {
    const oracleId = stringOrNull(oracle.oracle_id);
    const oracleState = oracleId ? await tryRead("oracle_state", () => server.getOracleState(oracleId)) : null;
    const endpointAskBounds = oracleId ? await tryRead("endpoint_ask_bounds", () => server.getOracleAskBounds(oracleId)) : null;
    const onchainAskBounds = oracleId
      ? await devInspectAskBounds({ client, sender: address, oracleId, config })
      : null;
    const oracleRecord = selectOracleRecord(oracle, oracleState);
    contexts.push(buildOracleContext({ oracleRecord, oracleState, endpointAskBounds, onchainAskBounds }));
  }

  return contexts;
}

function buildOracleContext({ oracleRecord, oracleState, endpointAskBounds, onchainAskBounds }) {
  const blockers = [];
  const oracleId = stringOrNull(oracleRecord?.oracle_id);
  const expiry = normalizeIntegerOrNull(oracleRecord?.expiry);
  const minStrike = normalizeIntegerOrNull(oracleRecord?.min_strike);
  const tickSize = normalizeIntegerOrNull(oracleRecord?.tick_size);
  const latestPrice = isRecord(oracleState?.value?.latest_price) ? oracleState.value.latest_price : null;
  const spot = normalizeIntegerOrNull(latestPrice?.spot);
  const forward = normalizeIntegerOrNull(latestPrice?.forward);
  const underlyingAsset = stringOrNull(oracleRecord?.underlying_asset);
  const status = typeof oracleRecord?.status === "string" ? oracleRecord.status : "unknown";

  if (!oracleId) {
    blockers.push("Oracle ID unavailable.");
  }

  if (!expiry) {
    blockers.push("Expiry unavailable.");
  }

  if (!minStrike || !tickSize) {
    blockers.push("Strike grid unavailable.");
  }

  if (!spot && !forward) {
    blockers.push("Latest spot/forward unavailable; scanner cannot derive market-centered ranges.");
  }

  const candidates = oracleId && expiry && minStrike && tickSize && (spot || forward)
    ? deriveSourceInformedRanges({
        oracleId,
        oracleObjectId: oracleId,
        underlyingAsset,
        expiry,
        minStrike,
        tickSize,
        spot,
        forward,
      })
    : [];

  return {
    oracleId: oracleId ?? "unknown",
    underlyingAsset,
    status,
    expiry: expiry ?? "",
    minStrike: minStrike ?? "",
    tickSize: tickSize ?? "",
    spot,
    forward,
    endpointAskBounds,
    onchainAskBounds,
    blockers,
    candidates,
  };
}

function deriveSourceInformedRanges(input) {
  const candidates = new Map();
  const base = deriveCandidateRanges(input).map((candidate) => ({
    ...candidate,
    family: normalizeFamilyName(candidate.strategy),
  }));

  for (const candidate of base) {
    setCandidate(candidates, candidate);
  }

  const minStrike = BigInt(input.minStrike);
  const tickSize = BigInt(input.tickSize);
  const maxStrike = minStrike + oracleStrikeGridTicks * tickSize;
  const anchors = [];

  if (input.forward) {
    anchors.push({ source: "forward", price: BigInt(input.forward) });
  }

  if (input.spot) {
    anchors.push({ source: "spot", price: BigInt(input.spot) });
  }

  for (const anchor of anchors) {
    const anchorStrike = snapToStrike(anchor.price, minStrike, tickSize, maxStrike);
    const wideFamily = anchor.source === "forward" ? "wide_around_forward" : "wide_around_spot";

    for (const widthTicks of [250n, 500n, 1000n, 2500n, 5000n, 10000n]) {
      addCandidate(candidates, input, minStrike, maxStrike, tickSize, anchor, wideFamily, anchorStrike - widthTicks * tickSize, anchorStrike + widthTicks * tickSize);
    }
  }

  const forwardAnchor = anchors.find((anchor) => anchor.source === "forward") ?? null;

  if (forwardAnchor) {
    const forwardStrike = snapToStrike(forwardAnchor.price, minStrike, tickSize, maxStrike);

    for (const widthTicks of [10n, 25n, 50n, 100n, 250n, 500n, 1000n]) {
      const widthAtomic = widthTicks * tickSize;
      addCandidate(candidates, input, minStrike, maxStrike, tickSize, forwardAnchor, "forward_below_to_above", forwardStrike - widthAtomic, forwardStrike + widthAtomic);
      addCandidate(candidates, input, minStrike, maxStrike, tickSize, forwardAnchor, "forward_centered_target_width", forwardStrike - widthAtomic / 2n, forwardStrike + widthAtomic / 2n);
    }

    for (const target of [5n, 10n, 25n, 50n, 75n, 90n]) {
      const widthTicks = oracleStrikeGridTicks * target / 100n;
      const widthAtomic = (widthTicks < 1n ? 1n : widthTicks) * tickSize;
      addCandidate(candidates, input, minStrike, maxStrike, tickSize, forwardAnchor, `target_fair_price_${target}pct`, forwardStrike - widthAtomic / 2n, forwardStrike + widthAtomic / 2n);
    }
  }

  for (const candidate of [...candidates.values()].slice(0, 24)) {
    setCandidate(candidates, {
      ...candidate,
      family: "safe_larger_quantity_probe",
    });
  }

  return [...candidates.values()];
}

function addCandidate(candidates, input, minStrike, maxStrike, tickSize, anchor, family, lowerStrikeValue, higherStrikeValue) {
  const lowerStrike = clampToGrid(lowerStrikeValue, minStrike, maxStrike, tickSize);
  const higherStrike = clampToGrid(higherStrikeValue, minStrike, maxStrike, tickSize);

  if (higherStrike <= lowerStrike) {
    return;
  }

  setCandidate(candidates, {
    oracleId: input.oracleId,
    oracleObjectId: input.oracleObjectId,
    underlyingAsset: input.underlyingAsset,
    expiry: String(input.expiry),
    lowerStrike: lowerStrike.toString(),
    higherStrike: higherStrike.toString(),
    widthTicks: ((higherStrike - lowerStrike) / tickSize).toString(),
    anchorSource: anchor.source,
    anchorPrice: anchor.price.toString(),
    strategy: family,
    family,
  });
}

function setCandidate(candidates, candidate) {
  const key = `${candidate.oracleId}:${candidate.expiry}:${candidate.lowerStrike}:${candidate.higherStrike}:${candidate.family ?? candidate.strategy}`;
  candidates.set(key, candidate);
}

function selectPreflightAttempts(entries) {
  const selected = new Map();
  const quotas = [
    ["within_pretrade_bound_costs", 14],
    ["near_upper_bound", 8],
    ["near_lower_bound", 4],
    ["above_max_probe", 6],
    ["below_min_probe", 2],
    ["bounds_unavailable", 3],
    ["other_abort_probe", 3],
  ];
  const ranked = rankPreflightable(entries);

  for (const [bucket, quota] of quotas) {
    for (const entry of ranked.filter((item) => item.quoteBucket === bucket).slice(0, quota)) {
      selected.set(attemptKey(entry.attempt), entry);
    }
  }

  for (const entry of ranked) {
    if (selected.size >= maxMintPreflightAttempts) {
      break;
    }

    selected.set(attemptKey(entry.attempt), entry);
  }

  return [...selected.values()].slice(0, maxMintPreflightAttempts);
}

function rankPreflightable(entries) {
  return [...entries].sort((left, right) => {
    const bucketDelta = bucketPriority(left.quoteBucket) - bucketPriority(right.quoteBucket);

    if (bucketDelta !== 0) {
      return bucketDelta;
    }

    return compareQuoteAttempts(left.attempt, right.attempt);
  });
}

function rankCandidates(candidates) {
  return [...candidates].sort((left, right) => {
    const leftFamily = familyPriority(left.family ?? left.strategy);
    const rightFamily = familyPriority(right.family ?? right.strategy);

    if (leftFamily !== rightFamily) {
      return leftFamily - rightFamily;
    }

    const leftWidth = BigInt(left.widthTicks);
    const rightWidth = BigInt(right.widthTicks);

    if (leftWidth !== rightWidth) {
      return leftWidth < rightWidth ? -1 : 1;
    }

    const leftAnchor = left.anchorSource === "forward" ? 0 : 1;
    const rightAnchor = right.anchorSource === "forward" ? 0 : 1;
    return leftAnchor - rightAnchor;
  });
}

function rankClassifiedAttempts(attempts) {
  const priority = {
    mint_preflight_success: 0,
    mint_preflight_abort_code_7: 1,
    mint_preflight_other_abort: 2,
    quote_success: 3,
    quote_zero_cost: 4,
    quote_abort: 5,
  };

  return [...attempts].sort((left, right) => {
    const priorityDelta = priority[left.classification] - priority[right.classification];

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return compareQuoteAttempts(left.attempt, right.attempt);
  });
}

function compareQuoteAttempts(left, right) {
  const leftCost = BigInt(left.status === "success" ? left.mintCostAtomic : "0");
  const rightCost = BigInt(right.status === "success" ? right.mintCostAtomic : "0");

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

function classifyQuoteBucket(attempt, onchainAskBounds) {
  if (attempt.status !== "success") {
    return "quote_abort";
  }

  if (onchainAskBounds?.status !== "available") {
    return "bounds_unavailable";
  }

  const mintCost = BigInt(attempt.mintCostAtomic);
  const quantity = BigInt(attempt.quantity);
  const minAsk = BigInt(onchainAskBounds.minAskPrice);
  const maxAsk = BigInt(onchainAskBounds.maxAskPrice);
  const quoteCostScaled = mintCost * 1_000_000_000n;
  const minBoundCostScaled = minAsk * quantity;
  const maxBoundCostScaled = maxAsk * quantity;

  if (quoteCostScaled < minBoundCostScaled) {
    return "below_min_probe";
  }

  if (quoteCostScaled > maxBoundCostScaled) {
    return "above_max_probe";
  }

  if (quoteCostScaled <= minBoundCostScaled * 2n) {
    return "near_lower_bound";
  }

  if (quoteCostScaled * 10n >= maxBoundCostScaled * 9n) {
    return "near_upper_bound";
  }

  return "within_pretrade_bound_costs";
}

function attemptKey(attempt) {
  return `${attempt.oracleId}:${attempt.expiry}:${attempt.lowerStrike}:${attempt.higherStrike}:${attempt.quantity}:${attempt.family ?? attempt.strategy}`;
}

function familyPriority(family) {
  switch (family) {
    case "wide_around_forward":
      return 0;
    case "forward_below_to_above":
      return 1;
    case "forward_centered_target_width":
      return 2;
    case "target_fair_price_50pct":
      return 3;
    case "target_fair_price_25pct":
    case "target_fair_price_75pct":
      return 4;
    case "target_fair_price_10pct":
    case "target_fair_price_90pct":
      return 5;
    case "target_fair_price_5pct":
      return 6;
    case "wide_around_spot":
      return 7;
    case "safe_larger_quantity_probe":
      return 8;
    case "wide-around-anchor":
      return 9;
    case "centered":
      return 10;
    case "below-anchor":
      return 11;
    case "above-anchor":
      return 12;
    case "wide-below-anchor":
      return 13;
    case "wide-above-anchor":
      return 14;
    default:
      return 15;
  }
}

function bucketPriority(bucket) {
  switch (bucket) {
    case "within_pretrade_bound_costs":
      return 0;
    case "near_upper_bound":
      return 1;
    case "near_lower_bound":
      return 2;
    case "above_max_probe":
      return 3;
    case "below_min_probe":
      return 4;
    case "bounds_unavailable":
      return 5;
    default:
      return 6;
  }
}

function printOracleSummary(contexts) {
  console.log("\nActive oracle scan summary");

  for (const context of contexts) {
    console.log(
      `- ${context.oracleId} underlying=${context.underlyingAsset ?? "unknown"} status=${context.status} expiry=${context.expiry} spot=${context.spot ?? "unknown"} forward=${context.forward ?? "unknown"} endpointAskBounds=${formatEndpointBounds(context.endpointAskBounds)} onchainAskBounds=${formatOnchainBounds(context.onchainAskBounds)} candidates=${context.candidates.length}`,
    );

    for (const blocker of context.blockers) {
      console.log(`  blocker: ${blocker}`);
    }
  }
}

function printMintabilityAttempts(ranked) {
  console.log("\nMintability candidates");
  console.log(`mintable candidates found: ${ranked.filter((entry) => entry.classification === "mint_preflight_success").length}`);

  for (const [index, entry] of ranked.slice(0, 24).entries()) {
    const attempt = entry.attempt;
    const mintCost = attempt.status === "success" ? attempt.mintCostAtomic : "";
    const redeemPayout = attempt.status === "success" ? attempt.redeemPayoutAtomic : "";
    const abort = formatAbort(entry);
    console.log(
      `${index + 1}. oracle=${attempt.oracleId} underlying=${attempt.underlyingAsset ?? "unknown"} expiry=${attempt.expiry} lower=${attempt.lowerStrike} higher=${attempt.higherStrike} widthTicks=${attempt.widthTicks} strategy=${attempt.strategy} family=${attempt.family ?? "unknown"} quantity=${attempt.quantity} mint=${mintCost} redeem=${redeemPayout} quote_bucket=${entry.quoteBucket} classification=${entry.classification}${abort}`,
    );
  }
}

function printSummary(classified) {
  const counts = countBy(classified, (entry) => entry.classification);
  const abortCounts = countBy(classified.filter((entry) => entry.abortClass), (entry) => entry.abortClass);
  const askSideCounts = countBy(classified.filter((entry) => entry.askSide), (entry) => entry.askSide.side);
  const familyCounts = countBy(classified, (entry) => entry.attempt.family ?? "unknown");

  console.log("\nMintability summary");
  console.log(`attempts: ${classified.length}`);
  console.log(`quote successes: ${classified.filter((entry) => entry.attempt.status === "success").length}`);
  console.log(`zero-cost quotes: ${counts.get("quote_zero_cost") ?? 0}`);
  console.log(`positive quotes under cap: ${classified.filter(isPositiveUnderCap).length}`);
  console.log(`preflight attempts: ${(counts.get("mint_preflight_success") ?? 0) + (counts.get("mint_preflight_abort_code_7") ?? 0) + (counts.get("mint_preflight_other_abort") ?? 0)}`);
  console.log(`preflight successes: ${counts.get("mint_preflight_success") ?? 0}`);
  console.log(`code 7 failures: ${counts.get("mint_preflight_abort_code_7") ?? 0}`);
  console.log(`other preflight failures: ${counts.get("mint_preflight_other_abort") ?? 0}`);
  console.log(`ask side below_min: ${askSideCounts.get("below_min") ?? 0}`);
  console.log(`ask side above_max: ${askSideCounts.get("above_max") ?? 0}`);
  console.log(`ask side unknown: ${askSideCounts.get("unknown") ?? 0}`);
  console.log(`candidate families tested: ${[...familyCounts.entries()].map(([key, value]) => `${key}=${value}`).join(",")}`);
  console.log(`abort classes: ${[...abortCounts.entries()].map(([key, value]) => `${key}=${value}`).join(",") || "none"}`);

  const best = rankClassifiedAttempts(classified).find((entry) => entry.classification === "mint_preflight_success");

  if (!best || best.attempt.status !== "success") {
    console.log("best mintable candidate: none");
    return;
  }

  console.log(
    `best mintable candidate: oracle=${best.attempt.oracleId} quantity=${best.attempt.quantity} mint=${best.attempt.mintCostAtomic} redeem=${best.attempt.redeemPayoutAtomic} lower=${best.attempt.lowerStrike} higher=${best.attempt.higherStrike} family=${best.attempt.family ?? "unknown"}`,
  );
}

function isPositiveUnderCap(entry) {
  if (entry.attempt.status !== "success") {
    return false;
  }

  const mintCost = BigInt(entry.attempt.mintCostAtomic);
  return mintCost > 0n && mintCost <= maxMintCostAtomic;
}

function formatAbort(entry) {
  if (entry.preflight?.status === "failed") {
    const abort = entry.preflight.abort;
    return ` abort_module=${abort.module ?? "unknown"} abort_function=${abort.function ?? "unknown"} abort_code=${abort.code ?? "unknown"} constant=${abort.constantName ?? "unknown"} known_reason=${abort.knownReason} likely_cause=${compact(abort.likelyCause)} ask_side=${entry.askSide?.side ?? "unknown"} ask_confidence=${entry.askSide?.confidence ?? "low"}`;
  }

  if (entry.attempt.status === "failure") {
    return ` abort_module=${entry.attempt.abort.module ?? "unknown"} abort_function=${entry.attempt.abort.function ?? "unknown"} abort_code=${entry.attempt.abort.code ?? "unknown"} constant=${entry.attempt.abort.constantName ?? "unknown"} likely_cause=${compact(entry.attempt.abort.likelyCause)}`;
  }

  return "";
}

function printOracleBlockers(contexts) {
  console.log("\nOracle blockers");

  for (const context of contexts) {
    for (const blocker of context.blockers) {
      console.log(`- ${context.oracleId}: ${blocker}`);
    }
  }
}

function candidateParamsForAttempt(attempt) {
  return {
    oracleId: attempt.oracleId,
    oracleObjectId: attempt.oracleObjectId,
    expiry: attempt.expiry,
    lowerStrike: attempt.lowerStrike,
    higherStrike: attempt.higherStrike,
    widthTicks: attempt.widthTicks,
    strategy: attempt.strategy,
    family: attempt.family,
    quantity: attempt.quantity,
    mintCostAtomic: attempt.mintCostAtomic,
    redeemPayoutAtomic: attempt.redeemPayoutAtomic,
  };
}

function quoteAbortClass(abort) {
  return `${abort.module ?? "unknown"}::${abort.function ?? "unknown"}::${abort.code ?? "unknown"}::${abort.constantName ?? "unknown"}`;
}

function mintAbortClass(abort) {
  return `${abort.module ?? "unknown"}::${abort.function ?? "unknown"}::${abort.code ?? "unknown"}::${abort.constantName ?? "unknown"}`;
}

function formatEndpointBounds(endpoint) {
  if (!endpoint) {
    return "unavailable";
  }

  if (endpoint.kind === "error") {
    return `error:${endpoint.message}`;
  }

  if (endpoint.value === null) {
    return "null";
  }

  return `keys=${topLevelKeys(endpoint.value).join(",") || "none"}`;
}

function formatOnchainBounds(onchain) {
  if (!onchain) {
    return "unavailable";
  }

  if (onchain.status === "available") {
    return `min=${onchain.minAskPrice},max=${onchain.maxAskPrice}`;
  }

  return `abort_module=${onchain.abort.module ?? "unknown"},abort_code=${onchain.abort.code ?? "unknown"},constant=${onchain.abort.constantName ?? "unknown"}`;
}

function findDusdcManagerBalance(value) {
  if (!isRecord(value) || !Array.isArray(value.balances)) {
    return null;
  }

  const matchingQuoteBalance = value.balances.find((entry) => {
    return (
      isRecord(entry) &&
      typeof entry.quote_asset === "string" &&
      entry.quote_asset.endsWith("::dusdc::DUSDC")
    );
  });

  if (!matchingQuoteBalance || !isRecord(matchingQuoteBalance)) {
    return null;
  }

  return normalizeIntegerOrNull(matchingQuoteBalance.balance);
}

function selectOracleRecord(selectedOracle, oracleState) {
  if (oracleState?.kind !== "error" && isRecord(oracleState?.value?.oracle)) {
    return oracleState.value.oracle;
  }

  return selectedOracle;
}

async function tryRead(source, read) {
  try {
    return {
      kind: "ok",
      source,
      value: await read(),
    };
  } catch (error) {
    return {
      kind: "error",
      source,
      message: sanitizeError(error),
    };
  }
}

function parseArgs(args) {
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--sender") {
      parsed.sender = args[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--sender=")) {
      parsed.sender = arg.slice("--sender=".length);
      continue;
    }

    if (arg === "--manager") {
      parsed.manager = args[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--manager=")) {
      parsed.manager = arg.slice("--manager=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function assertTestnetConfig() {
  if (config.network !== "testnet") {
    throw new Error("DeepBook Predict config is not Sui Testnet; aborting.");
  }
}

function normalizeIntegerOrNull(value) {
  if (typeof value === "bigint") {
    return value >= 0n ? value.toString() : null;
  }

  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return BigInt(value).toString();
  }

  return null;
}

function stringOrNull(value) {
  return typeof value === "string" ? value : null;
}

function normalizeFamilyName(strategy) {
  return typeof strategy === "string" ? strategy : "unknown";
}

function snapToStrike(anchor, minStrike, tickSize, maxStrike) {
  if (anchor <= minStrike) {
    return minStrike;
  }

  if (anchor >= maxStrike) {
    return maxStrike;
  }

  const offset = anchor - minStrike;
  const lowerSteps = offset / tickSize;
  const lower = minStrike + lowerSteps * tickSize;
  const upper = lower + tickSize;
  const snapped = anchor - lower <= upper - anchor ? lower : upper;
  return clampToGrid(snapped, minStrike, maxStrike, tickSize);
}

function clampToGrid(value, minStrike, maxStrike, tickSize) {
  const clamped = value < minStrike ? minStrike : value > maxStrike ? maxStrike : value;
  const offset = clamped - minStrike;
  return minStrike + offset / tickSize * tickSize;
}

function countBy(values, keyFn) {
  const counts = new Map();

  for (const value of values) {
    const key = keyFn(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function compact(value) {
  return value ? String(value).replace(/\s+/g, " ") : "unknown";
}

function topLevelKeys(value) {
  if (!isRecord(value) && !Array.isArray(value)) {
    return [];
  }

  return Object.keys(value).slice(0, 24);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/suiprivkey1[0-9a-z]+/gi, "[redacted-sui-private-key]");
}
