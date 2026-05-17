import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import {
  buildManagerRangePositionTransaction,
  buildSuiExplorerTransactionUrl,
  createDeepBookPredictServerClient,
  extractRangePositionFromMintEvent,
  parseRangeMintedEvent,
  readRangePositionQuantity,
} from "@rangepilot/sdk/deepbookPredict";

const config = DEEPBOOK_PREDICT_TESTNET;
const knownMint = {
  digest: "3XoGAs2NgEMbkn59y9KrRGsRbicBvTN6po5gmTsoHARe",
  managerId: "0x6f341e107a87812fd4fddfc4fc50a7e3ab5bc21cabff2cd39dd86b662fa75599",
  trader: "0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5",
  oracleId: "0xe66aabab334efda1e9650d0ad26557bcfb28fa6012e267ec3bf7cdc71ff59084",
  underlying: "BTC",
  expiry: "1779004800000",
  lowerStrike: "78194000000000",
  higherStrike: "78204000000000",
  mintedQuantity: "1000",
  expectedActiveQuantity: "1000",
  mintCostAtomic: "10",
};
const forbiddenTargets = [
  "mint_range",
  "redeem_range",
  "::supply",
  "::withdraw",
  "::deposit",
  "create_manager",
  "signAndExecuteTransaction",
  "executeTransactionBlock",
];

main().catch((error) => {
  console.error("Portfolio readback validation failed:", sanitizeError(error));
  process.exitCode = 1;
});

async function main() {
  assertTestnetConfig();
  const options = parseArgs(process.argv.slice(2));
  const digest = options.digest ?? knownMint.digest;
  const managerId = options.manager ?? knownMint.managerId;
  const oracleId = options.oracle ?? knownMint.oracleId;
  const expiry = options.expiry ?? knownMint.expiry;
  const lowerStrike = options.lower ?? knownMint.lowerStrike;
  const higherStrike = options.higher ?? knownMint.higherStrike;
  const mintedQuantity = options.quantity ?? knownMint.mintedQuantity;
  const expectedActiveQuantity = options["expected-active-quantity"] ?? knownMint.expectedActiveQuantity;
  const exactActiveQuantityRequired = Object.hasOwn(options, "expected-active-quantity");
  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });
  const server = createDeepBookPredictServerClient({ config });

  console.log("Mode: portfolio-readback");
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);
  console.log("No write transactions submitted.");
  console.log(`Mint digest: ${digest}`);
  console.log(`Explorer: ${buildSuiExplorerTransactionUrl(digest, config.network)}`);
  console.log(`Minted quantity: ${mintedQuantity}`);
  console.log(`Expected active quantity: ${exactActiveQuantityRequired ? expectedActiveQuantity : `${expectedActiveQuantity} (default upper bound check)`}`);

  const tx = await client.getTransactionBlock({
    digest,
    options: { showEvents: true, showEffects: true },
  });
  const mintedEvent = parseRangeMintedEvent(tx, config);
  const eventPosition = mintedEvent ? extractRangePositionFromMintEvent(mintedEvent, digest) : null;
  const eventCheck = verifyEventPosition(eventPosition, {
    managerId,
    oracleId,
    expiry,
    lowerStrike,
    higherStrike,
    quantity: mintedQuantity,
    mintCostAtomic: knownMint.mintCostAtomic,
  });

  console.log(`RangeMinted event: ${eventCheck.matched ? "matched" : "blocked"}`);
  if (!eventCheck.matched) {
    for (const blocker of eventCheck.blockers) {
      console.log(`event blocker: ${blocker}`);
    }
    process.exitCode = 1;
    return;
  }

  const sender = options.sender ?? mintedEvent?.fields?.trader ?? knownMint.trader;
  console.log(`DevInspect sender: ${sender}`);

  const managerSummary = await tryRead("manager summary", () => server.getManagerSummary(managerId));
  const positionsSummary = await tryRead("positions summary", () => server.getManagerPositionsSummary(managerId));
  const managerPnl = await tryRead("manager pnl", () => server.getManagerPnl(managerId, "ALL"));
  const rangeHistory = await tryRead("range mint history", () => server.getRangeMints({ manager_id: managerId, oracle_id: oracleId }));
  const oracleTrades = await tryRead("oracle trades", () => server.getOracleTrades(oracleId));

  console.log(`manager summary: ${formatReadResult(managerSummary)}`);
  console.log(`positions summary: ${formatReadResult(positionsSummary)}`);
  console.log(`manager pnl: ${formatReadResult(managerPnl)}`);
  console.log(`range history: ${formatReadResult(rangeHistory)} match=${containsMatchingRecord(rangeHistory.value, { managerId, oracleId, expiry, lowerStrike, higherStrike, quantity: mintedQuantity }) ? "yes" : "no"}`);
  console.log(`trade history: ${formatReadResult(oracleTrades)} match=${containsMatchingRecord(oracleTrades.value, { managerId, oracleId, expiry, lowerStrike, higherStrike, quantity: mintedQuantity }) ? "yes" : "no"}`);

  const rangeParams = { managerId, oracleId, expiry, lowerStrike, higherStrike, config };
  assertNoForbiddenTargets(buildManagerRangePositionTransaction(rangeParams));
  const directFirst = await directRead("Direct range_position read #1", () => readRangePositionQuantity({ ...rangeParams, client, sender }));
  const directSecond = await directRead("Direct range_position read #2", () => readRangePositionQuantity({ ...rangeParams, client, sender }));
  const activeQuantityCheck = checkActiveQuantity({
    first: directFirst?.quantity ?? null,
    second: directSecond?.quantity ?? null,
    mintedQuantity,
    expectedActiveQuantity,
    exactActiveQuantityRequired,
  });

  console.log(`Active quantity: ${directFirst?.quantity ?? "unavailable"}`);
  console.log(`Stability: ${activeQuantityCheck.passed ? "passed" : "blocked"}`);
  for (const blocker of activeQuantityCheck.blockers) {
    console.log(`direct read blocker: ${blocker}`);
  }

  const directPassed = activeQuantityCheck.passed;

  if (!directPassed) {
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      options[key] = "true";
      continue;
    }

    options[key] = value;
    index += 1;
  }

  return options;
}

function assertTestnetConfig() {
  if (config.network !== "testnet" || !config.publicServer.includes("testnet")) {
    throw new Error("Portfolio readback validation is only allowed against Sui Testnet config.");
  }
}

function verifyEventPosition(position, expected) {
  const blockers = [];

  if (!position) {
    return { matched: false, blockers: ["RangeMinted event was not found or did not normalize to a range position."] };
  }

  const checks = [
    ["managerId", position.managerId, expected.managerId],
    ["oracleId", position.oracleId, expected.oracleId],
    ["expiry", position.expiry, expected.expiry],
    ["lowerStrike", position.lowerStrike, expected.lowerStrike],
    ["higherStrike", position.higherStrike, expected.higherStrike],
    ["quantity", position.quantity, expected.quantity],
    ["costAtomic", position.costAtomic, expected.mintCostAtomic],
  ];

  for (const [label, actual, expectedValue] of checks) {
    if (actual !== expectedValue) {
      blockers.push(`${label} mismatch: expected ${expectedValue}, got ${actual ?? "null"}.`);
    }
  }

  return { matched: blockers.length === 0, blockers };
}

function checkActiveQuantity({ first, second, mintedQuantity, expectedActiveQuantity, exactActiveQuantityRequired }) {
  const blockers = [];

  if (first === null || second === null) {
    blockers.push("Both direct range_position reads must decode.");
    return { passed: false, blockers };
  }

  if (first !== second) {
    blockers.push(`Direct range_position reads differed: first ${first}, second ${second}.`);
  }

  if (exactActiveQuantityRequired && first !== expectedActiveQuantity) {
    blockers.push(`Active quantity mismatch: expected ${expectedActiveQuantity}, got ${first}.`);
  }

  if (!exactActiveQuantityRequired) {
    const active = parseNonNegativeInteger(first);
    const minted = parseNonNegativeInteger(mintedQuantity);

    if (active === null || minted === null) {
      blockers.push(`Active or minted quantity was not a non-negative integer: active ${first}, minted ${mintedQuantity}.`);
    } else if (active > minted) {
      blockers.push(`Active quantity ${first} exceeds original minted quantity ${mintedQuantity}.`);
    }
  }

  return { passed: blockers.length === 0, blockers };
}

async function tryRead(source, read) {
  try {
    return { source, status: "success", value: await read() };
  } catch (error) {
    return { source, status: "error", error: sanitizeError(error) };
  }
}

async function directRead(label, read) {
  try {
    const result = await read();
    console.log(`${label}: quantity=${result.quantity}`);
    return result;
  } catch (error) {
    console.log(`${label}: blocked ${sanitizeError(error)}`);
    return null;
  }
}

function formatReadResult(result) {
  if (result.status === "error") {
    return `error=${result.error}`;
  }

  if (Array.isArray(result.value)) {
    return `count=${result.value.length}`;
  }

  if (isRecord(result.value)) {
    const keys = Object.keys(result.value);
    return `keys=${keys.length > 0 ? keys.join(",") : "none"}`;
  }

  return `value=${String(result.value)}`;
}

function containsMatchingRecord(value, expected) {
  const records = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];

  return records.some((record) => isRecord(record) && recordMatches(record, expected));
}

function recordMatches(record, expected) {
  const normalized = normalizeRecord(record);
  return [
    expected.managerId,
    expected.oracleId,
    expected.expiry,
    expected.lowerStrike,
    expected.higherStrike,
    expected.quantity,
  ].every((value) => normalized.has(value));
}

function normalizeRecord(record) {
  const values = new Set();

  for (const value of Object.values(record)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
      values.add(String(value));
    }
  }

  return values;
}

function parseNonNegativeInteger(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  return BigInt(value);
}

function assertNoForbiddenTargets(tx) {
  const txData = JSON.stringify(tx.getData());
  const forbidden = forbiddenTargets.filter((target) => txData.includes(target));

  if (forbidden.length > 0) {
    throw new Error(`Readback transaction contained forbidden target(s): ${forbidden.join(", ")}`);
  }
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
