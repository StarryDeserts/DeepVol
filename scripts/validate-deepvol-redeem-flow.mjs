import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import {
  classifyRedeemAbort,
  devInspectBinaryQuote,
  devInspectManagerBalance,
  devInspectRedeemBinaryPosition,
  readBinaryPositionQuantity,
} from "@deepvol/sdk/deepbookPredict";
import { readMoveReceipt } from "@deepvol/sdk/deepVol";

const config = DEEPBOOK_PREDICT_TESTNET;
const knownReceipt = {
  receiptId: "0xbbc2d18447502830a96602b8f9611e834c509d6fa00abdf2061ecd1addaa35eb",
  sender: "0x60ce00b02feafce805f1c3c8a7beaf7db8e903d73610fb232ad928d31fcd9349",
  predictManagerId: "0xffc0629e53bc703b60d5b135b2def3f6919bb08b5b41c137b5c8563739d6216a",
  oracleObjectId: "0xc746336e790db7e93a34b684fa3768f43a7c3171d0262d0f2c71dc0a2ab5fe22",
  expiry: "1779436800000",
  upStrike: "76796000000000",
  downStrike: "76696000000000",
  quantity: "10000",
};

main().catch((error) => {
  console.error("DeepVol redeem validation failed:", formatError(error));
  console.log("No real redeem executed.");
  process.exitCode = 1;
});

async function main() {
  const mode = parseMode(process.argv.slice(2));
  assertTestnetConfig();

  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });

  printSafetyHeader(mode);

  const readResult = await runReadMode(client);

  if (mode === "preflight") {
    await runPreflightMode(client, readResult);
  }

  console.log("\nNo real redeem executed.");
}

async function runReadMode(client) {
  const receipt = await readMoveReceipt(client, knownReceipt.receiptId);
  const managerId = receipt.predictManagerId || knownReceipt.predictManagerId;
  const oracleObjectId = receipt.oracleId || knownReceipt.oracleObjectId;
  const expiry = receipt.expiry || knownReceipt.expiry;
  const upStrike = receipt.upStrike || receipt.upperStrike || knownReceipt.upStrike;
  const downStrike = receipt.downStrike || receipt.lowerStrike || knownReceipt.downStrike;
  const quantity = receipt.quantity || knownReceipt.quantity;
  const managerBalance = await tryRead("manager DUSDC balance", () => devInspectManagerBalance({
    client,
    sender: knownReceipt.sender,
    managerId,
    config,
  }));
  const legs = [
    { direction: "up", strike: upStrike, quantity },
    { direction: "down", strike: downStrike, quantity },
  ];
  const legResults = [];

  for (const leg of legs) {
    const position = await tryRead(`${leg.direction} position`, () => readBinaryPositionQuantity({
      client,
      sender: knownReceipt.sender,
      managerId,
      oracleId: oracleObjectId,
      oracleObjectId,
      expiry,
      strike: leg.strike,
      direction: leg.direction,
      config,
    }));
    const preflightQuantity = position.status === "success"
      ? receiptScopedQuantity(position.value.quantity, leg.quantity)
      : leg.quantity;
    const quote = await tryRead(`${leg.direction} redeem payout preview`, () => devInspectBinaryQuote({
      client,
      sender: knownReceipt.sender,
      oracleId: oracleObjectId,
      oracleObjectId,
      expiry,
      strike: leg.strike,
      direction: leg.direction,
      quantity: preflightQuantity,
      config,
    }));

    legResults.push({
      direction: leg.direction,
      strike: leg.strike,
      requestedQuantity: leg.quantity,
      preflightQuantity,
      position,
      quote,
    });
  }

  printReadSummary({ receipt, managerId, oracleObjectId, expiry, managerBalance, legResults });

  return { receipt, managerId, oracleObjectId, expiry, managerBalance, legResults };
}

async function runPreflightMode(client, readResult) {
  console.log("\nRedeem preflight");
  const preflightResults = [];

  for (const leg of readResult.legResults) {
    if (leg.position.status !== "success") {
      preflightResults.push({
        direction: leg.direction,
        status: "blocked",
        reason: `Position read failed: ${leg.position.error}`,
      });
      continue;
    }

    if (BigInt(leg.position.value.quantity) === 0n) {
      preflightResults.push({
        direction: leg.direction,
        status: "blocked",
        reason: "Position quantity is zero.",
      });
      continue;
    }

    if (BigInt(leg.preflightQuantity) === 0n) {
      preflightResults.push({
        direction: leg.direction,
        status: "blocked",
        reason: "Receipt-scoped preflight quantity is zero.",
      });
      continue;
    }

    const result = await devInspectRedeemBinaryPosition({
      client,
      sender: knownReceipt.sender,
      managerId: readResult.managerId,
      oracleId: readResult.oracleObjectId,
      oracleObjectId: readResult.oracleObjectId,
      expiry: readResult.expiry,
      strike: leg.strike,
      direction: leg.direction,
      quantity: leg.preflightQuantity,
      config,
    });

    preflightResults.push({
      direction: leg.direction,
      quantity: leg.preflightQuantity,
      status: result.status,
      reason: result.status === "passed" ? null : formatAbort(result.abort),
    });
  }

  for (const result of preflightResults) {
    console.log(`${result.direction.toUpperCase()} redeem preflight: ${result.status}`);
    if (result.quantity) {
      console.log(`  receipt-scoped quantity: ${result.quantity}`);
    }
    if (result.reason) {
      console.log(`  blocker: ${result.reason}`);
    }
  }
}

function printSafetyHeader(mode) {
  console.log("DeepVol guided redeem validation");
  console.log(`mode: ${mode}`);
  console.log("network: Sui Testnet");
  console.log(`receipt: ${knownReceipt.receiptId}`);
  console.log(`sender: ${knownReceipt.sender}`);
  console.log("safety: read/devInspect only; no signing; no execution; no publish; no withdraw; no mainnet");
}

function printReadSummary({ receipt, managerId, oracleObjectId, expiry, managerBalance, legResults }) {
  console.log("\nReceipt readback");
  console.log(`receipt_id: ${receipt.receiptId}`);
  console.log(`owner: ${receipt.owner}`);
  console.log(`series_id: ${receipt.seriesId}`);
  console.log(`predict_manager_id: ${managerId}`);
  console.log(`oracle_id: ${oracleObjectId}`);
  console.log(`expiry: ${expiry}`);
  console.log(`quantity: ${receipt.quantity}`);
  console.log(`status: ${receipt.status}`);
  console.log(`manager_dusdc_balance: ${formatReadResult(managerBalance, (value) => value.balanceAtomic)}`);

  console.log("\nBinary position and payout preview");
  for (const leg of legResults) {
    console.log(`${leg.direction.toUpperCase()} strike: ${leg.strike}`);
    console.log(`  receipt quantity: ${leg.requestedQuantity}`);
    console.log(`  manager position: ${formatReadResult(leg.position, (value) => value.quantity)}`);
    console.log(`  receipt-scoped preflight quantity: ${leg.preflightQuantity}`);
    console.log(`  redeem payout preview: ${formatReadResult(leg.quote, (value) => value.redeemPayoutAtomic)}`);
  }
}

async function tryRead(label, read) {
  try {
    return { status: "success", value: await read() };
  } catch (error) {
    return { status: "blocked", error: `${label}: ${formatError(error)}` };
  }
}

function formatReadResult(result, formatValue) {
  if (result.status !== "success") {
    return `blocked (${result.error})`;
  }

  return formatValue(result.value);
}

function receiptScopedQuantity(managerPositionQuantityAtomic, receiptQuantityAtomic) {
  const managerQuantity = BigInt(managerPositionQuantityAtomic);
  const receiptQuantity = BigInt(receiptQuantityAtomic);
  return (managerQuantity < receiptQuantity ? managerQuantity : receiptQuantity).toString();
}

function parseMode(args) {
  const modeIndex = args.indexOf("--mode");
  const mode = modeIndex >= 0 ? args[modeIndex + 1] : "read";

  if (mode !== "read" && mode !== "preflight") {
    throw new Error(`Unsupported mode ${mode}. Use --mode read or --mode preflight.`);
  }

  return mode;
}

function assertTestnetConfig() {
  if (config.network !== "testnet" || !config.publicServer.includes("testnet")) {
    throw new Error("DeepVol redeem validation is restricted to the configured Sui Testnet DeepBook Predict config.");
  }
}

function formatAbort(abort) {
  return abort.constantName
    ? `${abort.constantName}: ${abort.message}`
    : abort.likelyCause
      ? `${abort.message} (${abort.likelyCause})`
      : abort.message;
}

function formatError(error) {
  if (error && typeof error === "object" && "abort" in error) {
    return formatAbort(error.abort);
  }

  const message = error instanceof Error ? error.message : String(error);
  return formatAbort(classifyRedeemAbort(message));
}
