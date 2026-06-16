import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1Keypair } from "@mysten/sui/keypairs/secp256r1";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import {
  RANGE_WIN_CONDITION_COPY,
  buildMintRangeTransaction,
  buildSuiExplorerTransactionUrl,
  createDeepBookPredictServerClient,
  RANGE_QUOTE_QUANTITY_SWEEP,
  deriveCandidateRanges,
  devInspectAskBounds,
  devInspectMintRangePreflight,
  inferAskBoundSide,
  parseRangeMintedEvent,
  scanRangeQuoteQuantities,
} from "@deepvol/sdk/deepbookPredict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");
const cachePath = path.join(repoRoot, ".local", "predict-manager-cache.json");
const config = DEEPBOOK_PREDICT_TESTNET;
const verifiedSignerAddress = "0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5";
const verifiedManagerId = "0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599";
const maxMintCostAtomic = 5_000_000n;
const maxQuoteCandidates = 120;
const maxMintPreflightAttempts = 40;
const oracleStrikeGridTicks = 100_000n;
const forbiddenTargets = ["redeem_range", "::supply", "::withdraw"];

main().catch((error) => {
  console.error("Range validation failed:", sanitizeError(error));
  process.exitCode = 1;
});

async function main() {
  const mode = parseMode(process.argv.slice(2));
  assertTestnetConfig();

  const privateKey = await loadPrivateKeyFromEnvLocal();
  console.log("SUI_PRIVATE_KEY loaded: yes");

  const signer = keypairFromPrivateKey(privateKey);
  const address = signer.toSuiAddress();
  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });
  const server = createDeepBookPredictServerClient({ config });

  console.log(`Mode: ${mode}`);
  console.log(`Signer address: ${address}`);
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);

  const quoteContext = await buildQuoteContext({ server, client, address });
  printQuoteSummary(quoteContext);

  if (mode === "quote-only") {
    console.log("Quote-only mode: no mint transaction submitted.");
    return;
  }

  if (!quoteContext.gates.passed) {
    console.log("Mint skipped: safety gates did not pass.");
    return;
  }

  printMintWarning(quoteContext);
  const mintTx = buildMintRangeTransaction({
    managerId: quoteContext.managerId,
    oracleId: quoteContext.range.oracleId,
    oracleObjectId: quoteContext.oracleObjectId,
    expiry: quoteContext.range.expiry,
    lowerStrike: quoteContext.range.lowerStrike,
    higherStrike: quoteContext.range.higherStrike,
    quantity: quoteContext.quantity,
    config,
    allowRealTestnetMint: true,
  });
  assertNoForbiddenTargets(mintTx, "mint_range");

  const mintResult = await client.signAndExecuteTransaction({
    transaction: mintTx,
    signer,
    options: executionOptions(),
  });
  requireSuccess(mintResult, "mint_range");

  const explorerUrl = buildSuiExplorerTransactionUrl(mintResult.digest, config.network);
  const mintedEvent = parseRangeMintedEvent(mintResult, config);
  const refreshedManagerSummary = await tryRead("manager_summary_after_mint", () =>
    server.getManagerSummary(quoteContext.managerId),
  );
  const refreshedPositionsSummary = await tryRead("positions_summary_after_mint", () =>
    server.getManagerPositionsSummary(quoteContext.managerId),
  );

  console.log("\nMint validation summary");
  console.log("executed: yes");
  console.log(`digest: ${mintResult.digest}`);
  console.log(`explorer: ${explorerUrl}`);
  console.log(`RangeMinted event: ${mintedEvent ? JSON.stringify(eventShape(mintedEvent)) : "not found"}`);
  console.log(`manager summary readback: ${formatReadResult(refreshedManagerSummary)}`);
  console.log(`positions summary readback: ${formatReadResult(refreshedPositionsSummary)}`);
}

async function buildQuoteContext({ server, client, address }) {
  const blockers = [];
  const managerId = await resolveManagerId(address);
  const managerSummary = await server.getManagerSummary(managerId);
  const managerOwner = isRecord(managerSummary) && typeof managerSummary.owner === "string"
    ? managerSummary.owner
    : null;
  const managerBalanceAtomic = findDusdcManagerBalance(managerSummary);

  if (managerOwner !== address) {
    blockers.push(`Manager owner mismatch or unavailable: expected ${address}, got ${managerOwner ?? "unknown"}.`);
  }

  if (managerBalanceAtomic === null) {
    blockers.push("Manager DUSDC balance was not readable from public server summary.");
  }

  const oracleContexts = await loadActiveOracleContexts({ server, client, address });
  const allCandidates = oracleContexts.flatMap((context) => context.candidates);
  const candidates = rankCandidates(allCandidates).slice(0, maxQuoteCandidates);
  const quoteAttempts = candidates.length > 0
    ? await scanRangeQuoteQuantities({
        candidates,
        client,
        sender: address,
        quantities: RANGE_QUOTE_QUANTITY_SWEEP,
        config,
      })
    : [];
  const quoteableCandidates = rankQuoteableAttempts(
    quoteAttempts.filter((attempt) => attempt.status === "success"),
  );
  const selectedQuote = await selectPreflightPassingQuote({
    quoteableCandidates,
    oracleContexts,
    managerBalanceAtomic,
    managerId,
    client,
    address,
  });
  const quote = selectedQuote?.quote ?? quoteableCandidates[0] ?? null;
  const mintPreflightFromSelection = selectedQuote?.mintPreflight ?? null;
  const selectedOracleContext = quote
    ? oracleContexts.find((context) => context.oracleId === quote.oracleId) ?? null
    : oracleContexts[0] ?? null;
  const askBounds = selectedOracleContext?.endpointAskBounds ?? { kind: "error", source: "oracle_ask_bounds", message: "No oracle ID available." };
  const onchainAskBounds = selectedOracleContext?.onchainAskBounds ?? null;
  const activeOracle = selectedOracleContext
    ? {
        oracleId: selectedOracleContext.oracleId,
        oracleObjectId: selectedOracleContext.oracleId,
        underlyingAsset: selectedOracleContext.underlyingAsset,
        status: selectedOracleContext.status,
        expiry: selectedOracleContext.expiry,
      }
    : null;
  const strikeGrid = selectedOracleContext
    ? {
        minStrike: selectedOracleContext.minStrike,
        tickSize: selectedOracleContext.tickSize,
        source: "public_server_oracle_metadata",
      }
    : null;
  const range = quote
    ? {
        oracleId: quote.oracleId,
        expiry: quote.expiry,
        lowerStrike: quote.lowerStrike,
        higherStrike: quote.higherStrike,
        widthTicks: quote.widthTicks,
        anchorSource: quote.anchorSource,
        anchorPrice: quote.anchorPrice,
        strategy: quote.strategy,
        quantity: quote.quantity,
      }
    : null;

  if (oracleContexts.length === 0) {
    blockers.push("No active unexpired oracle was discovered at runtime.");
  }

  if (allCandidates.length === 0) {
    blockers.push("No market-centered candidate ranges could be derived from active oracle spot/forward data.");
  }

  if (!activeOracle?.oracleId || !activeOracle.oracleObjectId) {
    blockers.push("Runtime oracle ID was not available.");
  }

  if (activeOracle?.status !== "active") {
    blockers.push(`Selected oracle status is not active: ${activeOracle?.status ?? "unknown"}.`);
  }

  if (!activeOracle?.expiry) {
    blockers.push("Selected oracle expiry was not readable.");
  }

  if (!strikeGrid) {
    blockers.push("Strike grid could not be derived from runtime oracle metadata.");
  }

  if (!quote) {
    blockers.push("No quoteable range candidate produced a successful get_range_trade_amounts devInspect result.");
  }

  let mintPreflight = null;

  if (quote) {
    const mintCost = BigInt(quote.mintCostAtomic);

    if (mintCost <= 0n) {
      blockers.push(`Mint cost ${quote.mintCostAtomic} must be greater than 0.`);
    }

    if (mintCost > maxMintCostAtomic) {
      blockers.push(`Mint cost ${quote.mintCostAtomic} exceeds 5 DUSDC cap.`);
    }

    if (managerBalanceAtomic !== null && BigInt(managerBalanceAtomic) < mintCost) {
      blockers.push(
        `quote valid but manager balance insufficient: manager balance ${managerBalanceAtomic} atomic DUSDC is below mint cost ${quote.mintCostAtomic}.`,
      );
    }
  }

  if (
    quote &&
    managerBalanceAtomic !== null &&
    BigInt(quote.mintCostAtomic) > 0n &&
    BigInt(quote.mintCostAtomic) <= maxMintCostAtomic &&
    BigInt(managerBalanceAtomic) >= BigInt(quote.mintCostAtomic) &&
    activeOracle?.status === "active"
  ) {
    mintPreflight = mintPreflightFromSelection ?? await inspectMintPreflight({
      quote,
      managerId,
      client,
      address,
      onchainAskBounds,
    });

    if (mintPreflight.status !== "passed") {
      blockers.push(`Full mint preflight failed: ${formatMintAbort(mintPreflight.abort)}.`);
    }
  } else if (quote) {
    blockers.push("Full mint preflight skipped because quote, balance, cap, or active-oracle gates did not pass.");
  }

  return {
    address,
    managerId,
    managerOwner,
    managerBalanceAtomic,
    managerSummaryKeys: topLevelKeys(managerSummary),
    activeOracle,
    oracleObjectId: activeOracle?.oracleObjectId ?? null,
    askBounds,
    onchainAskBounds,
    mintPreflight,
    strikeGrid,
    oracleContexts,
    quoteAttempts,
    quoteableCandidates,
    range,
    quantity: quote?.quantity ?? null,
    quote,
    gates: {
      passed: blockers.length === 0 && mintPreflight?.status === "passed",
      blockers,
    },
  };
}

async function selectPreflightPassingQuote({ quoteableCandidates, oracleContexts, managerBalanceAtomic, managerId, client, address }) {
  let fallback = null;

  for (const quote of quoteableCandidates.slice(0, maxMintPreflightAttempts)) {
    const oracleContext = oracleContexts.find((context) => context.oracleId === quote.oracleId) ?? null;

    if (!oracleContext || oracleContext.status !== "active" || managerBalanceAtomic === null) {
      continue;
    }

    const mintCost = BigInt(quote.mintCostAtomic);

    if (mintCost <= 0n || mintCost > maxMintCostAtomic || BigInt(managerBalanceAtomic) < mintCost) {
      continue;
    }

    const mintPreflight = await inspectMintPreflight({
      quote,
      managerId,
      client,
      address,
      onchainAskBounds: oracleContext.onchainAskBounds,
    });

    fallback ??= { quote, mintPreflight };

    if (mintPreflight.status === "passed") {
      return { quote, mintPreflight };
    }
  }

  return fallback;
}

async function inspectMintPreflight({ quote, managerId, client, address, onchainAskBounds }) {
  const mintPreflight = await devInspectMintRangePreflight({
    managerId,
    oracleId: quote.oracleId,
    oracleObjectId: quote.oracleObjectId,
    expiry: quote.expiry,
    lowerStrike: quote.lowerStrike,
    higherStrike: quote.higherStrike,
    quantity: quote.quantity,
    client,
    sender: address,
    config,
    candidateParams: {
      oracleId: quote.oracleId,
      oracleObjectId: quote.oracleObjectId,
      expiry: quote.expiry,
      lowerStrike: quote.lowerStrike,
      higherStrike: quote.higherStrike,
      widthTicks: quote.widthTicks,
      strategy: quote.strategy,
      family: quote.family,
      quantity: quote.quantity,
      mintCostAtomic: quote.mintCostAtomic,
      redeemPayoutAtomic: quote.redeemPayoutAtomic,
    },
  });

  if (mintPreflight.status !== "passed") {
    const askSide = inferAskBoundSide({
      abort: mintPreflight.abort,
      mintCostAtomic: quote.mintCostAtomic,
      quantity: quote.quantity,
      minAskPrice: onchainAskBounds?.status === "available" ? onchainAskBounds.minAskPrice : null,
      maxAskPrice: onchainAskBounds?.status === "available" ? onchainAskBounds.maxAskPrice : null,
    });
    mintPreflight.abort.askBoundSide = askSide;
  }

  return mintPreflight;
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
    const endpointAskBounds = oracleId ? await tryRead("oracle_ask_bounds", () => server.getOracleAskBounds(oracleId)) : null;
    const onchainAskBounds = oracleId
      ? await devInspectAskBounds({ client, sender: address, oracleId, config })
      : null;
    const oracleRecord = selectOracleRecord(oracle, oracleState);
    contexts.push(buildOracleContext(oracleRecord, oracleState, endpointAskBounds, onchainAskBounds));
  }

  return contexts;
}

function buildOracleContext(oracleRecord, oracleState, endpointAskBounds, onchainAskBounds) {
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

function rankQuoteableAttempts(attempts) {
  return [...attempts].sort((left, right) => {
    const leftCost = BigInt(left.mintCostAtomic);
    const rightCost = BigInt(right.mintCostAtomic);
    const leftSafe = leftCost > 0n && leftCost <= maxMintCostAtomic ? 0 : 1;
    const rightSafe = rightCost > 0n && rightCost <= maxMintCostAtomic ? 0 : 1;

    if (leftSafe !== rightSafe) {
      return leftSafe - rightSafe;
    }

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
  });
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

function parseMode(args) {
  const allowedModes = new Set(["--quote-only", "--mint"]);

  if (args.length !== 1 || !allowedModes.has(args[0])) {
    throw new Error("Use exactly one mode: --quote-only or --mint.");
  }

  return args[0] === "--mint" ? "mint" : "quote-only";
}

function assertTestnetConfig() {
  if (config.network !== "testnet") {
    throw new Error("DeepBook Predict config is not Sui Testnet; aborting.");
  }
}

async function resolveManagerId(address) {
  const cache = await readManagerCache();
  const cached = cache.testnet?.[address];

  if (typeof cached === "string" && cached.startsWith("0x")) {
    return cached;
  }

  if (address === verifiedSignerAddress) {
    return verifiedManagerId;
  }

  throw new Error("No verified manager ID is available for this signer.");
}

async function readManagerCache() {
  try {
    const contents = await readFile(cachePath, "utf8");
    const parsed = JSON.parse(contents);
    return isRecord(parsed) ? parsed : { testnet: {} };
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return { testnet: {} };
    }

    throw error;
  }
}

async function loadPrivateKeyFromEnvLocal() {
  const contents = await readFile(envPath, "utf8");
  const parsed = parseEnv(contents);
  const value = parsed.SUI_PRIVATE_KEY?.trim();

  if (!value) {
    throw new Error("SUI_PRIVATE_KEY is not configured in .env.local.");
  }

  return value;
}

function parseEnv(contents) {
  const env = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function keypairFromPrivateKey(privateKey) {
  let decoded;

  try {
    decoded = decodeSuiPrivateKey(privateKey);
  } catch {
    throw new Error("SUI_PRIVATE_KEY could not be decoded.");
  }

  switch (decoded.scheme) {
    case "ED25519":
      return Ed25519Keypair.fromSecretKey(decoded.secretKey);
    case "Secp256k1":
      return Secp256k1Keypair.fromSecretKey(decoded.secretKey);
    case "Secp256r1":
      return Secp256r1Keypair.fromSecretKey(decoded.secretKey);
    default:
      throw new Error(`Unsupported Sui private key scheme: ${decoded.scheme}`);
  }
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

function executionOptions() {
  return {
    showEffects: true,
    showEvents: true,
    showObjectChanges: true,
    showBalanceChanges: true,
  };
}

function requireSuccess(result, label) {
  const status = result.effects?.status;

  if (status?.status !== "success") {
    throw new Error(`${label} did not succeed: ${status?.error ?? "unknown execution error"}`);
  }
}

function assertNoForbiddenTargets(tx, label) {
  const data = JSON.stringify(tx.getData());
  const found = forbiddenTargets.find((target) => data.includes(target));

  if (found) {
    throw new Error(`${label} transaction contains forbidden target ${found}; aborting before execution.`);
  }
}

function printQuoteSummary(context) {
  console.log("\nRange quote validation");
  console.log(`signer address: ${context.address}`);
  console.log(`manager ID: ${context.managerId}`);
  console.log(`manager owner: ${context.managerOwner ?? "unknown"}`);
  console.log(`manager DUSDC balance: ${context.managerBalanceAtomic ?? "unknown"} atomic`);
  console.log(`manager summary keys: ${context.managerSummaryKeys.join(",") || "none"}`);
  console.log(`active oracles scanned: ${context.oracleContexts.length}`);
  console.log(`candidate ranges tested: ${context.quoteAttempts.length}`);
  console.log(`quoteable candidates found: ${context.quoteableCandidates.length}`);
  console.log(`active oracle: ${context.activeOracle?.oracleId ?? "none"}`);
  console.log(`oracle object candidate: ${context.oracleObjectId ?? "none"}`);
  console.log(`underlying: ${context.activeOracle?.underlyingAsset ?? "unknown"}`);
  console.log(`expiry: ${context.activeOracle?.expiry ?? "unknown"}`);
  console.log(`strike grid: ${context.strikeGrid ? `${context.strikeGrid.minStrike}/${context.strikeGrid.tickSize} (${context.strikeGrid.source})` : "unavailable"}`);
  console.log(`lower/higher strikes: ${context.range ? `${context.range.lowerStrike}/${context.range.higherStrike}` : "unavailable"}`);
  console.log(`range anchor: ${context.range ? `${context.range.anchorSource}:${context.range.anchorPrice} strategy=${context.range.strategy} widthTicks=${context.range.widthTicks}` : "unavailable"}`);
  console.log(`quantity: ${context.quantity ?? "unavailable"}`);
  console.log(`win condition: ${RANGE_WIN_CONDITION_COPY}`);
  console.log(`ask-bounds endpoint: ${formatReadResult(context.askBounds)} (diagnostic only if null)`);
  console.log(`ask-bounds onchain: ${formatOnchainAskBounds(context.onchainAskBounds)}`);
  console.log(`quote preview: ${context.quote ? `mint=${context.quote.mintCostAtomic} redeem=${context.quote.redeemPayoutAtomic}` : "blocked (no quoteable candidate)"}`);
  console.log(`mint preflight: ${formatMintPreflight(context.mintPreflight)}`);
  console.log(`safety gates: ${context.gates.passed ? "passed" : "blocked"}`);

  for (const blocker of context.gates.blockers) {
    console.log(`- ${blocker}`);
  }

  printFailureSummary(context.quoteAttempts);
}

function printFailureSummary(attempts) {
  const failures = attempts.filter((attempt) => attempt.status === "failure");
  const groups = new Map();

  for (const failure of failures) {
    const key = `${failure.abort.module ?? "unknown"}::${failure.abort.function ?? "unknown"}::${failure.abort.code ?? "unknown"}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  if (groups.size === 0) {
    return;
  }

  console.log("quote failure summary:");

  for (const [key, count] of [...groups.entries()].sort((left, right) => right[1] - left[1])) {
    console.log(`- ${key}: ${count}`);
  }
}

function printMintWarning(context) {
  console.log("\nREAL SUI TESTNET MINT WARNING");
  console.log("Submitting one predict::mint_range<DUSDC> transaction because quote gates and full mint preflight passed.");
  console.log(`Mint cost: ${context.quote.mintCostAtomic} atomic DUSDC.`);
  console.log("Forbidden actions remain blocked: redeem_range, supply, withdraw, mainnet.");
}

function formatReadResult(result) {
  if (result.kind === "error") {
    return `error (${result.source}: ${result.message})`;
  }

  if (result.value === null) {
    return `${result.source}: null`;
  }

  if (isRecord(result.value) || Array.isArray(result.value)) {
    return `${result.source}: keys=${topLevelKeys(result.value).join(",") || "none"}`;
  }

  return `${result.source}: ${String(result.value)}`;
}

function formatOnchainAskBounds(result) {
  if (!result) {
    return "unavailable";
  }

  if (result.status === "available") {
    return `min=${result.minAskPrice} max=${result.maxAskPrice}`;
  }

  return `unavailable (${formatMintAbort(result.abort)})`;
}

function formatMintPreflight(result) {
  if (!result) {
    return "skipped";
  }

  if (result.status === "passed") {
    return "passed";
  }

  return `failed (${formatMintAbort(result.abort)})`;
}

function formatMintAbort(abort) {
  const candidateParams = abort.candidateParams
    ? Object.entries(abort.candidateParams).map(([key, value]) => `${key}=${value}`).join(",")
    : "none";
  const askSide = abort.askBoundSide
    ? `${abort.askBoundSide.side}/${abort.askBoundSide.confidence}: ${abort.askBoundSide.reason}`
    : "unknown";

  return [
    `${abort.module ?? "unknown"}::${abort.function ?? "unknown"}`,
    `code=${abort.code ?? "unknown"}`,
    `constant=${abort.constantName ?? "unknown"}`,
    `reason=${abort.knownReason}`,
    `likely_cause=${abort.likelyCause ?? "unknown"}`,
    `candidate_params=${candidateParams}`,
    `ask_side_inference=${askSide}`,
  ].join(" ");
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

  return numericAtomicString(matchingQuoteBalance.balance);
}

function numericAtomicString(value) {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return value;
  }

  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }

  return null;
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

function topLevelKeys(value) {
  if (!isRecord(value) && !Array.isArray(value)) {
    return [];
  }

  return Object.keys(value).slice(0, 24);
}

function eventShape(event) {
  return {
    type: event.type,
    parsedJsonKeys: event.parsedJson ? Object.keys(event.parsedJson).slice(0, 24) : [],
  };
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/suiprivkey1[0-9a-z]+/gi, "[redacted-sui-private-key]");
}
