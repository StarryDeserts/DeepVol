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
  devInspectAskBounds,
} from "@rangepilot/sdk/deepbookPredict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");
const config = DEEPBOOK_PREDICT_TESTNET;

main().catch((error) => {
  console.error("Ask bounds investigation failed:", sanitizeError(error));
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

  console.log("Mode: ask bounds investigation");
  console.log(`Signer address: ${address}`);
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);

  const contexts = await loadActiveOracleContexts(server);
  const summary = {
    endpointNulls: 0,
    onchainSuccesses: 0,
    onchainFailures: 0,
    matches: 0,
    diffs: 0,
  };

  console.log(`Active oracles scanned: ${contexts.length}`);
  console.log("\nAsk bounds results");

  for (const context of contexts) {
    const endpoint = await tryRead("endpoint_ask_bounds", () => server.getOracleAskBounds(context.oracleId));
    const onchain = await devInspectAskBounds({
      client,
      sender: address,
      oracleId: context.oracleId,
      config,
    });
    const comparison = compareBounds(endpoint, onchain);

    if (endpoint.kind === "ok" && endpoint.value === null) {
      summary.endpointNulls += 1;
    }

    if (onchain.status === "available") {
      summary.onchainSuccesses += 1;
    } else {
      summary.onchainFailures += 1;
    }

    if (comparison === "match") {
      summary.matches += 1;
    }

    if (comparison === "diff") {
      summary.diffs += 1;
    }

    console.log(
      `oracle_id=${context.oracleId} underlying=${context.underlyingAsset ?? "unknown"} expiry=${context.expiry} endpoint=${formatEndpointBounds(endpoint)} onchain=${formatOnchainBounds(onchain)} comparison=${comparison}`,
    );
  }

  console.log("\nAsk bounds summary");
  console.log(`endpoint nulls: ${summary.endpointNulls}`);
  console.log(`onchain successes: ${summary.onchainSuccesses}`);
  console.log(`onchain failures: ${summary.onchainFailures}`);
  console.log(`matches: ${summary.matches}`);
  console.log(`diffs: ${summary.diffs}`);
}

async function loadActiveOracleContexts(server) {
  const oracles = await server.getOracles(config.predictId);
  const nowMs = BigInt(Date.now());
  const active = oracles.filter((oracle) => {
    const expiry = normalizeIntegerOrNull(oracle.expiry);
    return oracle.status === "active" && expiry !== null && BigInt(expiry) > nowMs;
  });

  return active.flatMap((oracle) => {
    const oracleId = stringOrNull(oracle.oracle_id);
    const expiry = normalizeIntegerOrNull(oracle.expiry);

    if (!oracleId || !expiry) {
      return [];
    }

    return [{
      oracleId,
      underlyingAsset: stringOrNull(oracle.underlying_asset),
      expiry,
    }];
  });
}

function compareBounds(endpoint, onchain) {
  if (onchain.status !== "available") {
    return "onchain_unavailable";
  }

  if (endpoint.kind !== "ok" || endpoint.value === null) {
    return "endpoint_null";
  }

  const endpointMin = findFirstNumericField(endpoint.value, ["min_ask", "minAsk", "min_ask_price", "minAskPrice", "min"]);
  const endpointMax = findFirstNumericField(endpoint.value, ["max_ask", "maxAsk", "max_ask_price", "maxAskPrice", "max"]);

  if (!endpointMin || !endpointMax) {
    return "diff";
  }

  return endpointMin === onchain.minAskPrice && endpointMax === onchain.maxAskPrice ? "match" : "diff";
}

function formatEndpointBounds(endpoint) {
  if (endpoint.kind === "error") {
    return `error:${endpoint.message}`;
  }

  if (endpoint.value === null) {
    return "null";
  }

  const min = findFirstNumericField(endpoint.value, ["min_ask", "minAsk", "min_ask_price", "minAskPrice", "min"]);
  const max = findFirstNumericField(endpoint.value, ["max_ask", "maxAsk", "max_ask_price", "maxAskPrice", "max"]);

  if (min && max) {
    return `min=${min},max=${max}`;
  }

  return `keys=${topLevelKeys(endpoint.value).join(",") || "none"}`;
}

function formatOnchainBounds(onchain) {
  if (onchain.status === "available") {
    return `min=${onchain.minAskPrice},max=${onchain.maxAskPrice}`;
  }

  return `abort_module=${onchain.abort.module ?? "unknown"},abort_function=${onchain.abort.function ?? "unknown"},abort_code=${onchain.abort.code ?? "unknown"},known_reason=${onchain.abort.knownReason}`;
}

function findFirstNumericField(value, fieldNames) {
  if (!isRecord(value)) {
    return null;
  }

  for (const fieldName of fieldNames) {
    const normalized = normalizeIntegerOrNull(value[fieldName]);

    if (normalized !== null) {
      return normalized;
    }
  }

  return null;
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
