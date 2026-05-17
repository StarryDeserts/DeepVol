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
  buildRedeemRangeTransaction,
  buildSuiExplorerTransactionUrl,
  createDeepBookPredictServerClient,
  devInspectRangeQuote,
  devInspectRedeemRangePreflight,
  extractRangePositionFromMintEvent,
  isRedeemPreflightPassed,
  parseRangeMintedEvent,
  parseRangeRedeemedEvent,
  readRangePositionQuantity,
} from "@rangepilot/sdk/deepbookPredict";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");
const config = DEEPBOOK_PREDICT_TESTNET;
const knownRange = {
  mintDigest: "3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe",
  managerId: "0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599",
  trader: "0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5",
  oracleId: "0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084",
  oracleObjectId: "0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084",
  underlying: "BTC",
  expiry: "1779004800000",
  lowerStrike: "78194000000000",
  higherStrike: "78204000000000",
  mintedQuantity: "1000",
};
const redeemQuantitySweep = ["1", "10", "100", "500", "1000"];
const forbiddenTargets = [
  "mint_range",
  "::supply",
  "::withdraw",
  "::deposit",
  "create_manager",
  "transferObjects",
  "TransferObjects",
  "splitCoins",
  "SplitCoins",
  "mergeCoins",
  "MergeCoins",
];

main().catch((error) => {
  console.error("Range redeem validation failed:", sanitizeError(error));
  process.exitCode = 1;
});

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const mode = parseMode(parsed);
  assertTestnetConfig();

  const privateKey = await loadPrivateKey();
  console.log("SUI_PRIVATE_KEY loaded: yes");

  const signer = keypairFromPrivateKey(privateKey);
  const signerAddress = signer.toSuiAddress();
  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });
  const server = createDeepBookPredictServerClient({ config });

  console.log(`Mode: ${mode}`);
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);
  console.log(`Signer address: ${signerAddress}`);
  console.log(`Manager ID: ${knownRange.managerId}`);
  console.log(`Mint digest: ${knownRange.mintDigest}`);
  console.log(`Known range: ${knownRange.oracleId} ${knownRange.expiry} ${knownRange.lowerStrike}/${knownRange.higherStrike}`);

  const eventPosition = await readKnownMintPosition(client);
  verifyKnownMintPosition(eventPosition);
  console.log("RangeMinted event: matched");

  const managerBefore = await server.getManagerSummary(knownRange.managerId);
  const managerOwner = stringOrNull(managerBefore.owner);
  const managerBalanceBefore = findDusdcManagerBalance(managerBefore);

  if (managerOwner !== signerAddress) {
    throw new Error(`Manager owner mismatch: expected signer ${signerAddress}, got ${managerOwner ?? "unknown"}.`);
  }

  console.log(`manager summary before: keys=${topLevelKeys(managerBefore).join(",") || "none"}`);
  console.log(`manager owner before: ${managerOwner}`);
  console.log(`manager DUSDC balance before: ${managerBalanceBefore ?? "unknown"}`);

  const beforePosition = await readRangePositionQuantity({
    ...knownRangeParams(),
    client,
    sender: signerAddress,
    config,
  });
  const beforeQuantity = beforePosition.quantity;
  console.log(`range_position before: ${beforeQuantity}`);

  if (BigInt(beforeQuantity) === 0n) {
    throw new Error("Current range_position quantity is 0; redeem_range validation is blocked.");
  }

  if (mode === "redeem") {
    const expectedBefore = parsed["expected-before-quantity"] ?? knownRange.mintedQuantity;
    if (beforeQuantity !== expectedBefore) {
      throw new Error(`Real redeem requires active quantity ${expectedBefore}; got ${beforeQuantity}. Use --expected-before-quantity only for an intentional follow-up validation.`);
    }
  }

  const quantities = selectQuantities(parsed.quantity, beforeQuantity);
  const attempts = [];

  for (const quantity of quantities) {
    const attempt = await inspectRedeemCandidate({
      quantity,
      client,
      sender: signerAddress,
      positionQuantityBefore: beforeQuantity,
    });
    attempts.push(attempt);
    printAttempt(attempt);
  }

  const selection = selectRedeemCandidate(attempts, {
    mode,
    allowZeroPayoutRedeem: parsed["allow-zero-payout-redeem"] === true,
  });

  console.log("\nRedeem preflight summary");
  console.log(`quantities tested: ${attempts.map((attempt) => attempt.quantity).join(",") || "none"}`);
  console.log(`selected quantity: ${selection.candidate?.quantity ?? "none"}`);
  console.log(`selected redeem payout: ${selection.candidate?.redeemPayoutAtomic ?? "none"}`);
  console.log(`selection reason: ${selection.reason}`);

  if (!selection.candidate) {
    console.log("No redeem transaction submitted.");
    if (mode === "redeem") {
      process.exitCode = 1;
    }
    return;
  }

  if (mode === "preflight-only") {
    console.log("No redeem transaction submitted.");
    return;
  }

  const selected = selection.candidate;
  const freshBefore = await readRangePositionQuantity({
    ...knownRangeParams(),
    client,
    sender: signerAddress,
    config,
  });
  const freshAttempt = await inspectRedeemCandidate({
    quantity: selected.quantity,
    client,
    sender: signerAddress,
    positionQuantityBefore: freshBefore.quantity,
  });

  if (freshBefore.quantity !== beforeQuantity) {
    throw new Error(`range_position changed before signing: initial ${beforeQuantity}, fresh ${freshBefore.quantity}.`);
  }

  if (!isSelectableAttempt(freshAttempt)) {
    throw new Error(`Fresh redeem preflight did not pass for selected quantity ${selected.quantity}: ${formatAttemptStatus(freshAttempt)}.`);
  }

  if (BigInt(selected.redeemPayoutAtomic) === 0n && parsed["allow-zero-payout-redeem"] !== true) {
    throw new Error("Selected redeem payout is zero; pass --allow-zero-payout-redeem only for intentional tiny technical validation.");
  }

  const redeemTx = buildRedeemRangeTransaction({
    ...knownRangeParams(),
    quantity: selected.quantity,
    config,
    allowRealTestnetRedeem: true,
  });
  assertExpectedRedeemTransaction(redeemTx);

  console.log("\nREAL SUI TESTNET REDEEM WARNING");
  console.log("Submitting one predict::redeem_range<DUSDC> transaction because direct readback, quote attempt, and full redeem preflight passed.");
  console.log(`Redeem quantity: ${selected.quantity}.`);
  console.log(`Redeem payout: ${selected.redeemPayoutAtomic} atomic DUSDC.`);
  console.log(`Zero payout: ${BigInt(selected.redeemPayoutAtomic) === 0n ? "yes" : "no"}.`);
  console.log(`Expected active range quantity decrease: ${beforeQuantity} -> ${(BigInt(beforeQuantity) - BigInt(selected.quantity)).toString()}.`);
  console.log("Forbidden actions remain blocked: mint_range, supply, withdraw, deposit, create_manager, mainnet.");

  const result = await client.signAndExecuteTransaction({
    transaction: redeemTx,
    signer,
    options: executionOptions(),
  });
  requireSuccess(result, "redeem_range");

  const explorerUrl = buildSuiExplorerTransactionUrl(result.digest, config.network);
  const redeemedEvent = parseRangeRedeemedEvent(result, config);
  const eventCheck = verifyRedeemedEvent(redeemedEvent, selected.quantity);
  const managerAfter = await server.getManagerSummary(knownRange.managerId);
  const managerBalanceAfter = findDusdcManagerBalance(managerAfter);
  const afterPosition = await readRangePositionQuantity({
    ...knownRangeParams(),
    client,
    sender: signerAddress,
    config,
  });
  const expectedAfter = (BigInt(beforeQuantity) - BigInt(selected.quantity)).toString();

  console.log("\nRedeem validation summary");
  console.log("executed: yes");
  console.log(`digest: ${result.digest}`);
  console.log(`explorer: ${explorerUrl}`);
  console.log(`RangeRedeemed event: ${redeemedEvent ? JSON.stringify(eventShape(redeemedEvent)) : "not found"}`);
  for (const blocker of eventCheck.blockers) {
    console.log(`RangeRedeemed parser blocker: ${blocker}`);
  }
  console.log(`range_position before: ${beforeQuantity}`);
  console.log(`range_position after: ${afterPosition.quantity}`);
  console.log(`range_position expected after: ${expectedAfter}`);
  console.log(`range_position delta: ${afterPosition.quantity === expectedAfter ? "passed" : "blocked"}`);
  console.log(`manager summary after: keys=${topLevelKeys(managerAfter).join(",") || "none"}`);
  console.log(`manager DUSDC balance after: ${managerBalanceAfter ?? "unknown"}`);

  if (afterPosition.quantity !== expectedAfter) {
    throw new Error(`Post-redeem range_position mismatch: expected ${expectedAfter}, got ${afterPosition.quantity}.`);
  }

  if (!redeemedEvent) {
    throw new Error("RangeRedeemed event was not found in the submitted transaction result.");
  }
}

async function readKnownMintPosition(client) {
  const tx = await client.getTransactionBlock({
    digest: knownRange.mintDigest,
    options: { showEvents: true, showEffects: true },
  });
  const mintedEvent = parseRangeMintedEvent(tx, config);
  const position = mintedEvent ? extractRangePositionFromMintEvent(mintedEvent, knownRange.mintDigest) : null;

  if (!position) {
    throw new Error("Known RangeMinted event was not found or did not normalize to a range position.");
  }

  return position;
}

function verifyKnownMintPosition(position) {
  const checks = [
    ["managerId", position.managerId, knownRange.managerId],
    ["oracleId", position.oracleId, knownRange.oracleId],
    ["expiry", position.expiry, knownRange.expiry],
    ["lowerStrike", position.lowerStrike, knownRange.lowerStrike],
    ["higherStrike", position.higherStrike, knownRange.higherStrike],
    ["quantity", position.quantity, knownRange.mintedQuantity],
  ];

  for (const [label, actual, expected] of checks) {
    if (actual !== expected) {
      throw new Error(`Known RangeMinted ${label} mismatch: expected ${expected}, got ${actual ?? "null"}.`);
    }
  }
}

async function inspectRedeemCandidate({ quantity, client, sender, positionQuantityBefore }) {
  let quote = null;
  let quoteError = null;

  try {
    quote = await devInspectRangeQuote({
      ...knownRangeParams(),
      quantity,
      client,
      sender,
      config,
    });
  } catch (error) {
    quoteError = sanitizeError(error);
  }

  const preflight = await devInspectRedeemRangePreflight({
    ...knownRangeParams(),
    quantity,
    client,
    sender,
    config,
    candidateParams: {
      redeemQuantity: quantity,
      positionQuantityBefore,
      redeemPayoutAtomic: quote?.redeemPayoutAtomic,
    },
  });

  return {
    quantity,
    quote,
    quoteError,
    redeemPayoutAtomic: quote?.redeemPayoutAtomic ?? null,
    zeroPayout: quote ? BigInt(quote.redeemPayoutAtomic) === 0n : null,
    preflight,
  };
}

function selectQuantities(overrideQuantity, beforeQuantity) {
  const candidates = overrideQuantity ? [normalizePositiveInteger(overrideQuantity, "Redeem quantity")] : redeemQuantitySweep;
  const current = BigInt(beforeQuantity);
  return candidates.filter((quantity) => BigInt(quantity) <= current);
}

function selectRedeemCandidate(attempts, { mode, allowZeroPayoutRedeem }) {
  const selectable = attempts.filter(isSelectableAttempt);
  const positive = selectable
    .filter((attempt) => BigInt(attempt.redeemPayoutAtomic) > 0n)
    .sort(compareAttemptQuantity)[0] ?? null;

  if (positive) {
    return { candidate: positive, reason: "smallest preflight-passed quantity with positive redeem payout" };
  }

  const zero = selectable
    .filter((attempt) => attempt.quantity === "1" && BigInt(attempt.redeemPayoutAtomic) === 0n)
    .sort(compareAttemptQuantity)[0] ?? null;

  if (zero && (mode === "preflight-only" || allowZeroPayoutRedeem)) {
    return { candidate: zero, reason: "smallest preflight-passed zero-payout quantity; real redeem requires explicit zero-payout approval" };
  }

  if (zero) {
    return {
      candidate: null,
      reason: "only zero-payout quantity=1 passed preflight; real redeem blocked without --allow-zero-payout-redeem",
    };
  }

  return { candidate: null, reason: "no quantity had both decoded quote output and full redeem preflight success" };
}

function isSelectableAttempt(attempt) {
  return isRedeemPreflightPassed(attempt.preflight) && attempt.redeemPayoutAtomic !== null;
}

function compareAttemptQuantity(left, right) {
  const leftQuantity = BigInt(left.quantity);
  const rightQuantity = BigInt(right.quantity);
  return leftQuantity < rightQuantity ? -1 : leftQuantity > rightQuantity ? 1 : 0;
}

function printAttempt(attempt) {
  const quoteStatus = attempt.quote
    ? `success redeem_payout=${attempt.redeemPayoutAtomic} zero_payout=${attempt.zeroPayout ? "yes" : "no"}`
    : `failed redeem_payout=unknown zero_payout=unknown quote_error=${attempt.quoteError}`;
  const preflightStatus = attempt.preflight.status === "passed"
    ? "passed"
    : `failed ${formatRedeemAbort(attempt.preflight.abort)}`;

  console.log(`quantity=${attempt.quantity} quote=${quoteStatus} preflight=${preflightStatus}`);
}

function formatAttemptStatus(attempt) {
  if (attempt.preflight.status === "passed") {
    return "preflight=passed";
  }

  return `preflight=failed ${formatRedeemAbort(attempt.preflight.abort)}`;
}

function formatRedeemAbort(abort) {
  const candidateParams = abort.candidateParams
    ? Object.entries(abort.candidateParams).map(([key, value]) => `${key}=${value}`).join(",")
    : "none";

  return [
    `${abort.module ?? "unknown"}::${abort.function ?? "unknown"}`,
    `code=${abort.code ?? "unknown"}`,
    `constant=${abort.constantName ?? "unknown"}`,
    `reason=${abort.knownReason}`,
    `likely_cause=${abort.likelyCause ?? "unknown"}`,
    `candidate_params=${candidateParams}`,
  ].join(" ");
}

function verifyRedeemedEvent(event, quantity) {
  const blockers = [];

  if (!event) {
    return { blockers: ["RangeRedeemed event was not found."] };
  }

  const fields = event.fields;
  const checks = [
    ["managerId", fields?.managerId, knownRange.managerId],
    ["oracleId", fields?.oracleId, knownRange.oracleId],
    ["expiry", fields?.expiry, knownRange.expiry],
    ["lowerStrike", fields?.lowerStrike, knownRange.lowerStrike],
    ["higherStrike", fields?.higherStrike, knownRange.higherStrike],
    ["quantity", fields?.quantity, quantity],
  ];

  for (const [label, actual, expected] of checks) {
    if (actual !== null && actual !== undefined && actual !== expected) {
      blockers.push(`${label} mismatch: expected ${expected}, got ${actual}.`);
    }
  }

  return { blockers };
}

function assertExpectedRedeemTransaction(tx) {
  const data = tx.getData();
  const commands = Array.isArray(data.commands) ? data.commands : [];
  const moveCalls = commands
    .map((command) => command.MoveCall)
    .filter(isRecord);
  const hasRedeemRange = moveCalls.some((call) => call.module === "predict" && call.function === "redeem_range");

  if (!hasRedeemRange) {
    throw new Error("Redeem transaction does not contain predict::redeem_range; aborting before execution.");
  }

  const forbiddenMoveCalls = moveCalls.filter((call) => {
    return (
      (call.module === "predict" && ["mint_range", "supply", "withdraw"].includes(String(call.function))) ||
      (call.module === "predict_manager" && ["deposit"].includes(String(call.function))) ||
      (call.module === "predict" && call.function === "create_manager")
    );
  });

  if (forbiddenMoveCalls.length > 0) {
    const forbidden = forbiddenMoveCalls.map((call) => `${call.module}::${call.function}`);
    throw new Error(`Redeem transaction contains forbidden Move call(s): ${forbidden.join(", ")}; aborting before execution.`);
  }

  const commandKinds = commands.map((command) => command.$kind).filter((kind) => typeof kind === "string");
  const forbiddenCommandKinds = commandKinds.filter((kind) => ["TransferObjects", "SplitCoins", "MergeCoins"].includes(kind));

  if (forbiddenCommandKinds.length > 0) {
    throw new Error(`Redeem transaction contains forbidden command(s): ${forbiddenCommandKinds.join(", ")}; aborting before execution.`);
  }
}

function knownRangeParams() {
  return {
    managerId: knownRange.managerId,
    oracleId: knownRange.oracleId,
    oracleObjectId: knownRange.oracleObjectId,
    expiry: knownRange.expiry,
    lowerStrike: knownRange.lowerStrike,
    higherStrike: knownRange.higherStrike,
  };
}

function parseMode(options) {
  const preflightOnly = options["preflight-only"] === true;
  const redeem = options.redeem === true;

  if (preflightOnly === redeem) {
    throw new Error("Use exactly one mode: --preflight-only or --redeem.");
  }

  return redeem ? "redeem" : "preflight-only";
}

function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = value;
    index += 1;
  }

  return options;
}

function assertTestnetConfig() {
  if (config.network !== "testnet" || !config.publicServer.includes("testnet")) {
    throw new Error("Range redeem validation is only allowed against Sui Testnet config.");
  }
}

async function loadPrivateKey() {
  const fromEnv = process.env.SUI_PRIVATE_KEY?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const contents = await readFile(envPath, "utf8");
  const parsed = parseEnv(contents);
  const value = parsed.SUI_PRIVATE_KEY?.trim();

  if (!value) {
    throw new Error("SUI_PRIVATE_KEY is not configured in process.env or .env.local.");
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

function findDusdcManagerBalance(value) {
  if (!isRecord(value) || !Array.isArray(value.balances)) {
    return numericAtomicString(value?.trading_balance) ?? null;
  }

  const matchingQuoteBalance = value.balances.find((entry) => {
    return (
      isRecord(entry) &&
      typeof entry.quote_asset === "string" &&
      entry.quote_asset.endsWith("::dusdc::DUSDC")
    );
  });

  if (!matchingQuoteBalance || !isRecord(matchingQuoteBalance)) {
    return numericAtomicString(value.trading_balance);
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

  if (typeof value === "bigint" && value >= 0n) {
    return value.toString();
  }

  return null;
}

function normalizePositiveInteger(value, label) {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    throw new Error(`${label} must be a positive integer.`);
  }

  const integer = BigInt(value);
  if (integer <= 0n) {
    throw new Error(`${label} must be greater than 0.`);
  }

  return integer.toString();
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

function eventShape(event) {
  return {
    type: event.type,
    parsedJsonKeys: event.parsedJson ? Object.keys(event.parsedJson).slice(0, 24) : [],
    fields: event.fields,
  };
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/suiprivkey1[0-9a-z]+/gi, "[REDACTED_SUI_PRIVATE_KEY]")
    .replace(/SUI_PRIVATE_KEY\s*=\s*[^\s]+/gi, "SUI_PRIVATE_KEY=[REDACTED]")
    .replace(/mnemonic\s*=\s*[^\n]+/gi, "mnemonic=[REDACTED]");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
