import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import {
  buildMarketKeyTransactionArgument,
  buildSuiExplorerTransactionUrl,
  classifyMintAbort,
  createDeepBookPredictServerClient,
  deriveMarketQuoteCandidates,
  extractManagerDusdcBalanceAtomic,
  inspectDevInspectU64,
  scanBinaryQuoteSanity,
  summarizeDevInspectU64Diagnostic,
} from "@deepvol/sdk/deepbookPredict";

const execFileAsync = promisify(execFile);
const config = DEEPBOOK_PREDICT_TESTNET;
const clockObjectId = "0x6";
const defaultReadOnlySender = "0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5";
const controlledSender = "0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75";
const controlledManagerId = "0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575";
const maxOracleContexts = 2;
const readModeQuantities = ["1000", "10000", "100000"];
const maxCandidatesPerOracle = 18;
const mintGasBudgetMist = "100000000";
const minimumGasBalanceMist = 100000000n;
const maxDryRunGasBudgetMist = 500000000n;
const maxRealMintGasBudgetMist = 500000000n;
const defaultDiagnosticGasBudgetsMist = ["100000000", "200000000", "500000000"];
const realMintGasReserveMist = 50000000n;
const maxMintTotalPremiumAtomic = 10000n;
const expectedCliEnv = "testnet";
let realMintSubmittedThisProcess = false;
const dusdcCoinType = config.quoteAssets.DUSDC.coinType;
const forbiddenPreflightMoveCalls = [
  "predict::mint_range",
  "predict::redeem_range",
  "predict::redeem",
  "predict::redeem_permissionless",
  "predict::supply",
  "predict::withdraw",
  "predict::create_manager",
  "predict_manager::deposit",
  "strategy::follow_strategy_and_mint",
  "strategy::create_protocol_vault",
];
const forbiddenCommandKinds = [
  "Publish",
  "TransferObjects",
  "SplitCoins",
  "MergeCoins",
  "Upgrade",
];

main().catch((error) => {
  console.error("DeepVol binary leg validation failed:", sanitizeError(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const mode = parseMode(options);
  assertTestnetConfig();

  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });
  const server = createDeepBookPredictServerClient({ config });
  const scanSender = options.sender ?? defaultReadOnlySender;

  printSafetyHeader(mode, scanSender);

  const readResult = await runReadMode({
    client,
    server,
    sender: scanSender,
    managerId: options.manager,
  });

  if (mode === "read") {
    return;
  }

  if (mode === "preflight") {
    await runPreflightMode({
      client,
      server,
      readResult,
      sender: options.sender ?? null,
      managerId: options.manager ?? null,
    });
    return;
  }

  await runMintMode({
    client,
    server,
    readResult,
    sender: options.sender ?? null,
    managerId: options.manager ?? null,
    options,
  });
}

async function runReadMode({ client, server, sender, managerId }) {
  const contexts = await loadActiveBtcOracleContexts(server);
  const candidates = contexts.flatMap((context) => context.candidates);
  const { attempts, pair } = await scanForMovePair({ contexts, client, sender });
  const blockers = buildReadBlockers({ contexts, candidates, pair });
  const readback = pair && managerId
    ? await readBinaryPositions({ client, sender, managerId, pair })
    : null;

  printReadSummary({ contexts, candidates, attempts, pair, readback, blockers, managerId });

  return { contexts, candidates, attempts, pair, blockers, readback };
}

async function runPreflightMode({ client, server, readResult, sender, managerId }) {
  const blockers = [];

  if (!sender) {
    blockers.push("Preflight mode requires --sender <address>; no default sender is used for mint preflight.");
  }

  if (!managerId) {
    blockers.push("Preflight mode requires --manager <object-id>; no manager is guessed.");
  }

  if (!readResult.pair) {
    blockers.push("Preflight skipped because read mode did not select a nonzero UP/DOWN pair.");
  }

  let managerSummary = null;
  let managerBalanceAtomic = null;

  if (sender && managerId) {
    managerSummary = await tryRead("manager summary", () => server.getManagerSummary(managerId));
    const owner = stringOrNull(managerSummary.value?.owner);
    managerBalanceAtomic = managerSummary.status === "success"
      ? extractManagerDusdcBalanceAtomic(managerSummary.value)
      : null;

    if (owner && normalizeAddress(owner) !== normalizeAddress(sender)) {
      blockers.push(`Manager owner mismatch: expected ${sender}, got ${owner}.`);
    }

    if (readResult.pair && managerBalanceAtomic !== null && BigInt(managerBalanceAtomic) < BigInt(readResult.pair.totalPremiumAtomic)) {
      blockers.push(`Manager DUSDC balance ${managerBalanceAtomic} is below total premium ${readResult.pair.totalPremiumAtomic}.`);
    }
  }

  console.log("\nTwo-leg binary mint preflight");
  console.log(`sender: ${sender ?? "required"}`);
  console.log(`manager: ${managerId ?? "required"}`);
  console.log(`manager summary: ${managerSummary ? formatReadResult(managerSummary) : "skipped"}`);
  console.log(`manager DUSDC balance: ${managerBalanceAtomic ?? "unavailable"}`);

  if (blockers.length > 0) {
    console.log("two-leg PTB preflight: blocked");
    printBlockers(blockers);
    console.log("No write transactions submitted.");
    return;
  }

  const transactionBlock = buildTwoLegMintTransaction({
    pair: readResult.pair,
    managerId,
  });
  assertExpectedTwoLegMintTransaction(transactionBlock);

  const result = await client.devInspectTransactionBlock({
    sender,
    transactionBlock,
  });
  const status = devInspectStatus(result);

  console.log(`two-leg PTB preflight: ${status === "success" ? "passed" : "blocked"}`);

  if (status !== "success") {
    const abort = classifyMintAbort(devInspectError(result));
    console.log(`preflight abort: ${formatAbort(abort)}`);
  }

  console.log("No write transactions submitted.");
}

async function runMintMode({ client, server, readResult, sender, managerId, options }) {
  const blockers = [];
  const executeRealMint = optionEnabled(options, "execute-real-mint");
  const requestedGasBudgetMist = parsePositiveMistBudget(
    options["gas-budget"] ?? mintGasBudgetMist,
    "gas budget",
    executeRealMint ? maxRealMintGasBudgetMist : maxDryRunGasBudgetMist,
  );
  const diagnosticGasBudgets = parseGasBudgetList(
    options["diagnostic-gas-budgets"],
    defaultDiagnosticGasBudgetsMist,
    maxDryRunGasBudgetMist,
  );
  const normalizedSender = sender ? normalizeAddress(sender) : null;
  const normalizedControlledSender = normalizeAddress(controlledSender);
  const normalizedManagerId = managerId ? normalizeAddress(managerId) : null;
  const normalizedControlledManagerId = normalizeAddress(controlledManagerId);

  if (!sender) {
    blockers.push("Mint mode requires explicit --sender <address>; no default sender is used for real mint.");
  } else if (normalizedSender !== normalizedControlledSender) {
    blockers.push(`Mint mode is restricted to the controlled sender ${controlledSender}; got ${sender}.`);
  }

  if (!managerId) {
    blockers.push("Mint mode requires explicit --manager <object-id>; no manager is guessed for real mint.");
  } else if (normalizedManagerId !== normalizedControlledManagerId) {
    blockers.push(`Mint mode is restricted to the controlled manager ${controlledManagerId}; got ${managerId}.`);
  }

  if (config.network !== "testnet" || !config.publicServer.includes("testnet")) {
    blockers.push("Mint mode is only allowed against the configured Testnet public server and Testnet RPC.");
  }

  if (!readResult.pair) {
    blockers.push("Mint mode skipped because read mode did not select a nonzero UP/DOWN pair.");
  } else {
    blockers.push(...validateSelectedMovePair(readResult.pair));
  }

  let managerSummary = null;
  let managerOwner = null;
  let chainOwner = null;
  let managerBalance = null;
  let gasBalance = null;
  let gasCoins = [];

  if (sender && managerId) {
    managerSummary = await tryRead("manager summary", () => server.getManagerSummary(managerId));
    managerOwner = stringOrNull(managerSummary.value?.owner);
    chainOwner = await readObjectAddressOwner({ client, objectId: managerId });

    if (managerOwner && normalizeAddress(managerOwner) !== normalizeAddress(sender)) {
      blockers.push(`Manager summary owner mismatch: expected ${sender}, got ${managerOwner}.`);
    }

    if (chainOwner.status === "success" && chainOwner.owner && normalizeAddress(chainOwner.owner) !== normalizeAddress(sender)) {
      blockers.push(`Manager object owner mismatch: expected ${sender}, got ${chainOwner.owner}.`);
    }

    if (readResult.pair) {
      managerBalance = await readManagerDusdcBalance({ client, sender, managerId });

      if (managerBalance.status !== "success") {
        blockers.push(`Manager DUSDC balance readback blocked: ${managerBalance.blocker}.`);
      } else if (BigInt(managerBalance.balance) < BigInt(readResult.pair.totalPremiumAtomic)) {
        blockers.push(`Manager DUSDC balance ${managerBalance.balance} is below total premium ${readResult.pair.totalPremiumAtomic}.`);
      }
    }

    gasBalance = await readSuiGasBalance({ client, owner: sender });

    if (gasBalance.status !== "success") {
      blockers.push(`SUI gas balance readback blocked: ${gasBalance.blocker}.`);
    } else if (BigInt(gasBalance.totalBalance) < minimumGasBalanceMist) {
      blockers.push(`SUI gas balance ${gasBalance.totalBalance} MIST is below required ${minimumGasBalanceMist.toString()} MIST.`);
    }

    gasCoins = await readSuiGasCoins({ client, owner: sender });

    if (executeRealMint) {
      const requiredGas = BigInt(requestedGasBudgetMist) + realMintGasReserveMist;
      const coveringCoin = gasCoins.find((coin) => BigInt(coin.balance) >= requiredGas);

      if (!coveringCoin) {
        blockers.push(`No SUI gas coin covers gas budget ${requestedGasBudgetMist} plus reserve ${realMintGasReserveMist.toString()} MIST.`);
      }
    }
  }

  console.log("\nControlled two-leg binary mint gates");
  console.log(`sender: ${sender ?? "required"}`);
  console.log(`manager: ${managerId ?? "required"}`);
  console.log(`controlled sender: ${controlledSender}`);
  console.log(`controlled manager: ${controlledManagerId}`);
  console.log(`manager summary: ${managerSummary ? formatReadResult(managerSummary) : "skipped"}`);
  console.log(`manager summary owner: ${managerOwner ?? "unavailable"}`);
  console.log(`manager object owner: ${formatOwnerReadback(chainOwner)}`);
  console.log(`manager DUSDC balance: ${managerBalance?.status === "success" ? managerBalance.balance : "unavailable"}`);
  console.log(`sender SUI gas balance: ${gasBalance?.status === "success" ? gasBalance.totalBalance : "unavailable"}`);
  console.log(`requested gas budget: ${requestedGasBudgetMist}`);
  console.log(`diagnostic gas budgets: ${diagnosticGasBudgets.join(",")}`);
  console.log(`real execution intent: ${executeRealMint ? "enabled by --execute-real-mint" : "disabled"}`);
  printGasCoinSummary(gasCoins);

  if (readResult.pair) {
    printSelectedPair(readResult.pair);
    console.log(`max allowed total premium: ${maxMintTotalPremiumAtomic.toString()}`);
  }

  if (blockers.length > 0) {
    console.log("two-leg binary mint: blocked");
    printBlockers(blockers);
    console.log("No write transactions submitted.");
    return;
  }

  await assertCliEnvAndAddress({ expectedAddress: sender });

  const positionsBefore = await readBinaryPositions({ client, sender, managerId, pair: readResult.pair });
  const balanceBefore = await readManagerDusdcBalance({ client, sender, managerId });

  console.log("\nPre-submission readback");
  printPositionReadback("UP before", positionsBefore.up);
  printPositionReadback("DOWN before", positionsBefore.down);
  printBalanceReadback("manager DUSDC balance before", balanceBefore);

  if (positionsBefore.up.status !== "success" || positionsBefore.down.status !== "success" || balanceBefore.status !== "success") {
    console.log("two-leg binary mint: blocked");
    printBlockers([
      positionsBefore.up.status === "success" ? null : `UP position before blocked: ${positionsBefore.up.blocker}`,
      positionsBefore.down.status === "success" ? null : `DOWN position before blocked: ${positionsBefore.down.blocker}`,
      balanceBefore.status === "success" ? null : `manager balance before blocked: ${balanceBefore.blocker}`,
    ].filter(Boolean));
    console.log("No write transactions submitted.");
    return;
  }

  const transactionBlock = buildTwoLegMintTransaction({
    pair: readResult.pair,
    managerId,
  });
  setTransactionSender(transactionBlock, sender);
  assertExpectedTwoLegMintTransaction(transactionBlock);
  printTwoLegCommandMap(transactionBlock);

  const preflightResult = await client.devInspectTransactionBlock({
    sender,
    transactionBlock,
  });
  const preflightStatus = devInspectStatus(preflightResult);

  console.log("\nPreflight");
  console.log(`two-leg PTB devInspect: ${preflightStatus === "success" ? "passed" : "blocked"}`);

  if (preflightStatus !== "success") {
    const abort = classifyMintAbort(devInspectError(preflightResult));
    console.log(`preflight abort: ${formatAbort(abort)}`);
    console.log("No write transactions submitted.");
    return;
  }

  let sdkDryRun;
  try {
    const result = await dryRunTwoLegMintWithSdk({
      tx: transactionBlock,
      client,
      sender,
      gasBudgetMist: requestedGasBudgetMist,
    });
    sdkDryRun = { status: "success", ...result, error: null };
  } catch (error) {
    const message = sanitizeCliError(error);
    explainCommandIndex(transactionBlock, message);
    sdkDryRun = { status: "blocked", gasBudgetMist: requestedGasBudgetMist, error: message, gasUsed: null };
  }

  console.log(`SDK dry-run: ${sdkDryRun.status === "success" ? "passed" : "blocked"}`);
  console.log(`SDK dry-run gas used: ${formatGasUsed(sdkDryRun.gasUsed)}`);
  console.log(`SDK dry-run net gas charge: ${estimateNetGasChargeMist(sdkDryRun.gasUsed) ?? "unavailable"}`);
  if (sdkDryRun.status !== "success") {
    console.log(`SDK dry-run error: ${sdkDryRun.error}`);
  }

  const diagnosticBudgets = uniqueStrings([requestedGasBudgetMist, ...diagnosticGasBudgets]);
  const cliResults = await runCliGasBudgetDiagnostics({
    tx: transactionBlock,
    client,
    sender,
    gasBudgets: diagnosticBudgets,
  });
  let explicitGasCliResults = null;
  let selectedPassingDryRun = cliResults.find((result) => result.status === "success") ?? null;
  let selectedGasCoinId = selectedPassingDryRun?.gasObjectId ?? null;

  if (sdkDryRun.status === "success" && !selectedPassingDryRun) {
    const explicitGasCoin = findGasCoinCoveringBudget(gasCoins, requestedGasBudgetMist);

    console.log("explicit gas coin dry-run:");
    if (explicitGasCoin) {
      console.log(`selected gas coin: ${explicitGasCoin.coinObjectId} balance=${explicitGasCoin.balance}`);
      const result = await tryCliDryRun({
        tx: transactionBlock,
        client,
        sender,
        gasBudgetMist: requestedGasBudgetMist,
        gasObjectId: explicitGasCoin.coinObjectId,
      });
      explicitGasCliResults = [result];
      console.log(`explicit gas coin dry-run: ${result.status === "success" ? "passed" : "blocked"}`);
      if (result.status === "blocked") {
        console.log(`explicit gas coin dry-run error: ${result.error}`);
      } else {
        console.log(`explicit gas coin dry-run gas used: ${formatGasUsed(result.gasUsed)}`);
        selectedPassingDryRun = result;
        selectedGasCoinId = explicitGasCoin.coinObjectId;
      }
    } else {
      explicitGasCliResults = [];
      console.log(`explicit gas coin dry-run: skipped; no gas coin covers ${requestedGasBudgetMist} MIST`);
    }
  }

  const dryRunDiagnosis = classifyDryRunDiagnosis({
    devInspectPassed: preflightStatus === "success",
    sdkDryRun,
    cliResults,
    explicitGasCliResults,
  });
  const selectedPassingGasBudgetMist = selectedPassingDryRun?.gasBudgetMist ?? null;

  console.log(`dry-run diagnosis: ${dryRunDiagnosis}`);
  console.log(`selected passing gas budget: ${selectedPassingGasBudgetMist ?? "unavailable"}`);
  console.log(`selected gas coin: ${selectedGasCoinId ?? "CLI auto-selection"}`);

  if (!selectedPassingDryRun) {
    console.log("two-leg binary mint: blocked");
    console.log("No write transactions submitted.");
    return;
  }

  if (!executeRealMint) {
    console.log("\nReal mint");
    console.log("real mint: not executed; pass --execute-real-mint only after reviewing dry-run diagnostics");
    console.log("No write transactions submitted.");
    return;
  }

  const realMintBlockers = [];
  const allowedRealMintDiagnoses = ["dry_run_passed", "gas_budget_too_low", "cli_auto_gas_selection_behavior"];

  if (sdkDryRun.status !== "success") {
    realMintBlockers.push("SDK dry-run did not pass in this invocation.");
  }

  if (!allowedRealMintDiagnoses.includes(dryRunDiagnosis)) {
    realMintBlockers.push(`Dry-run diagnosis ${dryRunDiagnosis} is not allowed for real execution.`);
  }

  if (gasBalance?.status !== "success") {
    realMintBlockers.push("Sender SUI gas balance was not read successfully.");
  } else if (BigInt(gasBalance.totalBalance) < BigInt(selectedPassingGasBudgetMist) + realMintGasReserveMist) {
    realMintBlockers.push(`Sender SUI gas balance ${gasBalance.totalBalance} is below selected gas budget ${selectedPassingGasBudgetMist} plus reserve ${realMintGasReserveMist.toString()} MIST.`);
  }

  if (selectedGasCoinId) {
    const selectedGasCoin = gasCoins.find((coin) => normalizeAddress(coin.coinObjectId) === normalizeAddress(selectedGasCoinId));
    if (!selectedGasCoin || BigInt(selectedGasCoin.balance) < BigInt(selectedPassingGasBudgetMist) + realMintGasReserveMist) {
      realMintBlockers.push(`Selected gas coin does not cover selected gas budget ${selectedPassingGasBudgetMist} plus reserve ${realMintGasReserveMist.toString()} MIST.`);
    }
  } else if (!findGasCoinCoveringBudget(gasCoins, (BigInt(selectedPassingGasBudgetMist) + realMintGasReserveMist).toString())) {
    realMintBlockers.push(`No gas coin covers selected gas budget ${selectedPassingGasBudgetMist} plus reserve ${realMintGasReserveMist.toString()} MIST.`);
  }

  if (realMintBlockers.length > 0) {
    console.log("two-leg binary mint: blocked");
    printBlockers(realMintBlockers);
    console.log("No write transactions submitted.");
    return;
  }

  let execution;
  try {
    assertCanSubmitAtMostOneRealMint();
    execution = await executeTwoLegMintWithSuiCli({
      tx: transactionBlock,
      client,
      sender,
      gasBudgetMist: selectedPassingGasBudgetMist,
      gasObjectId: selectedGasCoinId,
    });
  } catch (error) {
    console.log("\nReal mint");
    console.log("executed: failed or uncertain");
    console.log(`diagnostic: ${sanitizeCliError(error)}`);
    console.log("No retry attempted.");
    process.exitCode = 1;
    return;
  }

  const transactionDetails = await tryRead("transaction details", () => client.getTransactionBlock({
    digest: execution.digest,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
      showBalanceChanges: true,
    },
  }));
  const mintedEvents = transactionDetails.status === "success"
    ? extractPositionMintedEvents(transactionDetails.value)
    : [];
  const executionGasUsed = transactionDetails.status === "success"
    ? extractGasUsed(transactionDetails.value)
    : null;

  const positionsAfter = await readBinaryPositions({ client, sender, managerId, pair: readResult.pair });
  const balanceAfter = await readManagerDusdcBalance({ client, sender, managerId });
  const upDelta = quantityDelta(positionsBefore.up, positionsAfter.up);
  const downDelta = quantityDelta(positionsBefore.down, positionsAfter.down);
  const balanceDelta = balanceDecrease(balanceBefore, balanceAfter);
  const eventCostTotal = sumMintedEventCosts(mintedEvents);
  const quoteTotal = BigInt(readResult.pair.totalPremiumAtomic);
  const expectedQuantity = BigInt(readResult.pair.quantity);

  console.log("\nReal mint");
  console.log("executed: yes");
  console.log(`digest: ${execution.digest}`);
  console.log(`explorer: ${buildSuiExplorerTransactionUrl(execution.digest, "testnet")}`);
  console.log(`gas budget: ${execution.gasBudgetMist}`);
  console.log(`gas coin: ${execution.gasObjectId ?? "CLI auto-selection"}`);
  console.log(`gas used: ${formatGasUsed(executionGasUsed)}`);
  console.log(`SDK dry-run: ${sdkDryRun.status === "success" ? sdkDryRun.dryRunStatus : "blocked"}`);
  console.log(`CLI dry-run: ${selectedPassingDryRun.dryRunStatus ?? selectedPassingDryRun.status}`);
  console.log(`CLI execution: ${execution.executionStatus}`);

  console.log("\nEvents and transaction diagnostics");
  console.log(`transaction details: ${formatReadResult(transactionDetails)}`);
  printPositionMintedEvents(mintedEvents);

  console.log("\nPost-state readback");
  printPositionBeforeAfter("UP", positionsBefore.up, positionsAfter.up, upDelta);
  printPositionBeforeAfter("DOWN", positionsBefore.down, positionsAfter.down, downDelta);
  printBalanceBeforeAfter(balanceBefore, balanceAfter, balanceDelta);
  console.log(`quoted total premium: ${quoteTotal.toString()}`);
  console.log(`PositionMinted event cost total: ${eventCostTotal === null ? "unavailable" : eventCostTotal.toString()}`);

  if (balanceDelta !== null && balanceDelta !== quoteTotal) {
    console.log(`observed balance delta differs from pre-mint quote by ${(balanceDelta - quoteTotal).toString()} atomic DUSDC; mint recomputes cost at execution time.`);
  }

  const postRunBlockers = [];

  if (upDelta === null || upDelta < expectedQuantity) {
    postRunBlockers.push(`UP delta ${upDelta === null ? "unavailable" : upDelta.toString()} is below expected quantity ${expectedQuantity.toString()}.`);
  }

  if (downDelta === null || downDelta < expectedQuantity) {
    postRunBlockers.push(`DOWN delta ${downDelta === null ? "unavailable" : downDelta.toString()} is below expected quantity ${expectedQuantity.toString()}.`);
  }

  if (balanceDelta === null || balanceDelta <= 0n) {
    postRunBlockers.push(`Manager DUSDC balance delta ${balanceDelta === null ? "unavailable" : balanceDelta.toString()} is not positive.`);
  }

  if (eventCostTotal !== null && balanceDelta !== null && eventCostTotal !== balanceDelta) {
    postRunBlockers.push(`PositionMinted event cost total ${eventCostTotal.toString()} does not match manager balance delta ${balanceDelta.toString()}.`);
  }

  if (postRunBlockers.length > 0) {
    console.log("post-state validation: blocked");
    printBlockers(postRunBlockers);
    process.exitCode = 1;
    return;
  }

  console.log("post-state validation: passed");
}

function buildTwoLegMintTransaction({ pair, managerId }) {
  const tx = new Transaction();
  const upKey = buildMarketKeyTransactionArgument(tx, pair.up.marketKey, config);

  tx.moveCall({
    target: `${config.packageId}::predict::mint`,
    typeArguments: [dusdcCoinType],
    arguments: [
      tx.object(config.predictId),
      tx.object(managerId),
      tx.object(pair.oracleObjectId),
      upKey,
      tx.pure.u64(pair.quantity),
      tx.object(clockObjectId),
    ],
  });

  const downKey = buildMarketKeyTransactionArgument(tx, pair.down.marketKey, config);

  tx.moveCall({
    target: `${config.packageId}::predict::mint`,
    typeArguments: [dusdcCoinType],
    arguments: [
      tx.object(config.predictId),
      tx.object(managerId),
      tx.object(pair.oracleObjectId),
      downKey,
      tx.pure.u64(pair.quantity),
      tx.object(clockObjectId),
    ],
  });

  return tx;
}

function buildManagerBinaryPositionTransaction({ managerId, marketKey }) {
  const tx = new Transaction();
  const key = buildMarketKeyTransactionArgument(tx, marketKey, config);

  tx.moveCall({
    target: `${config.packageId}::predict_manager::position`,
    arguments: [tx.object(managerId), key],
  });

  return tx;
}

function buildManagerDusdcBalanceTransaction({ managerId }) {
  const tx = new Transaction();

  tx.moveCall({
    target: `${config.packageId}::predict_manager::balance`,
    typeArguments: [dusdcCoinType],
    arguments: [tx.object(managerId)],
  });

  return tx;
}

async function readBinaryPositions({ client, sender, managerId, pair }) {
  const up = await readBinaryPosition({
    client,
    sender,
    managerId,
    label: "UP",
    marketKey: pair.up.marketKey,
  });
  const down = await readBinaryPosition({
    client,
    sender,
    managerId,
    label: "DOWN",
    marketKey: pair.down.marketKey,
  });

  return { up, down };
}

async function readBinaryPosition({ client, sender, managerId, label, marketKey }) {
  try {
    const transactionBlock = buildManagerBinaryPositionTransaction({ managerId, marketKey });
    assertReadbackTransaction(transactionBlock);
    const result = await client.devInspectTransactionBlock({ sender, transactionBlock });

    if (devInspectStatus(result) !== "success") {
      return {
        label,
        status: "blocked",
        quantity: null,
        blocker: devInspectError(result),
      };
    }

    const diagnostic = inspectDevInspectU64(result);

    if (!diagnostic.decoded) {
      return {
        label,
        status: "blocked",
        quantity: null,
        blocker: `position return did not decode to one u64: ${summarizeDevInspectU64Diagnostic(diagnostic)}`,
      };
    }

    return {
      label,
      status: "success",
      quantity: diagnostic.decoded,
      blocker: null,
    };
  } catch (error) {
    return {
      label,
      status: "blocked",
      quantity: null,
      blocker: sanitizeError(error),
    };
  }
}

async function readManagerDusdcBalance({ client, sender, managerId }) {
  try {
    const transactionBlock = buildManagerDusdcBalanceTransaction({ managerId });
    assertBalanceReadbackTransaction(transactionBlock);
    const result = await client.devInspectTransactionBlock({ sender, transactionBlock });

    if (devInspectStatus(result) !== "success") {
      return {
        status: "blocked",
        balance: null,
        blocker: devInspectError(result),
      };
    }

    const diagnostic = inspectDevInspectU64(result);

    if (!diagnostic.decoded) {
      return {
        status: "blocked",
        balance: null,
        blocker: `balance return did not decode to one u64: ${summarizeDevInspectU64Diagnostic(diagnostic)}`,
      };
    }

    return {
      status: "success",
      balance: diagnostic.decoded,
      blocker: null,
    };
  } catch (error) {
    return {
      status: "blocked",
      balance: null,
      blocker: sanitizeError(error),
    };
  }
}

async function loadActiveBtcOracleContexts(server) {
  const oracles = await server.getOracles(config.predictId);
  const nowMs = BigInt(Date.now());
  const active = oracles
    .filter((oracle) => oracle.status === "active")
    .filter((oracle) => stringOrNull(oracle.underlying_asset) === "BTC")
    .filter((oracle) => {
      const expiry = integerStringOrNull(oracle.expiry);
      return expiry !== null && BigInt(expiry) > nowMs;
    })
    .sort((left, right) => compareIntegerStrings(left.expiry, right.expiry))
    .slice(0, maxOracleContexts);
  const contexts = [];

  for (const oracle of active) {
    const oracleId = stringOrNull(oracle.oracle_id);
    const oracleState = oracleId ? await tryRead("oracle state", () => server.getOracleState(oracleId)) : null;
    const oracleRecord = isRecord(oracleState?.value?.oracle) ? oracleState.value.oracle : oracle;
    const latestPrice = isRecord(oracleState?.value?.latest_price) ? oracleState.value.latest_price : null;
    contexts.push(buildOracleContext(oracleRecord, latestPrice));
  }

  return contexts;
}

function buildOracleContext(oracleRecord, latestPrice) {
  const blockers = [];
  const oracleId = stringOrNull(oracleRecord?.oracle_id);
  const expiry = integerStringOrNull(oracleRecord?.expiry);
  const minStrike = integerStringOrNull(oracleRecord?.min_strike);
  const tickSize = integerStringOrNull(oracleRecord?.tick_size);
  const spot = integerStringOrNull(latestPrice?.spot);
  const forward = integerStringOrNull(latestPrice?.forward);
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
    blockers.push("Latest spot/forward unavailable; scanner cannot derive binary strikes.");
  }

  const candidates = oracleId && expiry && minStrike && tickSize && (spot || forward)
    ? deriveMarketQuoteCandidates({
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
    oracleObjectId: oracleId ?? "unknown",
    underlyingAsset,
    status: stringOrNull(oracleRecord?.status) ?? "unknown",
    expiry: expiry ?? "unknown",
    minStrike: minStrike ?? "unknown",
    tickSize: tickSize ?? "unknown",
    spot,
    forward,
    blockers,
    candidates,
  };
}

async function scanForMovePair({ contexts, client, sender }) {
  const attempts = [];

  for (const context of contexts) {
    const candidates = rankBinaryCandidates(context.candidates).slice(0, maxCandidatesPerOracle);

    for (const quantity of readModeQuantities) {
      const batchAttempts = await scanBinaryQuoteSanity({
        candidates,
        client,
        sender,
        quantities: [quantity],
        config,
      });
      attempts.push(...batchAttempts);

      const pair = selectMovePair(attempts);
      if (pair) {
        return { attempts, pair };
      }
    }
  }

  return { attempts, pair: null };
}

function rankBinaryCandidates(candidates) {
  return [...candidates].sort((left, right) => {
    const anchorDelta = compareBigInt(
      absoluteDistance(BigInt(left.strike), BigInt(left.anchorPrice)),
      absoluteDistance(BigInt(right.strike), BigInt(right.anchorPrice)),
    );

    if (anchorDelta !== 0) {
      return anchorDelta;
    }

    if (left.anchorSource !== right.anchorSource) {
      return left.anchorSource === "forward" ? -1 : 1;
    }

    if (left.strike !== right.strike) {
      return compareBigInt(BigInt(left.strike), BigInt(right.strike));
    }

    return left.direction === right.direction ? 0 : left.direction === "down" ? -1 : 1;
  });
}

function absoluteDistance(left, right) {
  return left >= right ? left - right : right - left;
}

function selectMovePair(attempts) {
  const successes = attempts.filter((attempt) => attempt.status === "success" && BigInt(attempt.mintCostAtomic) > 0n);
  const pairs = [];

  for (const down of successes.filter((attempt) => attempt.direction === "down")) {
    for (const up of successes.filter((attempt) => attempt.direction === "up")) {
      if (down.oracleId !== up.oracleId || down.expiry !== up.expiry || down.quantity !== up.quantity) {
        continue;
      }

      if (BigInt(down.strike) >= BigInt(up.strike)) {
        continue;
      }

      const totalPremiumAtomic = (BigInt(up.mintCostAtomic) + BigInt(down.mintCostAtomic)).toString();
      pairs.push({
        product: "BTC_MOVE",
        oracleId: up.oracleId,
        oracleObjectId: up.oracleObjectId,
        expiry: up.expiry,
        lowerStrike: down.strike,
        upperStrike: up.strike,
        quantity: up.quantity,
        up: {
          side: "UP",
          marketKey: {
            oracleId: up.oracleId,
            expiry: up.expiry,
            strike: up.strike,
            direction: "up",
          },
          quote: up,
        },
        down: {
          side: "DOWN",
          marketKey: {
            oracleId: down.oracleId,
            expiry: down.expiry,
            strike: down.strike,
            direction: "down",
          },
          quote: down,
        },
        totalPremiumAtomic,
      });
    }
  }

  return pairs.sort(compareMovePairs)[0] ?? null;
}

function compareMovePairs(left, right) {
  const quantityDelta = compareBigInt(BigInt(left.quantity), BigInt(right.quantity));

  if (quantityDelta !== 0) {
    return quantityDelta;
  }

  const premiumDelta = compareBigInt(BigInt(left.totalPremiumAtomic), BigInt(right.totalPremiumAtomic));

  if (premiumDelta !== 0) {
    return premiumDelta;
  }

  const widthDelta = compareBigInt(
    BigInt(left.upperStrike) - BigInt(left.lowerStrike),
    BigInt(right.upperStrike) - BigInt(right.lowerStrike),
  );

  return widthDelta;
}

function buildReadBlockers({ contexts, candidates, pair }) {
  const blockers = [];

  if (contexts.length === 0) {
    blockers.push("No active unexpired BTC oracle was discovered at runtime.");
  }

  if (candidates.length === 0) {
    blockers.push("No binary MarketKey candidates could be derived from runtime BTC oracle metadata.");
  }

  if (!pair) {
    blockers.push("No same-oracle same-expiry UP/DOWN pair had lower < upper and nonzero mint costs for a shared quantity.");
  }

  for (const context of contexts) {
    for (const blocker of context.blockers) {
      blockers.push(`${context.oracleId}: ${blocker}`);
    }
  }

  return blockers;
}

function validateSelectedMovePair(pair) {
  const blockers = [];

  if (pair.product !== "BTC_MOVE") {
    blockers.push(`Selected pair product must be BTC_MOVE; got ${pair.product}.`);
  }

  if (pair.oracleId !== pair.up.marketKey.oracleId || pair.oracleId !== pair.down.marketKey.oracleId) {
    blockers.push("Selected pair UP/DOWN oracle IDs do not match the selected BTC oracle.");
  }

  if (pair.expiry !== pair.up.marketKey.expiry || pair.expiry !== pair.down.marketKey.expiry) {
    blockers.push("Selected pair UP/DOWN expiries do not match.");
  }

  if (BigInt(pair.lowerStrike) >= BigInt(pair.upperStrike)) {
    blockers.push(`Selected lower strike ${pair.lowerStrike} must be below upper strike ${pair.upperStrike}.`);
  }

  if (pair.up.quote.quantity !== pair.down.quote.quantity || pair.up.quote.quantity !== pair.quantity) {
    blockers.push("Selected UP/DOWN quantities do not match.");
  }

  if (BigInt(pair.up.quote.mintCostAtomic) <= 0n) {
    blockers.push(`UP mint cost must be positive; got ${pair.up.quote.mintCostAtomic}.`);
  }

  if (BigInt(pair.down.quote.mintCostAtomic) <= 0n) {
    blockers.push(`DOWN mint cost must be positive; got ${pair.down.quote.mintCostAtomic}.`);
  }

  if (BigInt(pair.totalPremiumAtomic) <= 0n) {
    blockers.push(`Total premium must be positive; got ${pair.totalPremiumAtomic}.`);
  }

  if (BigInt(pair.totalPremiumAtomic) > maxMintTotalPremiumAtomic) {
    blockers.push(`Total premium ${pair.totalPremiumAtomic} exceeds max allowed ${maxMintTotalPremiumAtomic.toString()} atomic DUSDC.`);
  }

  if (pair.up.marketKey.direction !== "up") {
    blockers.push(`UP leg direction must be up; got ${pair.up.marketKey.direction}.`);
  }

  if (pair.down.marketKey.direction !== "down") {
    blockers.push(`DOWN leg direction must be down; got ${pair.down.marketKey.direction}.`);
  }

  return blockers;
}

function printSafetyHeader(mode, sender) {
  console.log(`Mode: deepvol-binary-${mode}`);
  console.log(`Network: ${config.network}`);
  console.log(`Public server: ${config.publicServer}`);
  console.log(`DevInspect sender: ${sender}`);
  console.log("No private key loaded by this script.");
  console.log("No .env.local read.");

  if (mode === "mint") {
    console.log("Write submission is disabled by default and requires --execute-real-mint plus passing devInspect, SDK dry-run, and CLI dry-run gates.");
    return;
  }

  console.log("No write transactions submitted.");
}

function printReadSummary({ contexts, candidates, attempts, pair, readback, blockers, managerId }) {
  const successes = attempts.filter((attempt) => attempt.status === "success");
  const nonzeroSuccesses = successes.filter((attempt) => BigInt(attempt.mintCostAtomic) > 0n);

  console.log("\nActive BTC oracle scan");
  console.log(`oracles scanned: ${contexts.length}`);
  for (const context of contexts) {
    console.log(`- oracle=${context.oracleId} underlying=${context.underlyingAsset ?? "unknown"} expiry=${context.expiry} spot=${context.spot ?? "unknown"} forward=${context.forward ?? "unknown"} candidates=${context.candidates.length}`);
  }

  console.log("\nBinary quote scan");
  console.log(`quantities tested: ${readModeQuantities.join(",")}`);
  console.log(`max candidates per oracle: ${maxCandidatesPerOracle}`);
  console.log(`candidates available: ${candidates.length}`);
  console.log(`attempts: ${attempts.length}`);
  console.log(`successes: ${successes.length}`);
  console.log(`nonzero successes: ${nonzeroSuccesses.length}`);
  printFailureSummary(attempts);

  console.log("\nSelected BTC MOVE pair");
  if (!pair) {
    console.log("status: blocked");
    printBlockers(blockers);
    return;
  }

  console.log("status: passed");
  printSelectedPair(pair);

  if (!managerId) {
    console.log("readback: skipped; pass --sender and --manager to read predict_manager::position.");
    return;
  }

  console.log("\nBinary position readback");
  console.log(`manager: ${managerId}`);
  printPositionReadback("UP", readback?.up ?? null);
  printPositionReadback("DOWN", readback?.down ?? null);
}

function printSelectedPair(pair) {
  console.log(`selected BTC oracle: ${pair.oracleId}`);
  console.log(`selected expiry: ${pair.expiry}`);
  console.log(`selected lower / upper strikes: ${pair.lowerStrike} / ${pair.upperStrike}`);
  console.log(`quantity: ${pair.quantity}`);
  console.log(`UP MarketKey: oracle=${pair.up.marketKey.oracleId} expiry=${pair.up.marketKey.expiry} strike=${pair.up.marketKey.strike} direction=${pair.up.marketKey.direction} constructor=market_key::up`);
  console.log(`DOWN MarketKey: oracle=${pair.down.marketKey.oracleId} expiry=${pair.down.marketKey.expiry} strike=${pair.down.marketKey.strike} direction=${pair.down.marketKey.direction} constructor=market_key::down`);
  console.log(`UP quote: mint=${pair.up.quote.mintCostAtomic} redeem=${pair.up.quote.redeemPayoutAtomic}`);
  console.log(`DOWN quote: mint=${pair.down.quote.mintCostAtomic} redeem=${pair.down.quote.redeemPayoutAtomic}`);
  console.log(`total premium: ${pair.totalPremiumAtomic}`);
}

function printFailureSummary(attempts) {
  const failures = attempts.filter((attempt) => attempt.status === "failure");
  const groups = new Map();

  for (const failure of failures) {
    const key = `${failure.abort.module ?? "unknown"}::${failure.abort.function ?? "unknown"}::${failure.abort.code ?? "unknown"}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  if (groups.size === 0) {
    console.log("failure summary: none");
    return;
  }

  console.log("failure summary:");
  for (const [key, count] of [...groups.entries()].sort((left, right) => right[1] - left[1])) {
    console.log(`- ${key}: ${count}`);
  }
}

function printPositionReadback(label, result) {
  if (!result) {
    console.log(`${label} position: unavailable`);
    return;
  }

  if (result.status === "success") {
    console.log(`${label} position: quantity=${result.quantity}`);
    return;
  }

  console.log(`${label} position: blocked ${result.blocker}`);
}

function printBalanceReadback(label, result) {
  if (!result) {
    console.log(`${label}: unavailable`);
    return;
  }

  if (result.status === "success") {
    console.log(`${label}: ${result.balance}`);
    return;
  }

  console.log(`${label}: blocked ${result.blocker}`);
}

function printPositionBeforeAfter(label, before, after, delta) {
  const beforeQuantity = before.status === "success" ? before.quantity : "unavailable";
  const afterQuantity = after.status === "success" ? after.quantity : "unavailable";
  console.log(`${label} position before/after: ${beforeQuantity} / ${afterQuantity}`);
  console.log(`${label} delta: ${delta === null ? "unavailable" : delta.toString()}`);
}

function printBalanceBeforeAfter(before, after, delta) {
  const beforeBalance = before.status === "success" ? before.balance : "unavailable";
  const afterBalance = after.status === "success" ? after.balance : "unavailable";
  console.log(`manager DUSDC balance before/after: ${beforeBalance} / ${afterBalance}`);
  console.log(`manager DUSDC balance delta: ${delta === null ? "unavailable" : delta.toString()}`);
}

function printPositionMintedEvents(events) {
  console.log(`PositionMinted events: ${events.length}`);

  if (events.length === 0) {
    console.log("PositionMinted event details: none observed or unavailable");
    return;
  }

  events.forEach((event, index) => {
    console.log(`PositionMinted[${index}]: type=${event.type} fields=${JSON.stringify(event.fields)}`);
  });
}

function printBlockers(blockers) {
  for (const blocker of blockers) {
    console.log(`blocker: ${blocker}`);
  }
}

function assertReadbackTransaction(tx) {
  const moveCalls = getMoveCalls(tx);
  const forbidden = moveCalls.filter((call) => {
    const moduleName = String(call.module ?? "");
    const functionName = String(call.function ?? "");
    return moduleName !== "market_key" && !(moduleName === "predict_manager" && functionName === "position");
  });

  if (forbidden.length > 0) {
    throw new Error(`Binary position readback transaction contains unexpected Move call(s): ${formatMoveCalls(forbidden)}.`);
  }
}

function assertBalanceReadbackTransaction(tx) {
  const moveCalls = getMoveCalls(tx);
  const forbidden = moveCalls.filter((call) => {
    const moduleName = String(call.module ?? "");
    const functionName = String(call.function ?? "");
    return !(moduleName === "predict_manager" && functionName === "balance");
  });

  if (forbidden.length > 0) {
    throw new Error(`Manager balance readback transaction contains unexpected Move call(s): ${formatMoveCalls(forbidden)}.`);
  }
}

function assertExpectedTwoLegMintTransaction(tx) {
  const data = tx.getData();
  const commands = Array.isArray(data.commands) ? data.commands : [];
  const commandKinds = commands.map((command) => command.$kind).filter((kind) => typeof kind === "string");
  const blockedKinds = commandKinds.filter((kind) => forbiddenCommandKinds.includes(kind));

  if (blockedKinds.length > 0) {
    throw new Error(`Two-leg mint transaction contains forbidden command(s): ${blockedKinds.join(", ")}.`);
  }

  if (commandKinds.some((kind) => kind !== "MoveCall")) {
    throw new Error(`Two-leg mint transaction must contain only MoveCall commands; found ${commandKinds.join(", ")}.`);
  }

  const moveCalls = getMoveCalls(tx);
  const forbidden = moveCalls.filter((call) => {
    const target = `${String(call.module ?? "")}::${String(call.function ?? "")}`;
    return forbiddenPreflightMoveCalls.includes(target);
  });

  if (forbidden.length > 0) {
    throw new Error(`Two-leg mint transaction contains forbidden Move call(s): ${formatMoveCalls(forbidden)}.`);
  }

  const expectedOrder = [
    "market_key::up",
    "predict::mint",
    "market_key::down",
    "predict::mint",
  ];
  const actualOrder = moveCalls.map((call) => `${String(call.module ?? "unknown")}::${String(call.function ?? "unknown")}`);

  if (actualOrder.length !== expectedOrder.length || actualOrder.some((target, index) => target !== expectedOrder[index])) {
    throw new Error(`Two-leg mint transaction must contain exactly ${expectedOrder.join(", ")}; found ${actualOrder.join(", ")}.`);
  }

  const mintCalls = moveCalls.filter((call) => String(call.module) === "predict" && String(call.function) === "mint");
  const upCalls = moveCalls.filter((call) => String(call.module) === "market_key" && String(call.function) === "up");
  const downCalls = moveCalls.filter((call) => String(call.module) === "market_key" && String(call.function) === "down");

  if (mintCalls.length !== 2) {
    throw new Error(`Two-leg mint transaction must contain exactly two predict::mint calls; found ${mintCalls.length}.`);
  }

  if (upCalls.length !== 1) {
    throw new Error(`Two-leg mint transaction must contain exactly one market_key::up call; found ${upCalls.length}.`);
  }

  if (downCalls.length !== 1) {
    throw new Error(`Two-leg mint transaction must contain exactly one market_key::down call; found ${downCalls.length}.`);
  }

  const nonDusdcMintCalls = mintCalls.filter((call) => {
    const typeArguments = Array.isArray(call.typeArguments) ? call.typeArguments : [];
    return typeArguments.length !== 1 || typeArguments[0] !== dusdcCoinType;
  });

  if (nonDusdcMintCalls.length > 0) {
    throw new Error("Two-leg mint transaction predict::mint calls must use only the configured DUSDC coin type.");
  }
}

function getMoveCalls(tx) {
  const data = tx.getData();
  const commands = Array.isArray(data.commands) ? data.commands : [];

  return commands
    .map((command) => command.MoveCall)
    .filter(isRecord);
}

function getMoveCallCommandDetails(tx) {
  const data = tx.getData();
  const commands = Array.isArray(data.commands) ? data.commands : [];

  return commands.map((command, index) => {
    const moveCall = isRecord(command.MoveCall) ? command.MoveCall : null;
    return {
      index,
      oneBasedIndex: index + 1,
      kind: typeof command.$kind === "string" ? command.$kind : "unknown",
      module: moveCall ? String(moveCall.module ?? "unknown") : null,
      function: moveCall ? String(moveCall.function ?? "unknown") : null,
      target: moveCall
        ? `${String(moveCall.module ?? "unknown")}::${String(moveCall.function ?? "unknown")}`
        : null,
      typeArguments: Array.isArray(moveCall?.typeArguments) ? moveCall.typeArguments : [],
      arguments: moveCall && Array.isArray(moveCall.arguments)
        ? moveCall.arguments.map((argument) => summarizeTransactionArgument(argument, data))
        : [],
    };
  });
}

function summarizeTransactionArgument(argument, data) {
  if (!isRecord(argument)) {
    return summarizeShort(argument);
  }

  if (Number.isInteger(argument.Input)) {
    return `input[${argument.Input}] ${summarizeTransactionInput(data.inputs?.[argument.Input])}`;
  }

  if (Number.isInteger(argument.Result)) {
    return `result[${argument.Result}]`;
  }

  if (Array.isArray(argument.NestedResult) && argument.NestedResult.length === 2) {
    return `nested_result[${argument.NestedResult[0]}][${argument.NestedResult[1]}]`;
  }

  if (typeof argument.$kind === "string") {
    return argument.$kind;
  }

  return summarizeShort(argument);
}

function summarizeTransactionInput(input) {
  if (!isRecord(input)) {
    return "unknown";
  }

  const objectId = extractObjectId(input);
  if (objectId) {
    return `object ${objectId}`;
  }

  if (isRecord(input.Pure) || input.$kind === "Pure") {
    return "pure";
  }

  if (typeof input.type === "string") {
    return input.type;
  }

  return summarizeShort(input);
}

function extractObjectId(value) {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.objectId === "string") {
    return value.objectId;
  }

  for (const child of Object.values(value)) {
    if (isRecord(child)) {
      const nested = extractObjectId(child);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function summarizeShort(value) {
  const text = JSON.stringify(value);
  return text && text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function printTwoLegCommandMap(tx) {
  console.log("Two-leg PTB command map:");
  for (const command of getMoveCallCommandDetails(tx)) {
    const target = command.target ?? command.kind;
    console.log(`  command[${command.index}] / human ${command.oneBasedIndex}: ${command.kind} ${target}`);
    if (command.arguments.length > 0) {
      console.log(`    args: ${command.arguments.join("; ")}`);
    }
  }
}

function extractCommandIndexFromExecutionError(errorText) {
  const match = String(errorText).match(/\bcommand\s+(\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function formatCommandDiagnostic(command) {
  if (!command) {
    return "no matching command";
  }

  return `command[${command.index}] / human ${command.oneBasedIndex}: ${command.kind} ${command.target ?? "unknown"}`;
}

function explainCommandIndex(tx, errorText) {
  const parsedIndex = extractCommandIndexFromExecutionError(errorText);
  if (parsedIndex === null) {
    return;
  }

  const commands = getMoveCallCommandDetails(tx);
  const zeroBased = commands.find((command) => command.index === parsedIndex);
  const oneBased = commands.find((command) => command.oneBasedIndex === parsedIndex);

  console.log(`diagnostic command reference: ${parsedIndex}`);
  console.log(`if zero-based: ${formatCommandDiagnostic(zeroBased)}`);
  console.log(`if one-based: ${formatCommandDiagnostic(oneBased)}`);
}

function formatMoveCalls(calls) {
  return calls.map((call) => `${String(call.module ?? "unknown")}::${String(call.function ?? "unknown")}`).join(", ");
}

async function buildSerializedTransactionKind({ tx, client, sender }) {
  setTransactionSender(tx, sender);
  assertExpectedTwoLegMintTransaction(tx);
  const kindBytes = await tx.build({ client, onlyTransactionKind: true });
  return Buffer.from(kindBytes).toString("base64");
}

function buildSerializedTxKindCliArgs({ serializedKind, sender, gasBudgetMist, gasObjectId = null, dryRun = false }) {
  const args = [
    "client",
    "serialized-tx-kind",
    serializedKind,
    "--sender",
    sender,
    "--gas-budget",
    gasBudgetMist,
  ];

  if (gasObjectId) {
    args.push("--gas", gasObjectId);
  }

  if (dryRun) {
    args.push("--dry-run");
  }

  args.push("--json");
  return args;
}

async function dryRunTwoLegMintWithSuiCli({ tx, client, sender, gasBudgetMist, gasObjectId = null }) {
  setTransactionSender(tx, sender);
  assertExpectedTwoLegMintTransaction(tx);
  printTwoLegCommandMap(tx);

  const serializedKind = await buildSerializedTransactionKind({ tx, client, sender });
  const args = buildSerializedTxKindCliArgs({ serializedKind, sender, gasBudgetMist, gasObjectId, dryRun: true });
  const dryRun = await runSuiJson(args, "CLI dry-run");
  const dryRunStatus = requireExecutionSuccess(dryRun, "CLI dry-run");

  return {
    dryRun,
    dryRunStatus,
    gasBudgetMist,
    gasObjectId,
    gasUsed: extractGasUsed(dryRun),
  };
}

async function executeTwoLegMintWithSuiCli({ tx, client, sender, gasBudgetMist, gasObjectId = null }) {
  setTransactionSender(tx, sender);
  assertExpectedTwoLegMintTransaction(tx);

  const serializedKind = await buildSerializedTransactionKind({ tx, client, sender });
  const args = buildSerializedTxKindCliArgs({ serializedKind, sender, gasBudgetMist, gasObjectId, dryRun: false });
  const execution = await runSuiJson(args, "CLI execution");
  const executionStatus = requireExecutionSuccess(execution, "CLI execution");
  const digest = extractDigest(execution);

  if (!digest) {
    throw new Error("CLI execution succeeded but no transaction digest was found in the JSON response.");
  }

  return { execution, executionStatus, digest, gasBudgetMist, gasObjectId };
}

async function dryRunTwoLegMintWithSdk({ tx, client, sender, gasBudgetMist }) {
  setTransactionSender(tx, sender);

  if (typeof tx.setGasBudget === "function") {
    tx.setGasBudget(Number(gasBudgetMist));
  }

  assertExpectedTwoLegMintTransaction(tx);
  printTwoLegCommandMap(tx);

  const txBytes = await tx.build({ client });
  const dryRun = await client.dryRunTransactionBlock({ transactionBlock: txBytes });
  const dryRunStatus = requireExecutionSuccess(dryRun, "SDK dry-run");

  return {
    dryRun,
    dryRunStatus,
    gasBudgetMist,
    gasUsed: extractGasUsed(dryRun),
  };
}

function findGasUsedRecord(value) {
  if (Array.isArray(value)) {
    for (const child of value) {
      const nested = findGasUsedRecord(child);
      if (nested) {
        return nested;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (isRecord(value.gasUsed)) {
    return value.gasUsed;
  }

  if (isRecord(value.effects) && isRecord(value.effects.gasUsed)) {
    return value.effects.gasUsed;
  }

  for (const child of Object.values(value)) {
    const nested = findGasUsedRecord(child);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function extractGasUsed(value) {
  const gasUsed = findGasUsedRecord(value);
  if (!gasUsed) {
    return null;
  }

  return {
    computationCost: integerStringOrNull(gasUsed.computationCost),
    storageCost: integerStringOrNull(gasUsed.storageCost),
    storageRebate: integerStringOrNull(gasUsed.storageRebate),
    nonRefundableStorageFee: integerStringOrNull(gasUsed.nonRefundableStorageFee),
  };
}

function formatGasUsed(gasUsed) {
  if (!gasUsed) {
    return "unavailable";
  }

  return `computation=${gasUsed.computationCost ?? "?"} storage=${gasUsed.storageCost ?? "?"} rebate=${gasUsed.storageRebate ?? "?"} nonRefundable=${gasUsed.nonRefundableStorageFee ?? "?"}`;
}

function estimateNetGasChargeMist(gasUsed) {
  if (!gasUsed?.computationCost || !gasUsed?.storageCost || !gasUsed?.storageRebate) {
    return null;
  }

  return (BigInt(gasUsed.computationCost) + BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate)).toString();
}

async function tryCliDryRun({ tx, client, sender, gasBudgetMist, gasObjectId = null }) {
  try {
    const result = await dryRunTwoLegMintWithSuiCli({ tx, client, sender, gasBudgetMist, gasObjectId });
    return { status: "success", ...result, error: null };
  } catch (error) {
    const message = sanitizeCliError(error);
    explainCommandIndex(tx, message);
    return { status: "blocked", gasBudgetMist, gasObjectId, error: message, gasUsed: null };
  }
}

async function runCliGasBudgetDiagnostics({ tx, client, sender, gasBudgets, gasObjectId = null }) {
  const results = [];

  console.log("CLI dry-run gas diagnostics:");
  for (const gasBudgetMist of gasBudgets) {
    const result = await tryCliDryRun({ tx, client, sender, gasBudgetMist, gasObjectId });
    results.push(result);

    if (result.status === "success") {
      console.log(`  budget ${gasBudgetMist}: passed gas=${formatGasUsed(result.gasUsed)}`);
      break;
    }

    console.log(`  budget ${gasBudgetMist}: blocked ${result.error}`);
  }

  return results;
}

function classifyDryRunDiagnosis({ devInspectPassed, sdkDryRun, cliResults, explicitGasCliResults = null }) {
  const firstCliSuccess = cliResults.find((result) => result.status === "success");
  const firstCliBlocked = cliResults.find((result) => result.status === "blocked");

  if (!devInspectPassed) {
    return "devinspect_blocked";
  }

  if (firstCliSuccess && firstCliSuccess.gasBudgetMist !== mintGasBudgetMist) {
    return "gas_budget_too_low";
  }

  if (firstCliSuccess) {
    return "dry_run_passed";
  }

  if (sdkDryRun?.status === "success" && firstCliBlocked) {
    return explicitGasCliResults?.some((result) => result.status === "success")
      ? "cli_auto_gas_selection_behavior"
      : "cli_serialized_tx_kind_behavior_unresolved";
  }

  if (cliResults.length > 0 && cliResults.every((result) => result.status === "blocked" && /InsufficientGas/i.test(result.error ?? ""))) {
    return "not_resolved_by_budget";
  }

  return "command_or_protocol_condition";
}

function assertCanSubmitAtMostOneRealMint() {
  if (realMintSubmittedThisProcess) {
    throw new Error("Real mint submission blocked: one real mint was already submitted in this process.");
  }

  realMintSubmittedThisProcess = true;
}

async function assertCliEnvAndAddress({ expectedAddress }) {
  const [activeEnv, activeAddress] = await Promise.all([
    runSuiText(["client", "active-env"], "active-env"),
    runSuiText(["client", "active-address"], "active-address"),
  ]);
  const env = activeEnv.trim();
  const address = normalizeAddress(activeAddress.trim());

  console.log(`Active Sui env: ${env}`);
  console.log(`Active Sui address: ${address}`);

  if (env !== expectedCliEnv) {
    throw new Error(`Active Sui env must be ${expectedCliEnv}, got ${env}.`);
  }

  if (address !== normalizeAddress(expectedAddress)) {
    throw new Error(`Active Sui address must be ${expectedAddress}, got ${address}.`);
  }
}

async function runSuiJson(args, label) {
  const stdout = await runSuiText(args, label);

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${label} did not return JSON: ${sanitizeCliError(error)}; stdout=${sanitizeCliError(stdout.slice(0, 500))}`);
  }
}

async function runSuiText(args, label) {
  try {
    const result = await execFileAsync("sui", args, {
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
    });
    return result.stdout;
  } catch (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    const stdout = typeof error.stdout === "string" ? error.stdout.trim() : "";
    throw new Error(`${label} failed: ${sanitizeCliError(stderr || stdout || error)}`);
  }
}

function requireExecutionSuccess(value, label) {
  const status = extractExecutionStatus(value);

  if (status === "success") {
    return "passed";
  }

  const error = extractExecutionError(value) ?? "unknown execution failure";
  throw new Error(`${label} did not succeed: ${sanitizeCliError(error)}`);
}

function extractExecutionStatus(value) {
  const status = extractStatusRecord(value);

  if (!status) {
    return null;
  }

  if (status.status === "success" || status.status === "Success") {
    return "success";
  }

  if (status.status === "failure" || status.status === "Failure") {
    return "failure";
  }

  return null;
}

function extractStatusRecord(value) {
  if (!isRecord(value)) {
    return null;
  }

  if (isRecord(value.status) && typeof value.status.status === "string") {
    return value.status;
  }

  if (isRecord(value.effects) && isRecord(value.effects.status) && typeof value.effects.status.status === "string") {
    return value.effects.status;
  }

  for (const child of Object.values(value)) {
    if (isRecord(child)) {
      const nested = extractStatusRecord(child);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function extractExecutionError(value) {
  const status = extractStatusRecord(value);

  if (status && typeof status.error === "string") {
    return status.error;
  }

  if (isRecord(value) && typeof value.error === "string") {
    return value.error;
  }

  if (isRecord(value)) {
    for (const child of Object.values(value)) {
      if (isRecord(child)) {
        const nested = extractExecutionError(child);
        if (nested) {
          return nested;
        }
      }
    }
  }

  return null;
}

function extractDigest(value) {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.digest === "string") {
    return value.digest;
  }

  if (typeof value.transactionDigest === "string") {
    return value.transactionDigest;
  }

  if (typeof value.effects?.transactionDigest === "string") {
    return value.effects.transactionDigest;
  }

  for (const child of Object.values(value)) {
    if (isRecord(child)) {
      const nested = extractDigest(child);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

async function readObjectAddressOwner({ client, objectId }) {
  try {
    const result = await client.getObject({
      id: objectId,
      options: { showOwner: true },
    });
    const owner = extractAddressOwner(result.data?.owner);

    return { status: "success", owner, blocker: null };
  } catch (error) {
    return { status: "blocked", owner: null, blocker: sanitizeError(error) };
  }
}

function extractAddressOwner(owner) {
  if (typeof owner === "string") {
    return owner;
  }

  if (!isRecord(owner)) {
    return null;
  }

  if (typeof owner.AddressOwner === "string") {
    return owner.AddressOwner;
  }

  if (typeof owner.ObjectOwner === "string") {
    return owner.ObjectOwner;
  }

  return null;
}

function formatOwnerReadback(result) {
  if (!result) {
    return "skipped";
  }

  if (result.status === "success") {
    return result.owner ?? "unavailable";
  }

  return `blocked ${result.blocker}`;
}

async function readSuiGasBalance({ client, owner }) {
  try {
    const balance = await client.getBalance({ owner, coinType: "0x2::sui::SUI" });
    return {
      status: "success",
      totalBalance: integerStringOrNull(balance.totalBalance) ?? "0",
      coinObjectCount: Number(balance.coinObjectCount ?? 0),
      blocker: null,
    };
  } catch (error) {
    return {
      status: "blocked",
      totalBalance: null,
      coinObjectCount: 0,
      blocker: sanitizeError(error),
    };
  }
}

async function readSuiGasCoins({ client, owner }) {
  const coins = [];
  let cursor = null;

  do {
    const page = await client.getCoins({
      owner,
      coinType: "0x2::sui::SUI",
      cursor,
    });

    coins.push(...page.data);
    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return coins
    .map((coin) => ({
      coinObjectId: coin.coinObjectId,
      balance: integerStringOrNull(coin.balance) ?? "0",
      version: coin.version,
      digest: coin.digest,
    }))
    .sort((left, right) => compareBigInt(BigInt(right.balance), BigInt(left.balance)));
}

function printGasCoinSummary(coins, selectedGasCoinId = null) {
  console.log(`available gas coins: ${coins.length}`);
  const top = coins.slice(0, 5);

  for (const coin of top) {
    const selected = selectedGasCoinId && normalizeAddress(coin.coinObjectId) === normalizeAddress(selectedGasCoinId)
      ? " selected"
      : "";
    console.log(`  gas coin${selected}: id=${coin.coinObjectId} balance=${coin.balance} version=${coin.version}`);
  }

  if (coins.length > top.length) {
    console.log(`  ... ${coins.length - top.length} more gas coin(s) omitted`);
  }
}

function findGasCoinCoveringBudget(coins, gasBudgetMist) {
  return coins.find((coin) => BigInt(coin.balance) >= BigInt(gasBudgetMist));
}

function extractPositionMintedEvents(transactionBlock) {
  if (!isRecord(transactionBlock) || !Array.isArray(transactionBlock.events)) {
    return [];
  }

  return transactionBlock.events
    .filter((event) => typeof event.type === "string" && (event.type.endsWith("::predict::PositionMinted") || event.type.endsWith("::PositionMinted")))
    .map((event) => ({
      type: event.type,
      fields: pickPositionMintedFields(event.parsedJson),
    }));
}

function pickPositionMintedFields(value) {
  if (!isRecord(value)) {
    return {};
  }

  return pickFields(value, [
    "predict_id",
    "manager_id",
    "trader",
    "quote_asset",
    "oracle_id",
    "expiry",
    "strike",
    "is_up",
    "quantity",
    "cost",
    "ask_price",
  ]);
}

function pickFields(value, keys) {
  const picked = {};

  for (const key of keys) {
    if (key in value) {
      picked[key] = value[key];
    }
  }

  return picked;
}

function sumMintedEventCosts(events) {
  if (events.length === 0) {
    return null;
  }

  let total = 0n;

  for (const event of events) {
    const cost = integerStringOrNull(event.fields.cost);

    if (cost === null) {
      return null;
    }

    total += BigInt(cost);
  }

  return total;
}

function quantityDelta(before, after) {
  if (before.status !== "success" || after.status !== "success") {
    return null;
  }

  return BigInt(after.quantity) - BigInt(before.quantity);
}

function balanceDecrease(before, after) {
  if (before.status !== "success" || after.status !== "success") {
    return null;
  }

  return BigInt(before.balance) - BigInt(after.balance);
}

function setTransactionSender(tx, sender) {
  if (typeof tx.setSender === "function") {
    tx.setSender(sender);
  }
}

function devInspectStatus(result) {
  if (isRecord(result) && typeof result.error === "string") {
    return "failure";
  }

  const status = isRecord(result) && isRecord(result.effects) && isRecord(result.effects.status)
    ? result.effects.status
    : null;

  return status?.status === "success" ? "success" : "failure";
}

function devInspectError(result) {
  if (isRecord(result) && typeof result.error === "string") {
    return result.error;
  }

  const status = isRecord(result) && isRecord(result.effects) && isRecord(result.effects.status)
    ? result.effects.status
    : null;

  return typeof status?.error === "string" ? status.error : "devInspect did not return success.";
}

async function tryRead(source, read) {
  try {
    return { source, status: "success", value: await read() };
  } catch (error) {
    return { source, status: "error", value: null, error: sanitizeError(error) };
  }
}

function formatReadResult(result) {
  if (result.status === "error") {
    return `error=${result.error}`;
  }

  if (Array.isArray(result.value)) {
    return `success count=${result.value.length}`;
  }

  return "success";
}

function optionEnabled(options, name) {
  return options[name] === true || options[name] === "true";
}

function parsePositiveMistBudget(value, label, maxBudget) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error(`${label} must be a positive integer string in MIST.`);
  }

  const budget = BigInt(value);

  if (budget <= 0n) {
    throw new Error(`${label} must be greater than zero.`);
  }

  if (budget > maxBudget) {
    throw new Error(`${label} ${value} exceeds max allowed ${maxBudget.toString()} MIST.`);
  }

  return value;
}

function parseGasBudgetList(value, fallback, maxBudget) {
  if (value === undefined || value === null || value === true) {
    return fallback;
  }

  const parts = String(value).split(",").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    return fallback;
  }

  const seen = new Set();
  const budgets = [];

  for (const part of parts) {
    const budget = parsePositiveMistBudget(part, "diagnostic gas budget", maxBudget);
    if (!seen.has(budget)) {
      seen.add(budget);
      budgets.push(budget);
    }
  }

  return budgets;
}

function uniqueStrings(values) {
  const seen = new Set();
  const unique = [];

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      unique.push(value);
    }
  }

  return unique;
}

function parseMode(options) {
  if (options.read) {
    return "read";
  }

  if (options.preflight) {
    return "preflight";
  }

  if (options.mint) {
    return "mint";
  }

  if (options.mode === "read" || options.mode === "preflight" || options.mode === "mint") {
    return options.mode;
  }

  throw new Error("Usage: node scripts/validate-deepvol-binary-legs.mjs --mode read|preflight|mint [--sender <address>] [--manager <object-id>]");
}

function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    if (arg.includes("=")) {
      const [key, value] = arg.slice(2).split(/=(.*)/s, 2);
      options[key] = value;
      continue;
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
    throw new Error("DeepVol binary validation is only allowed against Sui Testnet config.");
  }
}

function formatAbort(abort) {
  return `${abort.module ?? "unknown"}::${abort.function ?? "unknown"} code=${abort.code ?? "unknown"} reason=${abort.knownReason ?? "unknown"} message=${abort.message}`;
}

function compareIntegerStrings(left, right) {
  const leftValue = integerStringOrNull(left);
  const rightValue = integerStringOrNull(right);

  if (leftValue === null && rightValue === null) {
    return 0;
  }

  if (leftValue === null) {
    return 1;
  }

  if (rightValue === null) {
    return -1;
  }

  return compareBigInt(BigInt(leftValue), BigInt(rightValue));
}

function compareBigInt(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function integerStringOrNull(value) {
  if (typeof value === "bigint") {
    return value >= 0n ? value.toString() : null;
  }

  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return value;
  }

  return null;
}

function stringOrNull(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeAddress(value) {
  const address = String(value).trim().toLowerCase();
  if (!address.startsWith("0x")) {
    return `0x${address}`;
  }

  return address;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeCliError(error) {
  return sanitizeError(error);
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const suiKeyPrefix = "sui" + "privkey1";
  const secretEnvName = "SUI_PRIVATE" + "_KEY";
  const phraseLabel = "mne" + "monic";

  return message
    .replace(/0x[0-9a-fA-F]{96,}/g, "[REDACTED_LONG_HEX]")
    .replace(new RegExp(`${suiKeyPrefix}[a-z0-9]+`, "gi"), "[REDACTED_SUI_SECRET]")
    .replace(new RegExp("Bearer\\s+sk-[A-Za-z0-9_-]+", "gi"), "Bearer [REDACTED_TOKEN]")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[REDACTED_TOKEN]")
    .replace(new RegExp(`${secretEnvName}\\s*=\\s*\\S+`, "gi"), `${secretEnvName}=[REDACTED]`)
    .replace(new RegExp(`${phraseLabel}\\s*[:=]\\s*[^\\n\\r]+`, "gi"), `${phraseLabel}=[REDACTED]`);
}
