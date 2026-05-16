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
  createDeepBookPredictServerClient,
  deriveCandidateRanges,
  scanQuoteableRanges,
} from "@rangepilot/sdk/deepbookPredict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");
const config = DEEPBOOK_PREDICT_TESTNET;
const quantity = "1";
const maxMintCostAtomic = 5_000_000n;

main().catch((error) => {
  console.error("Quoteable range scan failed:", sanitizeError(error));
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

  console.log("Mode: quoteability scan");
  console.log(`Signer address: ${address}`);
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);

  const activeOracleContexts = await loadActiveOracleContexts(server);
  const candidates = activeOracleContexts.flatMap((context) => context.candidates);

  console.log(`Active oracles scanned: ${activeOracleContexts.length}`);
  console.log(`Candidate ranges tested: ${candidates.length}`);

  if (candidates.length === 0) {
    printOracleBlockers(activeOracleContexts);
    console.log("Quoteable candidates found: 0");
    return;
  }

  const attempts = await scanQuoteableRanges({
    candidates,
    client,
    sender: address,
    quantity,
    config,
  });
  const successes = attempts.filter((attempt) => attempt.status === "success");
  const ranked = rankQuoteableAttempts(successes);

  printOracleSummary(activeOracleContexts);
  printQuoteableCandidates(ranked);
  printFailureSummary(attempts);
}

async function loadActiveOracleContexts(server) {
  const oracles = await server.getOracles(config.predictId);
  const nowMs = Date.now();
  const active = oracles.filter((oracle) => {
    return oracle.status === "active" && normalizeIntegerOrNull(oracle.expiry) !== null && BigInt(normalizeIntegerOrNull(oracle.expiry)) > BigInt(nowMs);
  });
  const contexts = [];

  for (const oracle of active) {
    const oracleId = stringOrNull(oracle.oracle_id);
    const oracleState = oracleId ? await tryRead("oracle_state", () => server.getOracleState(oracleId)) : null;
    const oracleRecord = selectOracleRecord(oracle, oracleState);
    const latestPrice = isRecord(oracleState?.value?.latest_price) ? oracleState.value.latest_price : null;
    const context = buildOracleContext(oracleRecord, latestPrice);
    contexts.push(context);
  }

  return contexts;
}

function buildOracleContext(oracleRecord, latestPrice) {
  const blockers = [];
  const oracleId = stringOrNull(oracleRecord?.oracle_id);
  const expiry = normalizeIntegerOrNull(oracleRecord?.expiry);
  const minStrike = normalizeIntegerOrNull(oracleRecord?.min_strike);
  const tickSize = normalizeIntegerOrNull(oracleRecord?.tick_size);
  const spot = normalizeIntegerOrNull(latestPrice?.spot);
  const forward = normalizeIntegerOrNull(latestPrice?.forward);
  const underlyingAsset = stringOrNull(oracleRecord?.underlying_asset);

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
    expiry: expiry ?? "unknown",
    minStrike: minStrike ?? "unknown",
    tickSize: tickSize ?? "unknown",
    spot,
    forward,
    blockers,
    candidates,
  };
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
    return leftWidth < rightWidth ? -1 : leftWidth > rightWidth ? 1 : 0;
  });
}

function printOracleSummary(contexts) {
  console.log("\nActive oracle scan summary");

  for (const context of contexts) {
    console.log(
      `- ${context.oracleId} underlying=${context.underlyingAsset ?? "unknown"} expiry=${context.expiry} spot=${context.spot ?? "unknown"} forward=${context.forward ?? "unknown"} candidates=${context.candidates.length}`,
    );

    for (const blocker of context.blockers) {
      console.log(`  blocker: ${blocker}`);
    }
  }
}

function printQuoteableCandidates(ranked) {
  console.log("\nQuoteable candidates");
  console.log(`Quoteable candidates found: ${ranked.length}`);

  for (const [index, candidate] of ranked.slice(0, 10).entries()) {
    const mintCost = BigInt(candidate.mintCostAtomic);
    const safety = mintCost <= 0n
      ? "zero-cost-blocked"
      : mintCost <= maxMintCostAtomic
        ? "mint-cap-ok"
        : "above-mint-cap";
    console.log(
      `${index + 1}. oracle=${candidate.oracleId} underlying=${candidate.underlyingAsset ?? "unknown"} expiry=${candidate.expiry} anchor=${candidate.anchorSource}:${candidate.anchorPrice} lower=${candidate.lowerStrike} higher=${candidate.higherStrike} widthTicks=${candidate.widthTicks} mint=${candidate.mintCostAtomic} redeem=${candidate.redeemPayoutAtomic} ${safety}`,
    );
  }
}

function printFailureSummary(attempts) {
  const failures = attempts.filter((attempt) => attempt.status === "failure");
  const groups = new Map();

  for (const failure of failures) {
    const key = `${failure.abort.module ?? "unknown"}::${failure.abort.function ?? "unknown"}::${failure.abort.code ?? "unknown"}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  console.log("\nFailure summary");

  if (groups.size === 0) {
    console.log("none");
    return;
  }

  for (const [key, count] of [...groups.entries()].sort((left, right) => right[1] - left[1])) {
    console.log(`- ${key}: ${count}`);
  }
}

function printOracleBlockers(contexts) {
  console.log("\nOracle blockers");

  for (const context of contexts) {
    for (const blocker of context.blockers) {
      console.log(`- ${context.oracleId}: ${blocker}`);
    }
  }
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

function selectOracleRecord(selectedOracle, oracleState) {
  if (oracleState?.kind !== "error" && isRecord(oracleState?.value?.oracle)) {
    return oracleState.value.oracle;
  }

  return selectedOracle;
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
  const decoded = decodeSuiPrivateKey(privateKey);

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
