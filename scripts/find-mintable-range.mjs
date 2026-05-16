import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1Keypair } from "@mysten/sui/keypairs/secp256r1";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import {
  RANGE_QUOTE_QUANTITY_SWEEP,
  createDeepBookPredictServerClient,
  deriveCandidateRanges,
  devInspectMintRangePreflight,
  scanRangeQuoteQuantities,
} from "@rangepilot/sdk/deepbookPredict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");
const cachePath = path.join(repoRoot, ".local", "predict-manager-cache.json");
const config = DEEPBOOK_PREDICT_TESTNET;
const verifiedSignerAddress = "0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5";
const verifiedManagerId = "0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599";
const maxMintCostAtomic = 5_000_000n;
const maxQuoteCandidates = 120;
const maxMintPreflightAttempts = 40;

main().catch((error) => {
  console.error("Mintable range scan failed:", sanitizeError(error));
  process.exitCode = 1;
});

async function main() {
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
  const managerId = await resolveManagerId(address);
  const managerSummary = await server.getManagerSummary(managerId);
  const managerBalanceAtomic = findDusdcManagerBalance(managerSummary);

  console.log("Mode: mintable range scan");
  console.log(`Signer address: ${address}`);
  console.log(`Manager ID: ${managerId}`);
  console.log(`Manager DUSDC balance: ${managerBalanceAtomic ?? "unknown"} atomic`);
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);
  console.log(`Quantities tested: ${RANGE_QUOTE_QUANTITY_SWEEP.join(",")}`);
  console.log(`Max quote candidates: ${maxQuoteCandidates}`);
  console.log(`Max mint preflight attempts: ${maxMintPreflightAttempts}`);

  const oracleContexts = await loadActiveOracleContexts(server);
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
    if (attempt.status === "failure") {
      classified.push({
        attempt,
        classification: "quote_abort",
        preflight: null,
      });
      continue;
    }

    const mintCost = BigInt(attempt.mintCostAtomic);

    if (mintCost <= 0n) {
      classified.push({
        attempt,
        classification: "quote_zero_cost",
        preflight: null,
      });
      continue;
    }

    const context = oracleContexts.find((item) => item.oracleId === attempt.oracleId) ?? null;
    const quoteAllowed = mintCost <= maxMintCostAtomic &&
      managerBalanceAtomic !== null &&
      BigInt(managerBalanceAtomic) >= mintCost &&
      context?.status === "active";

    if (!quoteAllowed) {
      classified.push({
        attempt,
        classification: "quote_success",
        preflight: null,
      });
      continue;
    }

    preflightable.push(attempt);
  }

  const rankedPreflightable = rankQuoteAttempts(preflightable);
  const selectedForPreflight = new Set(rankedPreflightable.slice(0, maxMintPreflightAttempts).map(attemptKey));

  for (const attempt of rankedPreflightable) {
    if (!selectedForPreflight.has(attemptKey(attempt))) {
      classified.push({
        attempt,
        classification: "quote_success",
        preflight: null,
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
    });

    if (preflight.status === "passed") {
      classified.push({
        attempt,
        classification: "mint_preflight_success",
        preflight,
      });
      continue;
    }

    classified.push({
      attempt,
      classification: preflight.abort.knownReason === "EAskPriceOutOfBounds"
        ? "mint_preflight_abort_code_7"
        : "mint_preflight_other_abort",
      preflight,
    });
  }

  return classified;
}

async function loadActiveOracleContexts(server) {
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
    const oracleRecord = selectOracleRecord(oracle, oracleState);
    contexts.push(buildOracleContext(oracleRecord, oracleState));
  }

  return contexts;
}

function buildOracleContext(oracleRecord, oracleState) {
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
    ? deriveCandidateRanges({
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
    blockers,
    candidates,
  };
}

function rankCandidates(candidates) {
  return [...candidates].sort((left, right) => {
    const leftWidth = BigInt(left.widthTicks);
    const rightWidth = BigInt(right.widthTicks);

    if (left.strategy !== right.strategy) {
      return strategyPriority(left.strategy) - strategyPriority(right.strategy);
    }

    if (leftWidth !== rightWidth) {
      return leftWidth < rightWidth ? -1 : 1;
    }

    const leftAnchor = left.anchorSource === "forward" ? 0 : 1;
    const rightAnchor = right.anchorSource === "forward" ? 0 : 1;
    return leftAnchor - rightAnchor;
  });
}

function strategyPriority(strategy) {
  switch (strategy) {
    case "wide-around-anchor":
      return 0;
    case "centered":
      return 1;
    case "below-anchor":
      return 2;
    case "above-anchor":
      return 3;
    case "wide-below-anchor":
      return 4;
    case "wide-above-anchor":
      return 5;
    default:
      return 6;
  }
}

function rankQuoteAttempts(attempts) {
  return [...attempts].sort((left, right) => {
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
  });
}

function attemptKey(attempt) {
  return `${attempt.oracleId}:${attempt.expiry}:${attempt.lowerStrike}:${attempt.higherStrike}:${attempt.quantity}`;
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

    const leftCost = BigInt(left.attempt.status === "success" ? left.attempt.mintCostAtomic : "0");
    const rightCost = BigInt(right.attempt.status === "success" ? right.attempt.mintCostAtomic : "0");

    if (leftCost !== rightCost) {
      return leftCost < rightCost ? -1 : 1;
    }

    const leftWidth = BigInt(left.attempt.widthTicks);
    const rightWidth = BigInt(right.attempt.widthTicks);

    if (leftWidth !== rightWidth) {
      return leftWidth < rightWidth ? -1 : 1;
    }

    const leftQuantity = BigInt(left.attempt.quantity);
    const rightQuantity = BigInt(right.attempt.quantity);
    return leftQuantity < rightQuantity ? -1 : leftQuantity > rightQuantity ? 1 : 0;
  });
}

function printOracleSummary(contexts) {
  console.log("\nActive oracle scan summary");

  for (const context of contexts) {
    console.log(
      `- ${context.oracleId} underlying=${context.underlyingAsset ?? "unknown"} status=${context.status} expiry=${context.expiry} spot=${context.spot ?? "unknown"} forward=${context.forward ?? "unknown"} candidates=${context.candidates.length}`,
    );

    for (const blocker of context.blockers) {
      console.log(`  blocker: ${blocker}`);
    }
  }
}

function printMintabilityAttempts(ranked) {
  console.log("\nMintability candidates");
  console.log(`mintable candidates found: ${ranked.filter((entry) => entry.classification === "mint_preflight_success").length}`);

  for (const [index, entry] of ranked.slice(0, 20).entries()) {
    const attempt = entry.attempt;
    const mintCost = attempt.status === "success" ? attempt.mintCostAtomic : "";
    const redeemPayout = attempt.status === "success" ? attempt.redeemPayoutAtomic : "";
    const abort = formatAbort(entry);
    console.log(
      `${index + 1}. oracle=${attempt.oracleId} underlying=${attempt.underlyingAsset ?? "unknown"} expiry=${attempt.expiry} lower=${attempt.lowerStrike} higher=${attempt.higherStrike} widthTicks=${attempt.widthTicks} strategy=${attempt.strategy} quantity=${attempt.quantity} mint=${mintCost} redeem=${redeemPayout} classification=${entry.classification}${abort}`,
    );
  }
}

function printSummary(classified) {
  const counts = new Map();

  for (const entry of classified) {
    counts.set(entry.classification, (counts.get(entry.classification) ?? 0) + 1);
  }

  console.log("\nMintability summary");
  console.log(`attempts: ${classified.length}`);
  console.log(`quote successes: ${classified.filter((entry) => entry.attempt.status === "success").length}`);
  console.log(`zero-cost quotes: ${counts.get("quote_zero_cost") ?? 0}`);
  console.log(`positive quotes under cap: ${classified.filter(isPositiveUnderCap).length}`);
  console.log(`preflight attempts: ${(counts.get("mint_preflight_success") ?? 0) + (counts.get("mint_preflight_abort_code_7") ?? 0) + (counts.get("mint_preflight_other_abort") ?? 0)}`);
  console.log(`preflight successes: ${counts.get("mint_preflight_success") ?? 0}`);
  console.log(`code 7 failures: ${counts.get("mint_preflight_abort_code_7") ?? 0}`);
  console.log(`other preflight failures: ${counts.get("mint_preflight_other_abort") ?? 0}`);

  const best = rankClassifiedAttempts(classified).find((entry) => entry.classification === "mint_preflight_success");

  if (!best || best.attempt.status !== "success") {
    console.log("best mintable candidate: none");
    return;
  }

  console.log(
    `best mintable candidate: oracle=${best.attempt.oracleId} quantity=${best.attempt.quantity} mint=${best.attempt.mintCostAtomic} redeem=${best.attempt.redeemPayoutAtomic} lower=${best.attempt.lowerStrike} higher=${best.attempt.higherStrike} strategy=${best.attempt.strategy}`,
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
    return ` abort_module=${abort.module ?? "unknown"} abort_function=${abort.function ?? "unknown"} abort_code=${abort.code ?? "unknown"} known_reason=${abort.knownReason}`;
  }

  if (entry.attempt.status === "failure") {
    return ` abort_module=${entry.attempt.abort.module ?? "unknown"} abort_function=${entry.attempt.abort.function ?? "unknown"} abort_code=${entry.attempt.abort.code ?? "unknown"}`;
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

function assertTestnetConfig() {
  if (config.network !== "testnet") {
    throw new Error("DeepBook Predict config is not Sui Testnet; aborting.");
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

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/suiprivkey1[0-9a-z]+/gi, "[redacted-sui-private-key]");
}
