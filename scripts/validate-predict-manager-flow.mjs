import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1Keypair } from "@mysten/sui/keypairs/secp256r1";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import {
  buildCreateManagerTransaction,
  buildDepositDusdcTransaction,
  buildSuiExplorerTransactionUrl,
  createDeepBookPredictServerClient,
  getDusdcBalance,
  getDusdcCoins,
  recoverPredictManagerIdFromCreateResult,
} from "@rangepilot/sdk/deepbookPredict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");
const cachePath = path.join(repoRoot, ".local", "predict-manager-cache.json");
const forbiddenTargets = ["mint_range", "redeem_range", "::supply", "::withdraw"];
const minimumDepositAtomic = 1_000_000n;
const maximumDepositAtomic = 5_000_000n;
const minimumGasMist = 100_000_000n;
const config = DEEPBOOK_PREDICT_TESTNET;

main().catch((error) => {
  console.error("Validation failed:", sanitizeError(error));
  process.exitCode = 1;
});

async function main() {
  const amountAtomic = parseDepositAmountAtomic(process.argv.slice(2));

  printWarningBanner(amountAtomic);
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

  console.log(`Signer address: ${address}`);
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);

  const suiGas = await client.getBalance({
    owner: address,
    coinType: "0x2::sui::SUI",
  });
  const suiGasMist = BigInt(suiGas.totalBalance);
  console.log(`SUI gas balance: ${suiGas.totalBalance} MIST`);

  if (suiGasMist < minimumGasMist) {
    throw new Error(
      `SUI gas balance is below ${minimumGasMist.toString()} MIST; aborting before writes.`,
    );
  }

  const beforeDusdcBalance = await getDusdcBalance(client, address, config);
  console.log(`DUSDC wallet balance before: ${beforeDusdcBalance.totalAtomic} atomic`);

  if (BigInt(beforeDusdcBalance.totalAtomic) < amountAtomic) {
    throw new Error("DUSDC wallet balance is below the requested validation deposit; aborting before writes.");
  }

  const cache = await readManagerCache();
  const cachedManagerId = cache.testnet?.[address] ?? null;
  let managerId = cachedManagerId;
  let createDigest = null;
  let createExplorerUrl = null;
  let managerRecoverySource = cachedManagerId ? "local_cache" : null;
  let cachedManagerUsable = false;

  if (cachedManagerId) {
    console.log(`Cached manager ID hint: ${cachedManagerId}`);
    const cachedReadback = await attemptReadback({
      client,
      server,
      address,
      managerId: cachedManagerId,
    });
    cachedManagerUsable = cachedReadback.kind !== "error";
    console.log(`Cached manager readback: ${formatReadback(cachedReadback)}`);

    if (!cachedManagerUsable) {
      console.log("Cached manager hint is not authoritative; creating a fresh manager for validation.");
      managerId = null;
      managerRecoverySource = null;
    }
  }

  if (!managerId) {
    const createTx = buildCreateManagerTransaction({ config });
    assertNoForbiddenTargets(createTx, "create_manager");
    console.log("Executing predict::create_manager on Sui Testnet...");

    const createResult = await client.signAndExecuteTransaction({
      transaction: createTx,
      signer,
      options: executionOptions(),
    });

    requireSuccess(createResult, "create_manager");
    createDigest = createResult.digest;
    createExplorerUrl = buildSuiExplorerTransactionUrl(createDigest, config.network);
    console.log(`create_manager digest: ${createDigest}`);
    console.log(`create_manager explorer: ${createExplorerUrl}`);

    const recovery = recoverPredictManagerIdFromCreateResult(createResult, config);
    console.log(`Manager ID recovery: ${recovery.message}`);

    if (!recovery.managerId || recovery.ambiguous) {
      throw new Error("Unable to recover a unique PredictManager ID; aborting before deposit.");
    }

    managerId = recovery.managerId;
    managerRecoverySource = recovery.source;
    await writeManagerCache(address, managerId);
    console.log(`Manager ID: ${managerId}`);
    console.log(`Manager ID recovery source: ${managerRecoverySource}`);
  }

  const depositCoins = await getDusdcCoins(client, address, config);
  const depositTx = buildDepositDusdcTransaction({
    managerId,
    amountAtomic: amountAtomic.toString(),
    coins: depositCoins,
    config,
    allowRealTestnetDeposit: true,
  });
  assertNoForbiddenTargets(depositTx, "deposit");
  console.log(`Executing predict_manager::deposit<DUSDC> for ${amountAtomic.toString()} atomic units...`);

  const depositResult = await client.signAndExecuteTransaction({
    transaction: depositTx,
    signer,
    options: executionOptions(),
  });

  requireSuccess(depositResult, "deposit");
  const depositDigest = depositResult.digest;
  const depositExplorerUrl = buildSuiExplorerTransactionUrl(depositDigest, config.network);
  console.log(`deposit digest: ${depositDigest}`);
  console.log(`deposit explorer: ${depositExplorerUrl}`);

  const afterDusdcBalance = await getDusdcBalance(client, address, config);
  const readback = await attemptReadback({ client, server, address, managerId });

  console.log("\nValidation summary");
  console.log(`address: ${address}`);
  console.log(`DUSDC wallet before: ${beforeDusdcBalance.totalAtomic} atomic`);
  console.log(`DUSDC wallet after: ${afterDusdcBalance.totalAtomic} atomic`);
  console.log(`manager ID: ${managerId}`);
  console.log(`manager recovery source: ${managerRecoverySource}`);
  console.log(`create_manager: ${createDigest ? `${createDigest} (${createExplorerUrl})` : "cached manager used"}`);
  console.log(`deposit amount: ${amountAtomic.toString()} atomic`);
  console.log(`deposit tx: ${depositDigest} (${depositExplorerUrl})`);
  console.log(`manager balance readback: ${formatReadback(readback)}`);
}

function executionOptions() {
  return {
    showEffects: true,
    showEvents: true,
    showObjectChanges: true,
    showBalanceChanges: true,
  };
}

function printWarningBanner(amountAtomic) {
  console.log("Phase 1B-Verify will execute Sui Testnet writes.");
  console.log("Allowed writes: predict::create_manager if no usable manager cache exists, and predict_manager::deposit<DUSDC>.");
  console.log(`Deposit amount: ${amountAtomic.toString()} atomic units (${formatDusdc(amountAtomic)} DUSDC).`);
  console.log("Forbidden writes: mint_range, redeem_range, supply, withdraw, and all mainnet transactions.");
}

function assertTestnetConfig() {
  if (config.network !== "testnet") {
    throw new Error("DeepBook Predict config is not Sui Testnet; aborting before writes.");
  }
}

function parseDepositAmountAtomic(args) {
  const amountArg = args.find((arg) => arg.startsWith("--amount-dusdc="));
  const amountText = amountArg ? amountArg.slice("--amount-dusdc=".length) : "1";
  const amountAtomic = decimalDusdcToAtomic(amountText);

  if (amountAtomic < minimumDepositAtomic || amountAtomic > maximumDepositAtomic) {
    throw new Error("Validation deposit must be between 1 and 5 DUSDC.");
  }

  return amountAtomic;
}

function decimalDusdcToAtomic(value) {
  const trimmed = value.trim();

  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new Error("Use --amount-dusdc with a positive decimal value and at most 6 decimals.");
  }

  const [whole, fraction = ""] = trimmed.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
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

async function readManagerCache() {
  try {
    const contents = await readFile(cachePath, "utf8");
    const parsed = JSON.parse(contents);

    return isPlainObject(parsed) ? parsed : { testnet: {} };
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return { testnet: {} };
    }

    throw error;
  }
}

async function writeManagerCache(address, managerId) {
  const cache = await readManagerCache();
  const nextCache = {
    ...cache,
    testnet: {
      ...(isPlainObject(cache.testnet) ? cache.testnet : {}),
      [address]: managerId,
    },
  };

  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(nextCache, null, 2)}\n`, "utf8");
}

async function attemptReadback({ client, server, address, managerId }) {
  const summary = await tryReadback("public_server_summary", async () => {
    const body = await server.getManagerSummary(managerId);
    return {
      kind: "public_server_summary",
      keys: topLevelKeys(body),
      balanceAtomic: findLikelyBalance(body),
      owner: isPlainObject(body) ? body.owner ?? null : null,
    };
  });

  if (summary.kind !== "error") {
    return summary;
  }

  const positions = await tryReadback("public_server_positions_summary", async () => {
    const body = await server.getManagerPositionsSummary(managerId);
    return {
      kind: "public_server_positions_summary",
      keys: topLevelKeys(body),
      balanceAtomic: findLikelyBalance(body),
    };
  });

  if (positions.kind !== "error") {
    return positions;
  }

  const inspect = await tryReadback("dev_inspect_balance", async () => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${config.packageId}::predict_manager::balance`,
      typeArguments: [config.quoteAssets.DUSDC.coinType],
      arguments: [tx.object(managerId)],
    });
    assertNoForbiddenTargets(tx, "balance devInspect");
    const result = await client.devInspectTransactionBlock({
      sender: address,
      transactionBlock: tx,
    });
    const decodedBalance = decodeDevInspectU64(result);

    if (result.error) {
      throw new Error(result.error);
    }

    return {
      kind: "dev_inspect_balance",
      balanceAtomic: decodedBalance,
      resultCount: Array.isArray(result.results) ? result.results.length : 0,
    };
  });

  if (inspect.kind !== "error") {
    return inspect;
  }

  const object = await tryReadback("object_read", async () => {
    const response = await client.getObject({
      id: managerId,
      options: { showType: true, showOwner: true, showContent: true },
    });

    if (response.error) {
      throw new Error(response.error.code ?? "Object read failed");
    }

    return {
      kind: "object_read",
      type: response.data?.type ?? null,
      owner: response.data?.owner ?? null,
      contentShape: shapeOf(response.data?.content),
    };
  });

  if (object.kind !== "error") {
    return object;
  }

  return {
    kind: "error",
    errors: [summary, positions, inspect, object].map((item) => ({
      source: item.source,
      message: item.message,
    })),
  };
}

async function tryReadback(source, read) {
  try {
    return await read();
  } catch (error) {
    return {
      kind: "error",
      source,
      message: sanitizeError(error),
    };
  }
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

function decodeDevInspectU64(result) {
  const returnValues = result.results?.flatMap((entry) => entry.returnValues ?? []) ?? [];

  if (returnValues.length !== 1) {
    return null;
  }

  const [bytes, type] = returnValues[0];

  if (type !== "u64" || !Array.isArray(bytes) || bytes.length !== 8) {
    return null;
  }

  return bytes.reduce((value, byte, index) => value + (BigInt(byte) << (8n * BigInt(index))), 0n).toString();
}

function findLikelyBalance(value) {
  const fields = [
    "trading_balance",
    "account_value",
    "balance",
    "balance_atomic",
    "dusdc_balance",
    "dusdc_balance_atomic",
    "available_balance",
    "available_balance_atomic",
  ];

  if (!isPlainObject(value)) {
    return null;
  }

  const matchingQuoteBalance = Array.isArray(value.balances)
    ? value.balances.find((entry) => {
        return (
          isPlainObject(entry) &&
          typeof entry.quote_asset === "string" &&
          entry.quote_asset.endsWith("::dusdc::DUSDC")
        );
      })
    : null;

  if (matchingQuoteBalance && isPlainObject(matchingQuoteBalance)) {
    const balance = numericAtomicString(matchingQuoteBalance.balance);

    if (balance !== null) {
      return balance;
    }
  }

  for (const field of fields) {
    const candidate = numericAtomicString(value[field]);

    if (candidate !== null) {
      return candidate;
    }
  }

  return null;
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

function topLevelKeys(value) {
  return isPlainObject(value) ? Object.keys(value).slice(0, 24) : [];
}

function shapeOf(value, depth = 0) {
  if (value === null) return "null";
  if (Array.isArray(value)) return value.length === 0 ? [] : [shapeOf(value[0], depth + 1)];
  if (typeof value !== "object") return typeof value;
  if (depth >= 2) return "object";

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 16)
      .map(([key, child]) => [key, shapeOf(child, depth + 1)]),
  );
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatReadback(readback) {
  if (readback.kind === "error") {
    return `blocked (${readback.errors.map((entry) => `${entry.source}: ${entry.message}`).join("; ")})`;
  }

  if (readback.balanceAtomic) {
    const owner = readback.owner ? ` owner=${readback.owner}` : "";
    return `${readback.kind} balance=${readback.balanceAtomic} atomic${owner}`;
  }

  if (readback.kind === "object_read") {
    return `object_read type=${readback.type ?? "unknown"}`;
  }

  if (readback.keys) {
    return `${readback.kind} keys=${readback.keys.join(",") || "none"}`;
  }

  return readback.kind;
}

function formatDusdc(amountAtomic) {
  const whole = amountAtomic / 1_000_000n;
  const fraction = (amountAtomic % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/suiprivkey1[0-9a-z]+/gi, "[redacted-sui-private-key]");
}
