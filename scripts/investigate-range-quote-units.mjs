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
  RANGE_QUOTE_QUANTITY_SWEEP,
  createDeepBookPredictServerClient,
  deriveCandidateRanges,
  scanRangeQuoteQuantities,
} from "@deepvol/sdk/deepbookPredict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");
const config = DEEPBOOK_PREDICT_TESTNET;

main().catch((error) => {
  console.error("Range quote unit investigation failed:", sanitizeError(error));
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

  console.log("Mode: range quote unit investigation");
  console.log(`Signer address: ${address}`);
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);
  console.log(`Quantities tested: ${RANGE_QUOTE_QUANTITY_SWEEP.join(",")}`);

  const contexts = await loadActiveOracleContexts(server);
  const candidates = contexts.flatMap((context) => context.candidates);
  console.log(`Active oracles scanned: ${contexts.length}`);
  console.log(`Candidate ranges tested: ${candidates.length}`);

  if (candidates.length === 0) {
    printOracleBlockers(contexts);
    return;
  }

  const attempts = await scanRangeQuoteQuantities({
    candidates,
    client,
    sender: address,
    quantities: RANGE_QUOTE_QUANTITY_SWEEP,
    config,
  });
  const successes = attempts.filter((attempt) => attempt.status === "success");

  console.log("\nRange quote quantity sweep attempts");
  for (const attempt of attempts) {
    printAttempt(attempt);
  }

  console.log("\nQuantity sweep summary");
  console.log(`attempts: ${attempts.length}`);
  console.log(`successes: ${successes.length}`);
  console.log(`failures: ${attempts.length - successes.length}`);
  printFirstNonzero(successes);
  printFailureSummary(attempts);
  printDecodeDiagnostic(successes.find((attempt) => attempt.diagnostic) ?? null);
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
    const latestPrice = isRecord(oracleState?.value?.latest_price) ? oracleState.value.latest_price : null;
    contexts.push(buildOracleContext(oracleRecord, latestPrice));
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
    blockers.push("Latest spot/forward unavailable; scanner cannot derive candidates.");
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
    spot,
    forward,
    blockers,
    candidates,
  };
}

function printAttempt(attempt) {
  if (attempt.status === "success") {
    console.log(
      `oracle_id=${attempt.oracleId} underlying=${attempt.underlyingAsset ?? "unknown"} expiry=${attempt.expiry} lower=${attempt.lowerStrike} higher=${attempt.higherStrike} width_ticks=${attempt.widthTicks} strategy=${attempt.strategy} quantity=${attempt.quantity} mint_cost=${attempt.mintCostAtomic} redeem_payout=${attempt.redeemPayoutAtomic} status=success abort_module= abort_code=`,
    );
    return;
  }

  console.log(
    `oracle_id=${attempt.oracleId} underlying=${attempt.underlyingAsset ?? "unknown"} expiry=${attempt.expiry} lower=${attempt.lowerStrike} higher=${attempt.higherStrike} width_ticks=${attempt.widthTicks} strategy=${attempt.strategy} quantity=${attempt.quantity} mint_cost= redeem_payout= status=abort abort_module=${attempt.abort.module ?? "unknown"} abort_code=${attempt.abort.code ?? "unknown"}`,
  );
}

function printFirstNonzero(successes) {
  const sorted = [...successes].sort((left, right) => {
    const leftQuantity = BigInt(left.quantity);
    const rightQuantity = BigInt(right.quantity);

    if (leftQuantity !== rightQuantity) {
      return leftQuantity < rightQuantity ? -1 : 1;
    }

    const leftCost = BigInt(left.mintCostAtomic);
    const rightCost = BigInt(right.mintCostAtomic);
    return leftCost < rightCost ? -1 : leftCost > rightCost ? 1 : 0;
  });
  const first = sorted.find((attempt) => BigInt(attempt.mintCostAtomic) > 0n);

  if (!first) {
    console.log("first nonzero mint cost: none");
    return;
  }

  console.log(`first nonzero mint cost: quantity=${first.quantity} mint=${first.mintCostAtomic} redeem=${first.redeemPayoutAtomic} oracle=${first.oracleId} lower=${first.lowerStrike} higher=${first.higherStrike} strategy=${first.strategy}`);
}

function printFailureSummary(attempts) {
  const failures = attempts.filter((attempt) => attempt.status === "failure");
  const groups = new Map();

  for (const failure of failures) {
    const key = `${failure.abort.module ?? "unknown"}::${failure.abort.function ?? "unknown"}::${failure.abort.code ?? "unknown"}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  console.log("failure summary:");

  if (groups.size === 0) {
    console.log("none");
    return;
  }

  for (const [key, count] of [...groups.entries()].sort((left, right) => right[1] - left[1])) {
    console.log(`- ${key}: ${count}`);
  }
}

function printDecodeDiagnostic(attempt) {
  console.log("return decoding diagnostics:");

  if (!attempt?.diagnostic) {
    console.log("none");
    return;
  }

  console.log(`returnValues count: ${attempt.diagnostic.returnValueCount}`);

  for (const entry of attempt.diagnostic.returns) {
    console.log(`return ${entry.index}: type=${entry.typeTag ?? "unknown"} bytes=${entry.byteLength ?? "unknown"} decoded=${entry.decodedU64 ?? "null"} status=${entry.status}`);
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
