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
  console.error("Mint preflight abort analysis failed:", sanitizeError(error));
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

  console.log("Mode: mint preflight abort analyzer");
  console.log(`DevInspect sender: ${address}`);
  console.log(`Manager ID: ${managerId}`);
  console.log(`Manager DUSDC balance: ${managerBalanceAtomic ?? "unknown"} atomic`);
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);
  console.log("Source inspected from local snapshot: deepbookv3-predict-package/predict");
  console.log("Local source snapshot used for debugging; official docs remain deployment/config source of truth.");
  console.log(`Quantities tested: ${RANGE_QUOTE_QUANTITY_SWEEP.join(",")}`);
  console.log(`Max quote candidates: ${maxQuoteCandidates}`);
  console.log(`Max mint preflight attempts: ${maxMintPreflightAttempts}`);

  const oracleContexts = await loadActiveOracleContexts({ server, client, address });
  const allCandidates = oracleContexts.flatMap((context) => context.candidates);
  const candidates = rankCandidates(allCandidates).slice(0, maxQuoteCandidates);

  console.log(`Active oracles scanned: ${oracleContexts.length}`);
  console.log(`Candidate ranges derived: ${allCandidates.length}`);
  console.log(`Candidate ranges quoted: ${candidates.length}`);

  if (candidates.length === 0) {
    printOracleSummary(oracleContexts);
    printSummary([]);
    return;
  }

  const quoteAttempts = await scanRangeQuoteQuantities({
    candidates,
    client,
    sender: address,
    quantities: RANGE_QUOTE_QUANTITY_SWEEP,
    config,
  });
  const preflightInputs = selectPreflightInputs({
    quoteAttempts,
    oracleContexts,
    managerBalanceAtomic,
  });
  const results = await runMintPreflights({
    inputs: preflightInputs,
    client,
    address,
    managerId,
  });

  printOracleSummary(oracleContexts);
  printAbortGroups(results);
  printSummary(results);
}

async function runMintPreflights({ inputs, client, address, managerId }) {
  const results = [];

  for (const input of inputs) {
    const { attempt, context, quoteBucket } = input;
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
      results.push({ attempt, context, quoteBucket, preflight, askSide: null });
      continue;
    }

    const askSide = inferAskBoundSide({
      abort: preflight.abort,
      mintCostAtomic: attempt.mintCostAtomic,
      quantity: attempt.quantity,
      minAskPrice: context.onchainAskBounds?.status === "available" ? context.onchainAskBounds.minAskPrice : null,
      maxAskPrice: context.onchainAskBounds?.status === "available" ? context.onchainAskBounds.maxAskPrice : null,
    });
    preflight.abort.askBoundSide = askSide;
    results.push({ attempt, context, quoteBucket, preflight, askSide });
  }

  return results;
}

function selectPreflightInputs({ quoteAttempts, oracleContexts, managerBalanceAtomic }) {
  const preflightable = [];

  for (const attempt of quoteAttempts) {
    if (attempt.status !== "success") {
      continue;
    }

    const context = oracleContexts.find((item) => item.oracleId === attempt.oracleId);

    if (!context || context.status !== "active") {
      continue;
    }

    const mintCost = BigInt(attempt.mintCostAtomic);

    if (mintCost <= 0n || mintCost > maxMintCostAtomic) {
      continue;
    }

    if (managerBalanceAtomic === null || BigInt(managerBalanceAtomic) < mintCost) {
      continue;
    }

    preflightable.push({
      attempt,
      context,
      quoteBucket: classifyQuoteBucket(attempt, context.onchainAskBounds),
    });
  }

  return selectPreflightAttempts(preflightable);
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
    blockers.push("Latest spot/forward unavailable; analyzer cannot derive market-centered ranges.");
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

function printAbortGroups(results) {
  console.log("\nMint preflight abort groups");
  const failures = results.filter((result) => result.preflight.status === "failed");
  const groups = new Map();

  for (const result of failures) {
    const abort = result.preflight.abort;
    const key = abortClass(abort);
    const existing = groups.get(key) ?? { count: 0, representative: result };
    groups.set(key, {
      count: existing.count + 1,
      representative: existing.representative,
    });
  }

  if (groups.size === 0) {
    console.log("none");
    return;
  }

  for (const [key, group] of [...groups.entries()].sort((left, right) => right[1].count - left[1].count)) {
    const representative = group.representative;
    const attempt = representative.attempt;
    const context = representative.context;
    const abort = representative.preflight.abort;

    console.log(`- ${key}: count=${group.count}`);
    console.log(`  oracle_id=${attempt.oracleId}`);
    console.log(`  underlying=${attempt.underlyingAsset ?? context.underlyingAsset ?? "unknown"}`);
    console.log(`  expiry=${attempt.expiry}`);
    console.log(`  lower=${attempt.lowerStrike}`);
    console.log(`  higher=${attempt.higherStrike}`);
    console.log(`  width_ticks=${attempt.widthTicks}`);
    console.log(`  strategy=${attempt.strategy}`);
    console.log(`  family=${attempt.family ?? "unknown"}`);
    console.log(`  quantity=${attempt.quantity}`);
    console.log(`  mint_cost=${attempt.mintCostAtomic}`);
    console.log(`  redeem_payout=${attempt.redeemPayoutAtomic}`);
    console.log(`  min_ask=${context.onchainAskBounds?.status === "available" ? context.onchainAskBounds.minAskPrice : "unavailable"}`);
    console.log(`  max_ask=${context.onchainAskBounds?.status === "available" ? context.onchainAskBounds.maxAskPrice : "unavailable"}`);
    console.log(`  likely_cause=${compact(abort.likelyCause)}`);
    console.log(`  ask_side_inference=${formatAskSide(representative.askSide)}`);
  }
}

function printSummary(results) {
  const failures = results.filter((result) => result.preflight.status === "failed");
  const successes = results.filter((result) => result.preflight.status === "passed");
  const code7Count = failures.filter((result) => result.preflight.abort.knownReason === "EAskPriceOutOfBounds").length;
  const otherAbortCounts = countBy(
    failures.filter((result) => result.preflight.abort.knownReason !== "EAskPriceOutOfBounds"),
    (result) => abortClass(result.preflight.abort),
  );
  const askSideCounts = countBy(failures.filter((result) => result.askSide), (result) => result.askSide.side);
  const familyCounts = countBy(results, (result) => result.attempt.family ?? "unknown");

  console.log("\nMint preflight abort analysis summary");
  console.log(`preflight attempts: ${results.length}`);
  console.log(`preflight successes: ${successes.length}`);
  console.log(`code 7 count: ${code7Count}`);
  console.log(`non-code-7 counts by class: ${formatCounts(otherAbortCounts)}`);
  console.log(`below-min inference count: ${askSideCounts.get("below_min") ?? 0}`);
  console.log(`above-max inference count: ${askSideCounts.get("above_max") ?? 0}`);
  console.log(`unknown inference count: ${askSideCounts.get("unknown") ?? 0}`);
  console.log(`candidate families tested: ${formatCounts(familyCounts)}`);

  const best = successes[0];

  if (!best) {
    console.log("mintable candidate found: no");
    console.log("best candidate: none");
    return;
  }

  console.log("mintable candidate found: yes");
  console.log(
    `best candidate: oracle=${best.attempt.oracleId} expiry=${best.attempt.expiry} lower=${best.attempt.lowerStrike} higher=${best.attempt.higherStrike} quantity=${best.attempt.quantity} mint_cost=${best.attempt.mintCostAtomic} family=${best.attempt.family ?? "unknown"}`,
  );
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

function abortClass(abort) {
  return `${abort.module ?? "unknown"}::${abort.function ?? "unknown"}::${abort.code ?? "unknown"}::${abort.constantName ?? "unknown"}`;
}

function formatAskSide(askSide) {
  if (!askSide) {
    return "unknown confidence=low reason=not_available";
  }

  return `${askSide.side} confidence=${askSide.confidence} reason=${compact(askSide.reason)}`;
}

function formatCounts(counts) {
  return [...counts.entries()].map(([key, value]) => `${key}=${value}`).join(",") || "none";
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
