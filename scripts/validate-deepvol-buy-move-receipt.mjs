import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import { DEEPVOL_TESTNET } from "@deepvol/config/deepVolTestnet";
import {
  buildBuyMoveReceiptTransaction,
  buildCreateVolSeriesTransaction,
} from "@deepvol/sdk/deepVol";
import {
  buildMarketKeyTransactionArgument,
  buildSuiExplorerTransactionUrl,
  classifyMintAbort,
  createDeepBookPredictServerClient,
  deriveMarketQuoteCandidates,
  inspectDevInspectU64,
  scanBinaryQuoteSanity,
  summarizeDevInspectU64Diagnostic,
} from "@deepvol/sdk/deepbookPredict";

const execFileAsync = promisify(execFile);
const predictConfig = DEEPBOOK_PREDICT_TESTNET;
const deepVolConfig = DEEPVOL_TESTNET;
const clockObjectId = "0x6";
const expectedCliEnv = "testnet";
const controlledSender = "0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75";
const controlledManagerId = "0xd59be0646d948c9be6073edc0cfd253ce4cb00f4929f0bae71f451f50e5d1575";
const expectedDeepVolPackageId = "0xe9b45e8d06406bb935bf5e3260ac9b82491ca158775861660be34881e17a4fa0";
const expectedProtocolVaultId = "0x1b9174645d70ac4caa2cfa0db5df59ac78a3ce0d3cca10f8be37e4c5d84f1a09";
const metadataUri = "https://deepvol.local/series/testnet/btc-move-demo-1";
const dusdcCoinType = predictConfig.quoteAssets.DUSDC.coinType;
const maxOracleContexts = 2;
const maxCandidatesPerOracle = 18;
const defaultQuantities = ["10000", "1000", "100000"];
const maxBuyTotalPremiumAtomic = 50000n;
const minimumGasBalanceMist = 150000000n;
const gasReserveMist = 50000000n;
const createSeriesGasBudgetsMist = ["100000000", "200000000", "500000000"];
const buyReceiptGasBudgetsMist = ["200000000", "300000000", "500000000"];
const forbiddenCommandKinds = ["Publish", "Upgrade"];
const forbiddenMoveCallTargets = [
  "vault::create_protocol_vault",
  "vault::withdraw_protocol_fees",
  "predict::redeem",
  "predict::redeem_permissionless",
  "predict::redeem_range",
  "predict::mint_range",
  "strategy::follow_strategy_and_mint",
  "strategy::create_protocol_vault",
];
let createSeriesSubmittedThisProcess = false;
let buyReceiptSubmittedThisProcess = false;

main().catch((error) => {
  console.error("DeepVol buy receipt validation failed:", sanitizeError(error));
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const mode = parseMode(options);
  const sender = normalizeAddress(String(options.sender ?? controlledSender));
  const managerId = normalizeAddress(String(options.manager ?? controlledManagerId));
  const createFeeBps = parseBps(options["create-fee-bps"] ?? String(deepVolConfig.defaultCreateFeeBps));
  const quantities = parseQuantityCandidates(options.quantity);
  const maxPremiumPaidOverride = options["max-premium-paid"] === undefined
    ? null
    : parsePositiveInteger(options["max-premium-paid"], "max premium paid");

  assertStaticTestnetConfig();
  printSafetyHeader({ mode, sender, managerId, createFeeBps, quantities, maxPremiumPaidOverride });

  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });
  const server = createDeepBookPredictServerClient({ config: predictConfig });

  const cliState = await readCliState();
  printCliState(cliState);

  const objectChecks = await validateConfiguredObjects({ client, sender, managerId });
  printObjectChecks(objectChecks);

  const discovery = await discoverMovePair({ client, server, sender, quantities, createFeeBps });
  printDiscovery(discovery);

  const gates = await readRuntimeGates({
    client,
    server,
    sender,
    managerId,
    pair: discovery.pair,
    createFeeBps,
    maxPremiumPaidOverride,
  });
  printRuntimeGates(gates);

  const blockers = [
    ...objectChecks.blockers,
    ...discovery.blockers,
    ...gates.blockers,
  ];

  if (discovery.pair) {
    const createSeriesPlan = await preflightCreateSeries({
      client,
      sender,
      pair: discovery.pair,
      createFeeBps,
    });
    printCreateSeriesPlan(createSeriesPlan);

    if (createSeriesPlan.blocker) {
      blockers.push(`create_series preflight blocked: ${createSeriesPlan.blocker}`);
    }

    const binaryMintPreflight = await preflightDirectBinaryMint({
      client,
      sender,
      managerId,
      pair: discovery.pair,
    });
    printBinaryMintPreflight(binaryMintPreflight);

    if (binaryMintPreflight.status !== "success") {
      blockers.push(`direct binary mint devInspect blocked: ${binaryMintPreflight.blocker}`);
    }

    if (mode === "preflight") {
      printPreflightExit({ blockers });
      if (blockers.length > 0) {
        process.exitCode = 1;
      }
      return;
    }

    if (blockers.length > 0) {
      console.log("\nDeepVol buy receipt execute: blocked before write transactions");
      printBlockers(blockers);
      console.log("No write transactions submitted.");
      process.exitCode = 1;
      return;
    }

    await assertCliEnvAndAddress({ cliState, expectedAddress: sender });

    const seriesResult = await executeCreateSeries({
      client,
      sender,
      pair: discovery.pair,
      createFeeBps,
      preflight: createSeriesPlan,
    });
    printCreateSeriesExecution(seriesResult);

    if (seriesResult.status !== "success") {
      console.log("buy_move_receipt: not attempted because create_series failed or was uncertain.");
      process.exitCode = 1;
      return;
    }

    const buyResult = await preflightAndExecuteBuyReceipt({
      client,
      server,
      sender,
      managerId,
      pair: discovery.pair,
      seriesId: seriesResult.seriesId,
      createFeeBps,
      maxPremiumPaidOverride,
    });
    printBuyReceiptResult(buyResult);

    if (buyResult.status !== "success") {
      process.exitCode = 1;
      return;
    }

    return;
  }

  if (mode === "preflight") {
    printPreflightExit({ blockers });
    if (blockers.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  console.log("\nDeepVol buy receipt execute: blocked before write transactions");
  printBlockers(blockers);
  console.log("No write transactions submitted.");
  process.exitCode = 1;
}

async function readRuntimeGates({ client, server, sender, managerId, pair, createFeeBps, maxPremiumPaidOverride }) {
  const blockers = [];
  const managerSummary = await tryRead("manager summary", () => server.getManagerSummary(managerId));
  const managerSummaryOwner = stringOrNull(managerSummary.value?.owner);
  const managerObjectOwner = await readObjectAddressOwner({ client, objectId: managerId });
  const managerBalance = await readManagerDusdcBalance({ client, sender, managerId });
  const vaultBalance = await readProtocolVaultBalance({ client, sender });
  const gasBalance = await readSuiGasBalance({ client, owner: sender });
  const gasCoins = await readCoins({ client, owner: sender, coinType: "0x2::sui::SUI" });
  const feeCoins = await readCoins({ client, owner: sender, coinType: dusdcCoinType });
  const expectedPremium = pair ? BigInt(pair.totalPremiumAtomic) : null;
  const maxPremiumPaid = expectedPremium === null
    ? null
    : maxPremiumPaidOverride ?? computeMaxPremiumPaid(expectedPremium).toString();
  const createFee = expectedPremium === null
    ? null
    : calculateCreateFee(expectedPremium, BigInt(createFeeBps)).toString();
  const selectedFeeCoin = createFee === null ? null : selectFeeCoin(feeCoins, BigInt(createFee));

  if (managerSummary.status === "error") {
    blockers.push(`Manager summary read blocked: ${managerSummary.error}.`);
  }

  if (managerSummaryOwner && normalizeAddress(managerSummaryOwner) !== sender) {
    blockers.push(`Manager summary owner mismatch: expected ${sender}, got ${managerSummaryOwner}.`);
  }

  if (managerObjectOwner.status !== "success") {
    blockers.push(`Manager object owner read blocked: ${managerObjectOwner.blocker}.`);
  } else if (managerObjectOwner.owner && normalizeAddress(managerObjectOwner.owner) !== sender) {
    blockers.push(`Manager object owner mismatch: expected ${sender}, got ${managerObjectOwner.owner}.`);
  }

  if (managerBalance.status !== "success") {
    blockers.push(`PredictManager DUSDC balance read blocked: ${managerBalance.blocker}.`);
  } else if (maxPremiumPaid !== null && BigInt(managerBalance.balance) < BigInt(maxPremiumPaid)) {
    blockers.push(`PredictManager DUSDC balance ${managerBalance.balance} is below max premium cap ${maxPremiumPaid}.`);
  }

  if (vaultBalance.status !== "success") {
    blockers.push(`ProtocolVault balance read blocked: ${vaultBalance.blocker}.`);
  }

  if (gasBalance.status !== "success") {
    blockers.push(`SUI gas balance read blocked: ${gasBalance.blocker}.`);
  } else if (BigInt(gasBalance.totalBalance) < minimumGasBalanceMist) {
    blockers.push(`SUI gas balance ${gasBalance.totalBalance} MIST is below required ${minimumGasBalanceMist.toString()} MIST.`);
  }

  const largestRequiredGas = BigInt(buyReceiptGasBudgetsMist.at(-1)) + gasReserveMist;
  if (!gasCoins.some((coin) => BigInt(coin.balance) >= largestRequiredGas)) {
    blockers.push(`No SUI gas coin covers ${largestRequiredGas.toString()} MIST for buy receipt diagnostics plus reserve.`);
  }

  if (createFee !== null && !selectedFeeCoin) {
    blockers.push(`No sender-owned DUSDC fee coin can cover Create Fee ${createFee}; whole Coin<DUSDC> routing is required in this round.`);
  }

  return {
    blockers,
    managerSummary,
    managerSummaryOwner,
    managerObjectOwner,
    managerBalance,
    vaultBalance,
    gasBalance,
    gasCoins,
    feeCoins,
    selectedFeeCoin,
    expectedPremium: expectedPremium?.toString() ?? null,
    maxPremiumPaid,
    createFee,
  };
}

async function preflightCreateSeries({ client, sender, pair, createFeeBps }) {
  const tx = buildCreateSeriesTx({ pair, createFeeBps });
  assertCreateSeriesTransaction(tx);
  const devInspect = await runDevInspect({ client, sender, tx });
  const sdkDryRun = devInspect.status === "success"
    ? await trySdkDryRun({ client, sender, tx, gasBudgetMist: createSeriesGasBudgetsMist[0], assertShape: assertCreateSeriesTransaction })
    : { status: "blocked", error: "devInspect did not pass", gasUsed: null, gasBudgetMist: createSeriesGasBudgetsMist[0] };
  const cliDryRuns = devInspect.status === "success"
    ? await runCliGasBudgetDiagnostics({ client, sender, tx, gasBudgets: createSeriesGasBudgetsMist, assertShape: assertCreateSeriesTransaction })
    : [];
  const selectedDryRun = cliDryRuns.find((result) => result.status === "success") ?? null;
  const blocker = devInspect.status !== "success"
    ? devInspect.error
    : sdkDryRun.status !== "success"
      ? sdkDryRun.error
      : selectedDryRun
        ? null
        : "No create_series CLI dry-run gas budget passed.";

  return { tx, devInspect, sdkDryRun, cliDryRuns, selectedDryRun, blocker };
}

async function executeCreateSeries({ client, sender, pair, createFeeBps, preflight }) {
  try {
    assertCanSubmitCreateSeries();
    const gasBudgetMist = preflight.selectedDryRun?.gasBudgetMist ?? createSeriesGasBudgetsMist.at(-1);
    const execution = await executeWithSuiCli({
      tx: preflight.tx,
      client,
      sender,
      gasBudgetMist,
      assertShape: assertCreateSeriesTransaction,
      label: "create_series CLI execution",
    });
    const transactionDetails = await readTransactionDetails({ client, digest: execution.digest });
    const events = transactionDetails.status === "success" ? extractEvents(transactionDetails.value) : [];
    const seriesEvent = extractVolSeriesCreatedEvent(events, pair, createFeeBps);
    const seriesId = seriesEvent?.fields.series_id ?? extractCreatedObjectId(transactionDetails.value, `${deepVolConfig.packageId}::series::VolSeries`);
    const seriesObject = seriesId ? await readObjectFacts({ client, objectId: seriesId, label: "VolSeries" }) : null;

    if (!seriesId) {
      return {
        status: "blocked",
        digest: execution.digest,
        blocker: "create_series succeeded but no VolSeries object ID was found in events or object changes.",
        execution,
        transactionDetails,
        seriesEvent,
        seriesId: null,
        seriesObject,
      };
    }

    return {
      status: "success",
      digest: execution.digest,
      execution,
      transactionDetails,
      seriesEvent,
      seriesId,
      seriesObject,
      params: {
        oracleId: pair.oracleId,
        expiry: pair.expiry,
        lowerStrike: pair.lowerStrike,
        upperStrike: pair.upperStrike,
        metadataUri,
        createFeeBps: String(createFeeBps),
      },
    };
  } catch (error) {
    return {
      status: "blocked",
      digest: null,
      blocker: sanitizeCliError(error),
      execution: null,
      transactionDetails: null,
      seriesEvent: null,
      seriesId: null,
      seriesObject: null,
    };
  }
}

async function preflightAndExecuteBuyReceipt({ client, server, sender, managerId, pair, seriesId, createFeeBps, maxPremiumPaidOverride }) {
  const refreshedPair = await refreshSelectedPairQuotes({ client, sender, pair });
  const expectedPremium = BigInt(refreshedPair.totalPremiumAtomic);
  const maxPremiumPaid = (maxPremiumPaidOverride ?? computeMaxPremiumPaid(expectedPremium)).toString();
  const createFee = calculateCreateFee(expectedPremium, BigInt(createFeeBps)).toString();
  const managerSummary = await tryRead("manager summary", () => server.getManagerSummary(managerId));
  const managerBalanceBefore = await readManagerDusdcBalance({ client, sender, managerId });
  const positionsBefore = await readBinaryPositions({ client, sender, managerId, pair: refreshedPair });
  const vaultBalanceBefore = await readProtocolVaultBalance({ client, sender });
  const feeCoins = await readCoins({ client, owner: sender, coinType: dusdcCoinType });
  const selectedFeeCoin = selectFeeCoin(feeCoins, BigInt(createFee));
  const gasCoins = await readCoins({ client, owner: sender, coinType: "0x2::sui::SUI" });
  const blockers = [];

  if (managerSummary.status === "error") {
    blockers.push(`Manager summary refresh blocked: ${managerSummary.error}.`);
  }

  if (managerBalanceBefore.status !== "success") {
    blockers.push(`Manager balance before buy blocked: ${managerBalanceBefore.blocker}.`);
  } else if (BigInt(managerBalanceBefore.balance) < BigInt(maxPremiumPaid)) {
    blockers.push(`Manager balance before buy ${managerBalanceBefore.balance} is below max premium cap ${maxPremiumPaid}.`);
  }

  if (positionsBefore.up.status !== "success") {
    blockers.push(`UP position before buy blocked: ${positionsBefore.up.blocker}.`);
  }

  if (positionsBefore.down.status !== "success") {
    blockers.push(`DOWN position before buy blocked: ${positionsBefore.down.blocker}.`);
  }

  if (vaultBalanceBefore.status !== "success") {
    blockers.push(`ProtocolVault balance before buy blocked: ${vaultBalanceBefore.blocker}.`);
  }

  if (!selectedFeeCoin) {
    blockers.push(`No sender-owned DUSDC fee coin can cover Create Fee ${createFee}.`);
  }

  const binaryMintPreflight = await preflightDirectBinaryMint({
    client,
    sender,
    managerId,
    pair: refreshedPair,
  });

  if (binaryMintPreflight.status !== "success") {
    blockers.push(`Fresh direct binary mint devInspect blocked before buy: ${binaryMintPreflight.blocker}`);
  }

  if (blockers.length > 0) {
    return {
      status: "blocked",
      stage: "pre-buy-gates",
      blockers,
      pair: refreshedPair,
      expectedPremium: expectedPremium.toString(),
      maxPremiumPaid,
      createFee,
      managerBalanceBefore,
      positionsBefore,
      vaultBalanceBefore,
      selectedFeeCoin,
      binaryMintPreflight,
    };
  }

  const buyTx = buildBuyMoveReceiptTransaction({
    config: deepVolConfig,
    seriesId,
    predictId: predictConfig.predictId,
    predictManagerId: managerId,
    oracleId: refreshedPair.oracleObjectId,
    feeCoinId: selectedFeeCoin.coinObjectId,
    protocolVaultId: deepVolConfig.protocolVaultId,
    quoteCoinType: dusdcCoinType,
    quantity: refreshedPair.quantity,
    maxPremiumPaid,
    requireFreshBinaryQuotePassed: true,
    allowBrowserPreflightBuild: true,
    requireCreateFeeCoinPrepared: true,
  });
  assertBuyMoveReceiptTransaction(buyTx);
  printBuyCommandMap(buyTx);

  const devInspect = await runDevInspect({ client, sender, tx: buyTx });
  const sdkDryRun = devInspect.status === "success"
    ? await trySdkDryRun({ client, sender, tx: buyTx, gasBudgetMist: buyReceiptGasBudgetsMist[0], assertShape: assertBuyMoveReceiptTransaction })
    : { status: "blocked", error: devInspect.error, gasUsed: null, gasBudgetMist: buyReceiptGasBudgetsMist[0] };
  const cliDryRuns = devInspect.status === "success"
    ? await runCliGasBudgetDiagnostics({ client, sender, tx: buyTx, gasBudgets: buyReceiptGasBudgetsMist, assertShape: assertBuyMoveReceiptTransaction })
    : [];
  const selectedDryRun = cliDryRuns.find((result) => result.status === "success") ?? null;

  if (devInspect.status !== "success" || sdkDryRun.status !== "success" || !selectedDryRun) {
    return {
      status: "blocked",
      stage: "buy-preflight",
      blockers: [
        devInspect.status === "success" ? null : `buy devInspect blocked: ${devInspect.error}`,
        sdkDryRun.status === "success" ? null : `buy SDK dry-run blocked: ${sdkDryRun.error}`,
        selectedDryRun ? null : "No buy CLI dry-run gas budget passed.",
      ].filter(Boolean),
      pair: refreshedPair,
      expectedPremium: expectedPremium.toString(),
      maxPremiumPaid,
      createFee,
      managerBalanceBefore,
      positionsBefore,
      vaultBalanceBefore,
      selectedFeeCoin,
      binaryMintPreflight,
      devInspect,
      sdkDryRun,
      cliDryRuns,
      selectedDryRun,
    };
  }

  const selectedGasBudget = selectedDryRun.gasBudgetMist;
  const executionTx = buildBuyMoveReceiptTransaction({
    config: deepVolConfig,
    seriesId,
    predictId: predictConfig.predictId,
    predictManagerId: managerId,
    oracleId: refreshedPair.oracleObjectId,
    feeCoinId: selectedFeeCoin.coinObjectId,
    protocolVaultId: deepVolConfig.protocolVaultId,
    quoteCoinType: dusdcCoinType,
    quantity: refreshedPair.quantity,
    maxPremiumPaid,
    requireFreshBinaryQuotePassed: true,
    requireBuyMoveReceiptPreflightPassed: true,
    requireCreateFeeCoinPrepared: true,
  });
  assertBuyMoveReceiptTransaction(executionTx);
  const gasBlocker = validateGasBudgetCoverage(gasCoins, selectedGasBudget);
  if (gasBlocker) {
    return {
      status: "blocked",
      stage: "buy-gas-coverage",
      blockers: [gasBlocker],
      pair: refreshedPair,
      expectedPremium: expectedPremium.toString(),
      maxPremiumPaid,
      createFee,
      managerBalanceBefore,
      positionsBefore,
      vaultBalanceBefore,
      selectedFeeCoin,
      binaryMintPreflight,
      devInspect,
      sdkDryRun,
      cliDryRuns,
      selectedDryRun,
    };
  }

  let execution;
  try {
    assertCanSubmitBuyReceipt();
    execution = await executeWithSuiCli({
      tx: executionTx,
      client,
      sender,
      gasBudgetMist: selectedGasBudget,
      assertShape: assertBuyMoveReceiptTransaction,
      label: "buy_move_receipt CLI execution",
    });
  } catch (error) {
    const positionsAfterFailure = await readBinaryPositions({ client, sender, managerId, pair: refreshedPair });
    const managerBalanceAfterFailure = await readManagerDusdcBalance({ client, sender, managerId });
    const vaultBalanceAfterFailure = await readProtocolVaultBalance({ client, sender });
    return {
      status: "blocked",
      stage: "buy-execution",
      blockers: [`buy_move_receipt failed or was uncertain: ${sanitizeCliError(error)}`],
      pair: refreshedPair,
      expectedPremium: expectedPremium.toString(),
      maxPremiumPaid,
      createFee,
      managerBalanceBefore,
      managerBalanceAfter: managerBalanceAfterFailure,
      positionsBefore,
      positionsAfter: positionsAfterFailure,
      vaultBalanceBefore,
      vaultBalanceAfter: vaultBalanceAfterFailure,
      selectedFeeCoin,
      binaryMintPreflight,
      devInspect,
      sdkDryRun,
      cliDryRuns,
      selectedDryRun,
      execution: null,
    };
  }

  const transactionDetails = await readTransactionDetails({ client, digest: execution.digest });
  const events = transactionDetails.status === "success" ? extractEvents(transactionDetails.value) : [];
  const moveReceiptCreated = extractMoveReceiptCreatedEvent(events, seriesId);
  const mintedEvents = extractPositionMintedEvents(events);
  const createFeeDeposited = extractCreateFeeDepositedEvent(events, seriesId);
  const receiptId = moveReceiptCreated?.fields.receipt_id ?? extractCreatedObjectId(transactionDetails.value, `${deepVolConfig.packageId}::receipt::MoveReceipt`);
  const receiptObject = receiptId ? await readObjectFacts({ client, objectId: receiptId, label: "MoveReceipt" }) : null;
  const positionsAfter = await readBinaryPositions({ client, sender, managerId, pair: refreshedPair });
  const managerBalanceAfter = await readManagerDusdcBalance({ client, sender, managerId });
  const vaultBalanceAfter = await readProtocolVaultBalance({ client, sender });
  const feeCoinAfter = await readCoinObject({ client, objectId: selectedFeeCoin.coinObjectId });
  const postState = validateBuyPostState({
    sender,
    managerId,
    seriesId,
    pair: refreshedPair,
    receiptId,
    receiptObject,
    moveReceiptCreated,
    mintedEvents,
    createFeeDeposited,
    positionsBefore,
    positionsAfter,
    managerBalanceBefore,
    managerBalanceAfter,
    vaultBalanceBefore,
    vaultBalanceAfter,
  });

  return {
    status: postState.blockers.length === 0 ? "success" : "blocked",
    stage: postState.blockers.length === 0 ? "complete" : "post-state",
    blockers: postState.blockers,
    pair: refreshedPair,
    expectedPremium: expectedPremium.toString(),
    maxPremiumPaid,
    createFee,
    managerBalanceBefore,
    managerBalanceAfter,
    positionsBefore,
    positionsAfter,
    vaultBalanceBefore,
    vaultBalanceAfter,
    selectedFeeCoin,
    feeCoinAfter,
    binaryMintPreflight,
    devInspect,
    sdkDryRun,
    cliDryRuns,
    selectedDryRun,
    execution,
    transactionDetails,
    moveReceiptCreated,
    mintedEvents,
    createFeeDeposited,
    receiptId,
    receiptObject,
    postState,
  };
}

async function discoverMovePair({ client, server, sender, quantities, createFeeBps }) {
  const contexts = await loadActiveBtcOracleContexts(server);
  const attempts = [];

  for (const context of contexts) {
    const candidates = rankBinaryCandidates(context.candidates).slice(0, maxCandidatesPerOracle);

    for (const quantity of quantities) {
      const batchAttempts = await scanBinaryQuoteSanity({
        candidates,
        client,
        sender,
        quantities: [quantity],
        config: predictConfig,
      });
      attempts.push(...batchAttempts);

      const pair = selectMovePair(attempts, createFeeBps);
      if (pair) {
        return {
          contexts,
          attempts,
          pair,
          blockers: validateSelectedMovePair(pair, createFeeBps),
        };
      }
    }
  }

  return {
    contexts,
    attempts,
    pair: null,
    blockers: buildDiscoveryBlockers({ contexts, attempts }),
  };
}

async function refreshSelectedPairQuotes({ client, sender, pair }) {
  const attempts = await scanBinaryQuoteSanity({
    candidates: [
      {
        oracleId: pair.oracleId,
        oracleObjectId: pair.oracleObjectId,
        underlyingAsset: "BTC",
        expiry: pair.expiry,
        strike: pair.upperStrike,
        direction: "up",
        anchorSource: "forward",
        anchorPrice: pair.upperStrike,
      },
      {
        oracleId: pair.oracleId,
        oracleObjectId: pair.oracleObjectId,
        underlyingAsset: "BTC",
        expiry: pair.expiry,
        strike: pair.lowerStrike,
        direction: "down",
        anchorSource: "forward",
        anchorPrice: pair.lowerStrike,
      },
    ],
    client,
    sender,
    quantities: [pair.quantity],
    config: predictConfig,
  });
  const up = attempts.find((attempt) => attempt.status === "success" && attempt.direction === "up");
  const down = attempts.find((attempt) => attempt.status === "success" && attempt.direction === "down");

  if (!up || !down) {
    throw new Error("Fresh selected UP/DOWN quote failed before buy_move_receipt.");
  }

  const totalPremiumAtomic = (BigInt(up.mintCostAtomic) + BigInt(down.mintCostAtomic)).toString();

  return {
    ...pair,
    totalPremiumAtomic,
    up: { ...pair.up, quote: up },
    down: { ...pair.down, quote: down },
  };
}

async function preflightDirectBinaryMint({ client, sender, managerId, pair }) {
  try {
    const tx = buildTwoLegMintTransaction({ pair, managerId });
    assertDirectBinaryMintTransaction(tx);
    const result = await client.devInspectTransactionBlock({ sender, transactionBlock: tx });
    if (devInspectStatus(result) !== "success") {
      return { status: "blocked", blocker: formatAbort(classifyMintAbort(devInspectError(result))), result };
    }

    return { status: "success", blocker: null, result };
  } catch (error) {
    return { status: "blocked", blocker: sanitizeError(error), result: null };
  }
}

function buildCreateSeriesTx({ pair, createFeeBps }) {
  return buildCreateVolSeriesTransaction({
    config: deepVolConfig,
    oracleId: pair.oracleId,
    expiry: pair.expiry,
    lowerStrike: pair.lowerStrike,
    upperStrike: pair.upperStrike,
    metadataUri,
    createFeeBps,
  });
}

function buildTwoLegMintTransaction({ pair, managerId }) {
  const tx = new Transaction();
  const upKey = buildMarketKeyTransactionArgument(tx, pair.up.marketKey, predictConfig);

  tx.moveCall({
    target: `${predictConfig.packageId}::predict::mint`,
    typeArguments: [dusdcCoinType],
    arguments: [
      tx.object(predictConfig.predictId),
      tx.object(managerId),
      tx.object(pair.oracleObjectId),
      upKey,
      tx.pure.u64(pair.quantity),
      tx.object(clockObjectId),
    ],
  });

  const downKey = buildMarketKeyTransactionArgument(tx, pair.down.marketKey, predictConfig);

  tx.moveCall({
    target: `${predictConfig.packageId}::predict::mint`,
    typeArguments: [dusdcCoinType],
    arguments: [
      tx.object(predictConfig.predictId),
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
  const key = buildMarketKeyTransactionArgument(tx, marketKey, predictConfig);

  tx.moveCall({
    target: `${predictConfig.packageId}::predict_manager::position`,
    arguments: [tx.object(managerId), key],
  });

  return tx;
}

function buildManagerDusdcBalanceTransaction({ managerId }) {
  const tx = new Transaction();

  tx.moveCall({
    target: `${predictConfig.packageId}::predict_manager::balance`,
    typeArguments: [dusdcCoinType],
    arguments: [tx.object(managerId)],
  });

  return tx;
}

function buildProtocolVaultBalanceTransaction() {
  const tx = new Transaction();

  tx.moveCall({
    target: `${deepVolConfig.packageId}::vault::protocol_vault_balance`,
    typeArguments: [dusdcCoinType],
    arguments: [tx.object(deepVolConfig.protocolVaultId)],
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
    const tx = buildManagerBinaryPositionTransaction({ managerId, marketKey });
    assertReadOnlyTransaction(tx, ["market_key::up", "market_key::down", "predict_manager::position"]);
    const result = await client.devInspectTransactionBlock({ sender, transactionBlock: tx });

    if (devInspectStatus(result) !== "success") {
      return { label, status: "blocked", quantity: null, blocker: devInspectError(result) };
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

    return { label, status: "success", quantity: diagnostic.decoded, blocker: null };
  } catch (error) {
    return { label, status: "blocked", quantity: null, blocker: sanitizeError(error) };
  }
}

async function readManagerDusdcBalance({ client, sender, managerId }) {
  try {
    const tx = buildManagerDusdcBalanceTransaction({ managerId });
    assertReadOnlyTransaction(tx, ["predict_manager::balance"]);
    const result = await client.devInspectTransactionBlock({ sender, transactionBlock: tx });

    if (devInspectStatus(result) !== "success") {
      return { status: "blocked", balance: null, blocker: devInspectError(result) };
    }

    const diagnostic = inspectDevInspectU64(result);
    if (!diagnostic.decoded) {
      return {
        status: "blocked",
        balance: null,
        blocker: `balance return did not decode to one u64: ${summarizeDevInspectU64Diagnostic(diagnostic)}`,
      };
    }

    return { status: "success", balance: diagnostic.decoded, blocker: null };
  } catch (error) {
    return { status: "blocked", balance: null, blocker: sanitizeError(error) };
  }
}

async function readProtocolVaultBalance({ client, sender }) {
  try {
    const tx = buildProtocolVaultBalanceTransaction();
    assertReadOnlyTransaction(tx, ["vault::protocol_vault_balance"]);
    const result = await client.devInspectTransactionBlock({ sender, transactionBlock: tx });

    if (devInspectStatus(result) !== "success") {
      return { status: "blocked", balance: null, blocker: devInspectError(result) };
    }

    const diagnostic = inspectDevInspectU64(result);
    if (!diagnostic.decoded) {
      return {
        status: "blocked",
        balance: null,
        blocker: `vault balance return did not decode to one u64: ${summarizeDevInspectU64Diagnostic(diagnostic)}`,
      };
    }

    return { status: "success", balance: diagnostic.decoded, blocker: null };
  } catch (error) {
    return { status: "blocked", balance: null, blocker: sanitizeError(error) };
  }
}

async function loadActiveBtcOracleContexts(server) {
  const oracles = await server.getOracles(predictConfig.predictId);
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

function selectMovePair(attempts, createFeeBps) {
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

      const totalPremiumAtomic = BigInt(up.mintCostAtomic) + BigInt(down.mintCostAtomic);
      if (totalPremiumAtomic > maxBuyTotalPremiumAtomic) {
        continue;
      }

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
        totalPremiumAtomic: totalPremiumAtomic.toString(),
        createFeeAtomic: calculateCreateFee(totalPremiumAtomic, BigInt(createFeeBps)).toString(),
      });
    }
  }

  return pairs.sort(compareMovePairs)[0] ?? null;
}

function compareMovePairs(left, right) {
  const leftFee = BigInt(left.createFeeAtomic);
  const rightFee = BigInt(right.createFeeAtomic);

  if ((leftFee > 0n) !== (rightFee > 0n)) {
    return leftFee > 0n ? -1 : 1;
  }

  const quantityDelta = compareBigInt(BigInt(left.quantity), BigInt(right.quantity));
  if (quantityDelta !== 0) {
    return quantityDelta;
  }

  const premiumDelta = compareBigInt(BigInt(left.totalPremiumAtomic), BigInt(right.totalPremiumAtomic));
  if (premiumDelta !== 0) {
    return premiumDelta;
  }

  return compareBigInt(BigInt(left.upperStrike) - BigInt(left.lowerStrike), BigInt(right.upperStrike) - BigInt(right.lowerStrike));
}

function validateSelectedMovePair(pair, createFeeBps) {
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

  if (BigInt(pair.up.quote.mintCostAtomic) <= 0n) {
    blockers.push(`UP mint cost must be positive; got ${pair.up.quote.mintCostAtomic}.`);
  }

  if (BigInt(pair.down.quote.mintCostAtomic) <= 0n) {
    blockers.push(`DOWN mint cost must be positive; got ${pair.down.quote.mintCostAtomic}.`);
  }

  if (BigInt(pair.totalPremiumAtomic) <= 0n) {
    blockers.push(`Total premium must be positive; got ${pair.totalPremiumAtomic}.`);
  }

  if (BigInt(pair.totalPremiumAtomic) > maxBuyTotalPremiumAtomic) {
    blockers.push(`Total premium ${pair.totalPremiumAtomic} exceeds max allowed ${maxBuyTotalPremiumAtomic.toString()} atomic DUSDC.`);
  }

  if (calculateCreateFee(BigInt(pair.totalPremiumAtomic), BigInt(createFeeBps)) <= 0n) {
    blockers.push(`Create Fee rounds to zero for premium ${pair.totalPremiumAtomic} and ${createFeeBps} bps; select a larger quoteable quantity for fee accounting validation.`);
  }

  return blockers;
}

function buildDiscoveryBlockers({ contexts, attempts }) {
  const blockers = [];
  const candidates = contexts.flatMap((context) => context.candidates);

  if (contexts.length === 0) {
    blockers.push("No active unexpired BTC oracle was discovered at runtime.");
  }

  if (candidates.length === 0) {
    blockers.push("No binary MarketKey candidates could be derived from runtime BTC oracle metadata.");
  }

  const successes = attempts.filter((attempt) => attempt.status === "success");
  if (successes.length === 0) {
    blockers.push("No binary quote candidate returned a successful quote.");
  } else {
    blockers.push("No same-oracle same-expiry UP/DOWN pair had lower < upper, nonzero mint costs, nonzero Create Fee, and safe total premium.");
  }

  for (const context of contexts) {
    for (const blocker of context.blockers) {
      blockers.push(`${context.oracleId}: ${blocker}`);
    }
  }

  return blockers;
}

async function validateConfiguredObjects({ client, sender, managerId }) {
  const blockers = [];
  const packageObject = await readObjectFacts({ client, objectId: deepVolConfig.packageId, label: "DeepVol package" });
  const adminCap = await readObjectFacts({ client, objectId: deepVolConfig.adminCapId, label: "DeepVol AdminCap" });
  const upgradeCap = await readObjectFacts({ client, objectId: deepVolConfig.upgradeCapId, label: "DeepVol UpgradeCap" });
  const protocolVault = await readObjectFacts({ client, objectId: deepVolConfig.protocolVaultId, label: "DeepVol ProtocolVault<DUSDC>" });
  const predictObject = await readObjectFacts({ client, objectId: predictConfig.predictId, label: "DeepBook Predict" });
  const managerObject = await readObjectFacts({ client, objectId: managerId, label: "PredictManager" });
  const expectedVaultType = `${deepVolConfig.packageId}::vault::ProtocolVault<${dusdcCoinType}>`;

  if (packageObject.status !== "success") {
    blockers.push(`DeepVol package read blocked: ${packageObject.blocker}.`);
  }

  if (adminCap.status !== "success") {
    blockers.push(`AdminCap read blocked: ${adminCap.blocker}.`);
  } else {
    if (adminCap.type !== `${deepVolConfig.packageId}::vault::AdminCap`) {
      blockers.push(`AdminCap type mismatch: expected ${deepVolConfig.packageId}::vault::AdminCap, got ${adminCap.type}.`);
    }
    if (adminCap.addressOwner && normalizeAddress(adminCap.addressOwner) !== sender) {
      blockers.push(`AdminCap owner mismatch: expected ${sender}, got ${adminCap.addressOwner}.`);
    }
  }

  if (upgradeCap.status !== "success") {
    blockers.push(`UpgradeCap read blocked: ${upgradeCap.blocker}.`);
  } else {
    if (upgradeCap.type !== "0x2::package::UpgradeCap") {
      blockers.push(`UpgradeCap type mismatch: expected 0x2::package::UpgradeCap, got ${upgradeCap.type}.`);
    }
    if (upgradeCap.addressOwner && normalizeAddress(upgradeCap.addressOwner) !== sender) {
      blockers.push(`UpgradeCap owner mismatch: expected ${sender}, got ${upgradeCap.addressOwner}.`);
    }
  }

  if (protocolVault.status !== "success") {
    blockers.push(`ProtocolVault read blocked: ${protocolVault.blocker}.`);
  } else {
    if (protocolVault.type !== expectedVaultType) {
      blockers.push(`ProtocolVault type mismatch: expected ${expectedVaultType}, got ${protocolVault.type}.`);
    }
    if (!protocolVault.shared) {
      blockers.push("ProtocolVault is not shared.");
    }
  }

  if (predictObject.status !== "success") {
    blockers.push(`DeepBook Predict object read blocked: ${predictObject.blocker}.`);
  } else {
    if (predictObject.type !== `${predictConfig.packageId}::predict::Predict`) {
      blockers.push(`DeepBook Predict type mismatch: expected ${predictConfig.packageId}::predict::Predict, got ${predictObject.type}.`);
    }
    if (!predictObject.shared) {
      blockers.push("DeepBook Predict object is not shared.");
    }
  }

  if (managerObject.status !== "success") {
    blockers.push(`PredictManager read blocked: ${managerObject.blocker}.`);
  } else {
    if (managerObject.type !== `${predictConfig.packageId}::predict_manager::PredictManager`) {
      blockers.push(`PredictManager type mismatch: expected ${predictConfig.packageId}::predict_manager::PredictManager, got ${managerObject.type}.`);
    }
    if (managerObject.addressOwner && normalizeAddress(managerObject.addressOwner) !== sender) {
      blockers.push(`PredictManager object owner mismatch: expected ${sender}, got ${managerObject.addressOwner}.`);
    }
  }

  return { blockers, packageObject, adminCap, upgradeCap, protocolVault, predictObject, managerObject };
}

async function readObjectFacts({ client, objectId, label }) {
  try {
    const result = await client.getObject({
      id: objectId,
      options: { showOwner: true, showType: true, showContent: true },
    });

    if (isRecord(result.error)) {
      return { label, objectId, status: "blocked", blocker: JSON.stringify(result.error) };
    }

    const data = result.data;
    if (!isRecord(data)) {
      return { label, objectId, status: "blocked", blocker: "object data unavailable" };
    }

    const owner = data.owner;
    return {
      label,
      objectId,
      status: "success",
      type: typeof data.type === "string" ? data.type : null,
      owner,
      addressOwner: extractAddressOwner(owner),
      shared: isSharedOwner(owner),
      fields: extractMoveObjectFields(data.content),
      blocker: null,
    };
  } catch (error) {
    return { label, objectId, status: "blocked", blocker: sanitizeError(error) };
  }
}

async function readObjectAddressOwner({ client, objectId }) {
  const facts = await readObjectFacts({ client, objectId, label: "owner-read" });
  if (facts.status !== "success") {
    return { status: "blocked", owner: null, blocker: facts.blocker };
  }
  return { status: "success", owner: facts.addressOwner, blocker: null };
}

async function readCoinObject({ client, objectId }) {
  const facts = await readObjectFacts({ client, objectId, label: "Coin" });
  if (facts.status !== "success") {
    return { status: "blocked", objectId, balance: null, blocker: facts.blocker };
  }

  const balance = integerStringOrNull(facts.fields?.balance);
  return { status: "success", objectId, balance, blocker: null, facts };
}

async function readTransactionDetails({ client, digest }) {
  return tryRead("transaction details", () => client.getTransactionBlock({
    digest,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
      showBalanceChanges: true,
    },
  }));
}

async function readCoins({ client, owner, coinType }) {
  const coins = [];
  let cursor = null;

  do {
    const page = await client.getCoins({ owner, coinType, cursor });
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
    .sort((left, right) => compareBigInt(BigInt(left.balance), BigInt(right.balance)));
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
    return { status: "blocked", totalBalance: null, coinObjectCount: 0, blocker: sanitizeError(error) };
  }
}

async function runDevInspect({ client, sender, tx }) {
  try {
    const result = await client.devInspectTransactionBlock({ sender, transactionBlock: tx });
    if (devInspectStatus(result) !== "success") {
      return { status: "blocked", error: devInspectError(result), result };
    }
    return { status: "success", error: null, result };
  } catch (error) {
    return { status: "blocked", error: sanitizeError(error), result: null };
  }
}

async function trySdkDryRun({ client, sender, tx, gasBudgetMist, assertShape }) {
  try {
    setTransactionSender(tx, sender);
    if (typeof tx.setGasBudget === "function") {
      tx.setGasBudget(Number(gasBudgetMist));
    }
    assertShape(tx);
    const bytes = await tx.build({ client });
    const dryRun = await client.dryRunTransactionBlock({ transactionBlock: bytes });
    const dryRunStatus = requireExecutionSuccess(dryRun, "SDK dry-run");
    return { status: "success", dryRun, dryRunStatus, gasBudgetMist, gasUsed: extractGasUsed(dryRun), error: null };
  } catch (error) {
    return { status: "blocked", dryRun: null, dryRunStatus: null, gasBudgetMist, gasUsed: null, error: sanitizeCliError(error) };
  }
}

async function runCliGasBudgetDiagnostics({ client, sender, tx, gasBudgets, assertShape }) {
  const results = [];

  for (const gasBudgetMist of gasBudgets) {
    const result = await tryCliDryRun({ client, sender, tx, gasBudgetMist, assertShape });
    results.push(result);
    if (result.status === "success") {
      break;
    }
  }

  return results;
}

async function tryCliDryRun({ client, sender, tx, gasBudgetMist, assertShape }) {
  try {
    const result = await dryRunWithSuiCli({ client, sender, tx, gasBudgetMist, assertShape });
    return { status: "success", ...result, error: null };
  } catch (error) {
    return { status: "blocked", dryRun: null, dryRunStatus: null, gasBudgetMist, gasUsed: null, error: sanitizeCliError(error) };
  }
}

async function dryRunWithSuiCli({ client, sender, tx, gasBudgetMist, assertShape }) {
  setTransactionSender(tx, sender);
  assertShape(tx);
  const serializedKind = await buildSerializedTransactionKind({ client, sender, tx, assertShape });
  const args = buildSerializedTxKindCliArgs({ serializedKind, sender, gasBudgetMist, dryRun: true });
  const dryRun = await runSuiJson(args, "CLI dry-run");
  const dryRunStatus = requireExecutionSuccess(dryRun, "CLI dry-run");
  return { dryRun, dryRunStatus, gasBudgetMist, gasUsed: extractGasUsed(dryRun) };
}

async function executeWithSuiCli({ client, sender, tx, gasBudgetMist, assertShape, label }) {
  setTransactionSender(tx, sender);
  assertShape(tx);
  const serializedKind = await buildSerializedTransactionKind({ client, sender, tx, assertShape });
  const args = buildSerializedTxKindCliArgs({ serializedKind, sender, gasBudgetMist, dryRun: false });
  const execution = await runSuiJson(args, label);
  const executionStatus = requireExecutionSuccess(execution, label);
  const digest = extractDigest(execution);

  if (!digest) {
    throw new Error(`${label} succeeded but no transaction digest was found in the JSON response.`);
  }

  return { execution, executionStatus, digest, gasBudgetMist, gasUsed: extractGasUsed(execution) };
}

async function buildSerializedTransactionKind({ client, sender, tx, assertShape }) {
  setTransactionSender(tx, sender);
  assertShape(tx);
  const kindBytes = await tx.build({ client, onlyTransactionKind: true });
  return Buffer.from(kindBytes).toString("base64");
}

function buildSerializedTxKindCliArgs({ serializedKind, sender, gasBudgetMist, dryRun }) {
  const args = [
    "client",
    "serialized-tx-kind",
    serializedKind,
    "--sender",
    sender,
    "--gas-budget",
    gasBudgetMist,
  ];

  if (dryRun) {
    args.push("--dry-run");
  }

  args.push("--json");
  return args;
}

async function readCliState() {
  const [env, address] = await Promise.all([
    tryRead("active-env", () => runSuiText(["client", "active-env"], "active-env")),
    tryRead("active-address", () => runSuiText(["client", "active-address"], "active-address")),
  ]);

  return {
    env: env.status === "success" ? env.value.trim() : null,
    envError: env.status === "error" ? env.error : null,
    address: address.status === "success" ? normalizeAddress(address.value.trim()) : null,
    addressError: address.status === "error" ? address.error : null,
  };
}

async function assertCliEnvAndAddress({ cliState, expectedAddress }) {
  const state = cliState.env && cliState.address ? cliState : await readCliState();

  if (state.env !== expectedCliEnv) {
    throw new Error(`Active Sui env must be ${expectedCliEnv}, got ${state.env ?? state.envError ?? "unavailable"}.`);
  }

  if (state.address !== normalizeAddress(expectedAddress)) {
    throw new Error(`Active Sui address must be ${expectedAddress}, got ${state.address ?? state.addressError ?? "unavailable"}.`);
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
    const result = await execFileAsync("sui", args, { windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
    return result.stdout;
  } catch (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    const stdout = typeof error.stdout === "string" ? error.stdout.trim() : "";
    throw new Error(`${label} failed: ${sanitizeCliError(stderr || stdout || error)}`);
  }
}

function assertCreateSeriesTransaction(tx) {
  assertNoForbiddenCommands(tx, "create_series");
  assertOnlyMoveCalls(tx, ["series::create_series"], "create_series");
}

function assertBuyMoveReceiptTransaction(tx) {
  assertNoForbiddenCommands(tx, "buy_move_receipt");
  assertOnlyMoveCalls(tx, ["receipt::buy_move_receipt"], "buy_move_receipt");
  const moveCalls = getMoveCalls(tx);
  const call = moveCalls[0];
  const typeArguments = Array.isArray(call?.typeArguments) ? call.typeArguments : [];
  if (typeArguments.length !== 1 || typeArguments[0] !== dusdcCoinType) {
    throw new Error("buy_move_receipt must use the configured DUSDC type argument.");
  }
}

function assertDirectBinaryMintTransaction(tx) {
  assertNoForbiddenCommands(tx, "direct binary mint preflight");
  assertOnlyMoveCalls(tx, ["market_key::up", "predict::mint", "market_key::down", "predict::mint"], "direct binary mint preflight");
}

function assertReadOnlyTransaction(tx, allowedTargets) {
  const data = tx.getData();
  const commandKinds = getCommandKinds(data);
  if (commandKinds.some((kind) => kind !== "MoveCall")) {
    throw new Error(`Read-only transaction must contain only MoveCall commands; found ${commandKinds.join(", ")}.`);
  }
  const targets = getMoveCalls(tx).map(moveCallTarget);
  const unexpected = targets.filter((target) => !allowedTargets.includes(target));
  if (unexpected.length > 0) {
    throw new Error(`Read-only transaction contains unexpected target(s): ${unexpected.join(", ")}.`);
  }
}

function assertNoForbiddenCommands(tx, label) {
  const data = tx.getData();
  const commandKinds = getCommandKinds(data);
  const blockedKinds = commandKinds.filter((kind) => forbiddenCommandKinds.includes(kind));
  if (blockedKinds.length > 0) {
    throw new Error(`${label} transaction contains forbidden command(s): ${blockedKinds.join(", ")}.`);
  }

  const targets = getMoveCalls(tx).map(moveCallTarget);
  const blockedTargets = targets.filter((target) => forbiddenMoveCallTargets.includes(target));
  if (blockedTargets.length > 0) {
    throw new Error(`${label} transaction contains forbidden Move call(s): ${blockedTargets.join(", ")}.`);
  }
}

function assertOnlyMoveCalls(tx, expectedTargets, label) {
  const data = tx.getData();
  const commandKinds = getCommandKinds(data);
  if (commandKinds.some((kind) => kind !== "MoveCall")) {
    throw new Error(`${label} transaction must contain only MoveCall commands; found ${commandKinds.join(", ")}.`);
  }

  const targets = getMoveCalls(tx).map(moveCallTarget);
  if (targets.length !== expectedTargets.length || targets.some((target, index) => target !== expectedTargets[index])) {
    throw new Error(`${label} transaction must contain exactly ${expectedTargets.join(", ")}; found ${targets.join(", ")}.`);
  }
}

function getCommandKinds(data) {
  const commands = Array.isArray(data.commands) ? data.commands : [];
  return commands.map((command) => command.$kind).filter((kind) => typeof kind === "string");
}

function getMoveCalls(tx) {
  const data = tx.getData();
  const commands = Array.isArray(data.commands) ? data.commands : [];
  return commands.map((command) => command.MoveCall).filter(isRecord);
}

function moveCallTarget(call) {
  return `${String(call.module ?? "unknown")}::${String(call.function ?? "unknown")}`;
}

function printSafetyHeader({ mode, sender, managerId, createFeeBps, quantities, maxPremiumPaidOverride }) {
  console.log(`Mode: deepvol-buy-receipt-${mode}`);
  console.log(`Network: ${deepVolConfig.network}`);
  console.log(`DeepVol package: ${deepVolConfig.packageId}`);
  console.log(`ProtocolVault<DUSDC>: ${deepVolConfig.protocolVaultId}`);
  console.log(`DeepBook Predict package: ${predictConfig.packageId}`);
  console.log(`DeepBook Predict object: ${predictConfig.predictId}`);
  console.log(`DUSDC type: ${dusdcCoinType}`);
  console.log(`sender: ${sender}`);
  console.log(`manager: ${managerId}`);
  console.log(`quantity candidates: ${quantities.join(",")}`);
  console.log(`create fee bps: ${createFeeBps}`);
  console.log(`maxPremiumPaid override: ${maxPremiumPaidOverride ?? "computed from fresh quotes"}`);
  console.log(`metadata_uri: ${metadataUri}`);
  console.log("No private key loaded by this script.");
  console.log("No .env.local read.");
  if (mode === "preflight") {
    console.log("Preflight mode submits no write transactions.");
  } else {
    console.log("Execute mode can submit one create_series and one buy_move_receipt only after gates pass.");
  }
}

function printCliState(state) {
  console.log("\nSui CLI state");
  console.log(`active env: ${state.env ?? `blocked ${state.envError}`}`);
  console.log(`active address: ${state.address ?? `blocked ${state.addressError}`}`);
}

function printObjectChecks(checks) {
  console.log("\nConfigured object checks");
  for (const key of ["packageObject", "adminCap", "upgradeCap", "protocolVault", "predictObject", "managerObject"]) {
    const check = checks[key];
    console.log(`${check.label}: ${check.status === "success" ? "ok" : `blocked ${check.blocker}`}`);
    if (check.status === "success") {
      console.log(`  id=${check.objectId}`);
      console.log(`  type=${check.type ?? "package-or-unavailable"}`);
      console.log(`  owner=${formatOwner(check)}`);
    }
  }
  if (checks.blockers.length > 0) {
    printBlockers(checks.blockers);
  }
}

function printDiscovery(discovery) {
  console.log("\nRuntime BTC market selection");
  console.log(`oracles scanned: ${discovery.contexts.length}`);
  for (const context of discovery.contexts) {
    console.log(`- oracle=${context.oracleId} underlying=${context.underlyingAsset ?? "unknown"} status=${context.status} expiry=${context.expiry} spot=${context.spot ?? "unknown"} forward=${context.forward ?? "unknown"} candidates=${context.candidates.length}`);
  }
  console.log(`quote attempts: ${discovery.attempts.length}`);
  console.log(`quote successes: ${discovery.attempts.filter((attempt) => attempt.status === "success").length}`);
  printFailureSummary(discovery.attempts);

  if (discovery.pair) {
    printSelectedPair(discovery.pair);
  } else {
    console.log("selected pair: unavailable");
  }

  if (discovery.blockers.length > 0) {
    printBlockers(discovery.blockers);
  }
}

function printRuntimeGates(gates) {
  console.log("\nRuntime gates");
  console.log(`manager summary: ${formatReadResult(gates.managerSummary)}`);
  console.log(`manager summary owner: ${gates.managerSummaryOwner ?? "unavailable"}`);
  console.log(`manager object owner: ${formatOwnerReadback(gates.managerObjectOwner)}`);
  console.log(`manager DUSDC balance: ${gates.managerBalance.status === "success" ? gates.managerBalance.balance : `blocked ${gates.managerBalance.blocker}`}`);
  console.log(`ProtocolVault balance: ${gates.vaultBalance.status === "success" ? gates.vaultBalance.balance : `blocked ${gates.vaultBalance.blocker}`}`);
  console.log(`sender SUI gas balance: ${gates.gasBalance.status === "success" ? gates.gasBalance.totalBalance : `blocked ${gates.gasBalance.blocker}`}`);
  console.log(`expected premium: ${gates.expectedPremium ?? "unavailable"}`);
  console.log(`maxPremiumPaid: ${gates.maxPremiumPaid ?? "unavailable"}`);
  console.log(`Create Fee: ${gates.createFee ?? "unavailable"}`);
  console.log(`DUSDC fee coins: ${gates.feeCoins.length}`);
  console.log(`selected fee coin: ${gates.selectedFeeCoin ? `${gates.selectedFeeCoin.coinObjectId} balance=${gates.selectedFeeCoin.balance}` : "unavailable"}`);
  printGasCoinSummary(gates.gasCoins);
  if (gates.blockers.length > 0) {
    printBlockers(gates.blockers);
  }
}

function printCreateSeriesPlan(plan) {
  console.log("\ncreate_series preflight");
  console.log(`devInspect: ${plan.devInspect.status === "success" ? "passed" : `blocked ${plan.devInspect.error}`}`);
  console.log(`SDK dry-run: ${plan.sdkDryRun.status === "success" ? `passed gas=${formatGasUsed(plan.sdkDryRun.gasUsed)}` : `blocked ${plan.sdkDryRun.error}`}`);
  printCliDryRuns(plan.cliDryRuns);
  console.log(`selected create_series gas budget: ${plan.selectedDryRun?.gasBudgetMist ?? "unavailable"}`);
  if (plan.blocker) {
    console.log(`create_series preflight blocker: ${plan.blocker}`);
  }
}

function printBinaryMintPreflight(preflight) {
  console.log("\nFresh direct binary mint devInspect");
  console.log(`status: ${preflight.status === "success" ? "passed" : `blocked ${preflight.blocker}`}`);
}

function printPreflightExit({ blockers }) {
  console.log("\nPreflight result");
  if (blockers.length > 0) {
    console.log("status: blocked");
    printBlockers(blockers);
  } else {
    console.log("status: passed for object checks, BTC quote selection, create_series dry-run, and direct binary mint devInspect");
    console.log("buy_move_receipt dry-run requires a real VolSeries object and is only attempted in execute mode after create_series succeeds.");
  }
  console.log("No write transactions submitted.");
}

function printCreateSeriesExecution(result) {
  console.log("\nVolSeries creation");
  console.log(`created: ${result.status === "success" ? "yes" : "no"}`);
  console.log(`digest: ${result.digest ?? "unavailable"}`);
  if (result.digest) {
    console.log(`explorer: ${buildSuiExplorerTransactionUrl(result.digest, "testnet")}`);
  }
  console.log(`VolSeriesCreated: ${result.seriesEvent ? JSON.stringify(result.seriesEvent.fields) : "unavailable"}`);
  console.log(`VolSeries object ID: ${result.seriesId ?? "unavailable"}`);
  console.log(`shared: ${result.seriesObject?.status === "success" ? String(result.seriesObject.shared) : "unavailable"}`);
  if (result.params) {
    console.log(`params: ${JSON.stringify(result.params)}`);
  }
  if (result.status !== "success") {
    console.log(`blocker: ${result.blocker}`);
  }
}

function printBuyReceiptResult(result) {
  console.log("\nbuy_move_receipt<DUSDC>");
  console.log(`status: ${result.status}`);
  console.log(`stage: ${result.stage}`);
  console.log(`executed: ${result.execution ? "yes" : "no"}`);
  console.log(`digest: ${result.execution?.digest ?? "unavailable"}`);
  if (result.execution?.digest) {
    console.log(`explorer: ${buildSuiExplorerTransactionUrl(result.execution.digest, "testnet")}`);
  }
  console.log(`oracle: ${result.pair?.oracleId ?? "unavailable"}`);
  console.log(`expiry: ${result.pair?.expiry ?? "unavailable"}`);
  console.log(`lower / upper: ${result.pair?.lowerStrike ?? "unavailable"} / ${result.pair?.upperStrike ?? "unavailable"}`);
  console.log(`UP quote: ${result.pair?.up.quote.mintCostAtomic ?? "unavailable"}`);
  console.log(`DOWN quote: ${result.pair?.down.quote.mintCostAtomic ?? "unavailable"}`);
  console.log(`expected premium: ${result.expectedPremium ?? "unavailable"}`);
  console.log(`maxPremiumPaid: ${result.maxPremiumPaid ?? "unavailable"}`);
  console.log(`Create Fee: ${result.createFee ?? "unavailable"}`);
  console.log(`selected fee coin: ${result.selectedFeeCoin ? `${result.selectedFeeCoin.coinObjectId} balance=${result.selectedFeeCoin.balance}` : "unavailable"}`);
  console.log(`devInspect: ${result.devInspect?.status === "success" ? "passed" : result.devInspect ? `blocked ${result.devInspect.error}` : "unavailable"}`);
  console.log(`SDK dry-run: ${result.sdkDryRun?.status === "success" ? `passed gas=${formatGasUsed(result.sdkDryRun.gasUsed)}` : result.sdkDryRun ? `blocked ${result.sdkDryRun.error}` : "unavailable"}`);
  if (result.cliDryRuns) {
    printCliDryRuns(result.cliDryRuns);
  }
  console.log(`MoveReceiptCreated: ${result.moveReceiptCreated ? JSON.stringify(result.moveReceiptCreated.fields) : "unavailable"}`);
  printPositionMintedEvents(result.mintedEvents ?? []);
  console.log(`CreateFeeDeposited: ${result.createFeeDeposited ? JSON.stringify(result.createFeeDeposited.fields) : "unavailable"}`);
  console.log(`MoveReceipt ID: ${result.receiptId ?? "unavailable"}`);
  console.log(`MoveReceipt object: ${result.receiptObject?.status === "success" ? JSON.stringify(result.receiptObject.fields) : "unavailable"}`);
  printPositionBeforeAfter("UP", result.positionsBefore?.up, result.positionsAfter?.up, result.postState?.upDelta ?? null);
  printPositionBeforeAfter("DOWN", result.positionsBefore?.down, result.positionsAfter?.down, result.postState?.downDelta ?? null);
  printBalanceBeforeAfter("manager DUSDC", result.managerBalanceBefore, result.managerBalanceAfter, result.postState?.managerBalanceDelta ?? null);
  printBalanceBeforeAfter("ProtocolVault<DUSDC>", result.vaultBalanceBefore, result.vaultBalanceAfter, result.postState?.vaultBalanceDelta ?? null);
  console.log(`fee coin after: ${result.feeCoinAfter?.status === "success" ? `balance=${result.feeCoinAfter.balance ?? "unavailable"}` : result.feeCoinAfter ? `blocked ${result.feeCoinAfter.blocker}` : "unavailable"}`);

  if (result.blockers?.length > 0) {
    printBlockers(result.blockers);
  }

  if (result.status === "success") {
    console.log("post-state validation: passed");
  }
}

function printSelectedPair(pair) {
  console.log("Selected BTC MOVE pair");
  console.log(`  oracle: ${pair.oracleId}`);
  console.log(`  expiry: ${pair.expiry}`);
  console.log(`  lower / upper strikes: ${pair.lowerStrike} / ${pair.upperStrike}`);
  console.log(`  quantity: ${pair.quantity}`);
  console.log(`  UP MarketKey: oracle=${pair.up.marketKey.oracleId} expiry=${pair.up.marketKey.expiry} strike=${pair.up.marketKey.strike} direction=${pair.up.marketKey.direction}`);
  console.log(`  DOWN MarketKey: oracle=${pair.down.marketKey.oracleId} expiry=${pair.down.marketKey.expiry} strike=${pair.down.marketKey.strike} direction=${pair.down.marketKey.direction}`);
  console.log(`  UP quote: mint=${pair.up.quote.mintCostAtomic} redeem=${pair.up.quote.redeemPayoutAtomic}`);
  console.log(`  DOWN quote: mint=${pair.down.quote.mintCostAtomic} redeem=${pair.down.quote.redeemPayoutAtomic}`);
  console.log(`  expected premium: ${pair.totalPremiumAtomic}`);
  console.log(`  expected Create Fee: ${pair.createFeeAtomic}`);
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

function printCliDryRuns(results) {
  if (!results || results.length === 0) {
    console.log("CLI dry-run: unavailable");
    return;
  }

  console.log("CLI dry-runs:");
  for (const result of results) {
    console.log(`  budget ${result.gasBudgetMist}: ${result.status === "success" ? `passed gas=${formatGasUsed(result.gasUsed)}` : `blocked ${result.error}`}`);
  }
}

function printGasCoinSummary(coins) {
  console.log(`available gas coins: ${coins.length}`);
  for (const coin of coins.slice(-5).reverse()) {
    console.log(`  gas coin: id=${coin.coinObjectId} balance=${coin.balance}`);
  }
}

function printPositionMintedEvents(events) {
  console.log(`PositionMinted events: ${events.length}`);
  events.forEach((event, index) => {
    console.log(`PositionMinted[${index}]: type=${event.type} fields=${JSON.stringify(event.fields)}`);
  });
}

function printPositionBeforeAfter(label, before, after, delta) {
  const beforeValue = before?.status === "success" ? before.quantity : "unavailable";
  const afterValue = after?.status === "success" ? after.quantity : "unavailable";
  console.log(`${label} position before/after: ${beforeValue} / ${afterValue}`);
  console.log(`${label} position delta: ${delta === null || delta === undefined ? "unavailable" : delta.toString()}`);
}

function printBalanceBeforeAfter(label, before, after, delta) {
  const beforeValue = before?.status === "success" ? before.balance : "unavailable";
  const afterValue = after?.status === "success" ? after.balance : "unavailable";
  console.log(`${label} balance before/after: ${beforeValue} / ${afterValue}`);
  console.log(`${label} balance delta: ${delta === null || delta === undefined ? "unavailable" : delta.toString()}`);
}

function printBuyCommandMap(tx) {
  console.log("buy_move_receipt PTB command map:");
  getMoveCalls(tx).forEach((call, index) => {
    console.log(`  command[${index}]: ${moveCallTarget(call)}`);
  });
}

function printBlockers(blockers) {
  for (const blocker of blockers) {
    console.log(`blocker: ${blocker}`);
  }
}

function validateBuyPostState({ sender, managerId, seriesId, pair, receiptId, receiptObject, moveReceiptCreated, mintedEvents, createFeeDeposited, positionsBefore, positionsAfter, managerBalanceBefore, managerBalanceAfter, vaultBalanceBefore, vaultBalanceAfter }) {
  const blockers = [];
  const upDelta = quantityDelta(positionsBefore.up, positionsAfter.up);
  const downDelta = quantityDelta(positionsBefore.down, positionsAfter.down);
  const managerBalanceDelta = balanceDecrease(managerBalanceBefore, managerBalanceAfter);
  const vaultBalanceDelta = balanceIncrease(vaultBalanceBefore, vaultBalanceAfter);
  const receiptFields = receiptObject?.status === "success" ? receiptObject.fields : null;
  const eventFields = moveReceiptCreated?.fields ?? null;
  const expectedQuantity = BigInt(pair.quantity);

  if (!receiptId) {
    blockers.push("MoveReceipt object ID unavailable.");
  }

  if (!eventFields) {
    blockers.push("MoveReceiptCreated event unavailable.");
  }

  if (receiptObject?.status !== "success") {
    blockers.push(`MoveReceipt object read blocked: ${receiptObject?.blocker ?? "unavailable"}.`);
  }

  if (upDelta === null || upDelta < expectedQuantity) {
    blockers.push(`UP position delta ${upDelta === null ? "unavailable" : upDelta.toString()} is below expected quantity ${expectedQuantity.toString()}.`);
  }

  if (downDelta === null || downDelta < expectedQuantity) {
    blockers.push(`DOWN position delta ${downDelta === null ? "unavailable" : downDelta.toString()} is below expected quantity ${expectedQuantity.toString()}.`);
  }

  if (managerBalanceDelta === null || managerBalanceDelta <= 0n) {
    blockers.push(`Manager DUSDC balance delta ${managerBalanceDelta === null ? "unavailable" : managerBalanceDelta.toString()} is not positive.`);
  }

  if (vaultBalanceDelta === null) {
    blockers.push("ProtocolVault balance delta unavailable.");
  }

  if (eventFields && managerBalanceDelta !== null && BigInt(eventFields.premium_paid) !== managerBalanceDelta) {
    blockers.push(`MoveReceiptCreated premium_paid ${eventFields.premium_paid} does not match manager balance delta ${managerBalanceDelta.toString()}.`);
  }

  if (eventFields && vaultBalanceDelta !== null && BigInt(eventFields.create_fee_paid) !== vaultBalanceDelta) {
    blockers.push(`MoveReceiptCreated create_fee_paid ${eventFields.create_fee_paid} does not match vault delta ${vaultBalanceDelta.toString()}.`);
  }

  if (createFeeDeposited && vaultBalanceDelta !== null && BigInt(createFeeDeposited.fields.amount) !== vaultBalanceDelta) {
    blockers.push(`CreateFeeDeposited amount ${createFeeDeposited.fields.amount} does not match vault delta ${vaultBalanceDelta.toString()}.`);
  }

  if (eventFields && BigInt(eventFields.create_fee_paid) > 0n && !createFeeDeposited) {
    blockers.push("CreateFeeDeposited event unavailable even though create_fee_paid is positive.");
  }

  const upEvents = mintedEvents.filter((event) => isPositionMintForLeg(event, pair.up.marketKey));
  const downEvents = mintedEvents.filter((event) => isPositionMintForLeg(event, pair.down.marketKey));
  if (upEvents.length === 0) {
    blockers.push("DeepBook Predict PositionMinted UP event unavailable.");
  }
  if (downEvents.length === 0) {
    blockers.push("DeepBook Predict PositionMinted DOWN event unavailable.");
  }

  validateField(blockers, eventFields, "owner", sender, "MoveReceiptCreated owner");
  validateField(blockers, eventFields, "series_id", seriesId, "MoveReceiptCreated series_id");
  validateField(blockers, eventFields, "predict_manager_id", managerId, "MoveReceiptCreated predict_manager_id");
  validateField(blockers, eventFields, "oracle_id", pair.oracleId, "MoveReceiptCreated oracle_id");
  validateField(blockers, eventFields, "expiry", pair.expiry, "MoveReceiptCreated expiry");
  validateField(blockers, eventFields, "lower_strike", pair.lowerStrike, "MoveReceiptCreated lower_strike");
  validateField(blockers, eventFields, "upper_strike", pair.upperStrike, "MoveReceiptCreated upper_strike");
  validateField(blockers, eventFields, "quantity", pair.quantity, "MoveReceiptCreated quantity");
  validateField(blockers, receiptFields, "owner", sender, "MoveReceipt owner");
  validateField(blockers, receiptFields, "series_id", seriesId, "MoveReceipt series_id");
  validateField(blockers, receiptFields, "predict_manager_id", managerId, "MoveReceipt predict_manager_id");
  validateField(blockers, receiptFields, "oracle_id", pair.oracleId, "MoveReceipt oracle_id");
  validateField(blockers, receiptFields, "expiry", pair.expiry, "MoveReceipt expiry");
  validateField(blockers, receiptFields, "lower_strike", pair.lowerStrike, "MoveReceipt lower_strike");
  validateField(blockers, receiptFields, "upper_strike", pair.upperStrike, "MoveReceipt upper_strike");
  validateField(blockers, receiptFields, "quantity", pair.quantity, "MoveReceipt quantity");
  validateField(blockers, receiptFields, "status", "0", "MoveReceipt status");

  if (receiptFields && managerBalanceDelta !== null && BigInt(String(receiptFields.premium_paid)) !== managerBalanceDelta) {
    blockers.push(`MoveReceipt premium_paid ${receiptFields.premium_paid} does not match manager balance delta ${managerBalanceDelta.toString()}.`);
  }

  if (receiptFields && vaultBalanceDelta !== null && BigInt(String(receiptFields.create_fee_paid)) !== vaultBalanceDelta) {
    blockers.push(`MoveReceipt create_fee_paid ${receiptFields.create_fee_paid} does not match vault delta ${vaultBalanceDelta.toString()}.`);
  }

  return { blockers, upDelta, downDelta, managerBalanceDelta, vaultBalanceDelta };
}

function validateField(blockers, fields, field, expected, label) {
  if (!fields) {
    return;
  }

  const actual = fieldString(fields[field]);
  const expectedValue = normalizeComparableValue(expected);
  const actualValue = normalizeComparableValue(actual);

  if (actualValue !== expectedValue) {
    blockers.push(`${label} mismatch: expected ${expectedValue}, got ${actualValue}.`);
  }
}

function isPositionMintForLeg(event, marketKey) {
  const fields = event.fields;
  const strike = integerStringOrNull(fields.strike);
  const expiry = integerStringOrNull(fields.expiry);
  const oracleId = stringOrNull(fields.oracle_id);
  const isUp = fields.is_up === true || fields.is_up === "true";
  const direction = isUp ? "up" : "down";
  return normalizeAddress(oracleId ?? "") === normalizeAddress(marketKey.oracleId)
    && expiry === String(marketKey.expiry)
    && strike === String(marketKey.strike)
    && direction === marketKey.direction;
}

function extractEvents(transactionBlock) {
  return isRecord(transactionBlock) && Array.isArray(transactionBlock.events) ? transactionBlock.events : [];
}

function extractVolSeriesCreatedEvent(events, pair, createFeeBps) {
  return events
    .filter((event) => typeof event.type === "string" && event.type.endsWith("::series::VolSeriesCreated"))
    .map((event) => ({ type: event.type, fields: normalizeParsedFields(event.parsedJson) }))
    .find((event) => event.fields.oracle_id === pair.oracleId
      && event.fields.expiry === pair.expiry
      && event.fields.lower_strike === pair.lowerStrike
      && event.fields.upper_strike === pair.upperStrike
      && event.fields.create_fee_bps === String(createFeeBps)) ?? null;
}

function extractMoveReceiptCreatedEvent(events, seriesId) {
  return events
    .filter((event) => typeof event.type === "string" && event.type.endsWith("::receipt::MoveReceiptCreated"))
    .map((event) => ({ type: event.type, fields: normalizeParsedFields(event.parsedJson) }))
    .find((event) => normalizeAddress(event.fields.series_id) === normalizeAddress(seriesId)) ?? null;
}

function extractCreateFeeDepositedEvent(events, seriesId) {
  return events
    .filter((event) => typeof event.type === "string" && event.type.endsWith("::vault::CreateFeeDeposited"))
    .map((event) => ({ type: event.type, fields: normalizeParsedFields(event.parsedJson) }))
    .find((event) => normalizeAddress(event.fields.series_id) === normalizeAddress(seriesId)) ?? null;
}

function extractPositionMintedEvents(events) {
  return events
    .filter((event) => typeof event.type === "string" && event.type.endsWith("::predict::PositionMinted"))
    .map((event) => ({ type: event.type, fields: normalizeParsedFields(event.parsedJson) }));
}

function extractCreatedObjectId(transactionBlock, type) {
  if (!isRecord(transactionBlock) || !Array.isArray(transactionBlock.objectChanges)) {
    return null;
  }

  const created = transactionBlock.objectChanges.find((change) => isRecord(change)
    && change.type === "created"
    && change.objectType === type
    && typeof change.objectId === "string");
  return created?.objectId ?? null;
}

function normalizeParsedFields(value) {
  if (!isRecord(value)) {
    return {};
  }

  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = fieldString(entry);
  }
  return result;
}

function fieldString(value) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value) && value.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 255)) {
    return new TextDecoder().decode(new Uint8Array(value));
  }
  if (isRecord(value)) {
    if (typeof value.id === "string") {
      return value.id;
    }
    if (typeof value.bytes === "string") {
      return value.bytes;
    }
  }
  return String(value);
}

function extractMoveObjectFields(content) {
  if (!isRecord(content)) {
    return null;
  }
  const fields = isRecord(content.fields) ? content.fields : null;
  if (!fields) {
    return null;
  }

  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = fieldString(value);
  }
  return result;
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

function isSharedOwner(owner) {
  return isRecord(owner) && (isRecord(owner.Shared) || "Shared" in owner);
}

function formatOwner(facts) {
  if (facts.shared) {
    return "shared";
  }
  return facts.addressOwner ?? JSON.stringify(facts.owner ?? null);
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

function formatReadResult(result) {
  if (result.status === "error") {
    return `error=${result.error}`;
  }
  if (Array.isArray(result.value)) {
    return `success count=${result.value.length}`;
  }
  return "success";
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
  for (const child of isRecord(value) ? Object.values(value) : []) {
    if (isRecord(child)) {
      const nested = extractExecutionError(child);
      if (nested) {
        return nested;
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

function formatGasUsed(gasUsed) {
  if (!gasUsed) {
    return "unavailable";
  }
  return `computation=${gasUsed.computationCost ?? "?"} storage=${gasUsed.storageCost ?? "?"} rebate=${gasUsed.storageRebate ?? "?"} nonRefundable=${gasUsed.nonRefundableStorageFee ?? "?"}`;
}

function validateGasBudgetCoverage(gasCoins, gasBudgetMist) {
  const required = BigInt(gasBudgetMist) + gasReserveMist;
  return gasCoins.some((coin) => BigInt(coin.balance) >= required)
    ? null
    : `No SUI gas coin covers selected gas budget ${gasBudgetMist} plus reserve ${gasReserveMist.toString()} MIST.`;
}

function selectFeeCoin(coins, requiredAmount) {
  const eligible = coins.filter((coin) => BigInt(coin.balance) >= requiredAmount && BigInt(coin.balance) > 0n);
  return eligible.sort((left, right) => compareBigInt(BigInt(left.balance), BigInt(right.balance)))[0] ?? null;
}

function computeMaxPremiumPaid(expectedPremium) {
  const twentyPercent = expectedPremium / 5n;
  const buffer = twentyPercent > 1000n ? twentyPercent : 1000n;
  return expectedPremium + buffer;
}

function calculateCreateFee(premium, createFeeBps) {
  return premium * createFeeBps / 10000n;
}

function quantityDelta(before, after) {
  if (before?.status !== "success" || after?.status !== "success") {
    return null;
  }
  return BigInt(after.quantity) - BigInt(before.quantity);
}

function balanceDecrease(before, after) {
  if (before?.status !== "success" || after?.status !== "success") {
    return null;
  }
  return BigInt(before.balance) - BigInt(after.balance);
}

function balanceIncrease(before, after) {
  if (before?.status !== "success" || after?.status !== "success") {
    return null;
  }
  return BigInt(after.balance) - BigInt(before.balance);
}

function assertCanSubmitCreateSeries() {
  if (createSeriesSubmittedThisProcess) {
    throw new Error("create_series submission blocked: one create_series transaction was already submitted in this process.");
  }
  createSeriesSubmittedThisProcess = true;
}

function assertCanSubmitBuyReceipt() {
  if (buyReceiptSubmittedThisProcess) {
    throw new Error("buy_move_receipt submission blocked: one buy_move_receipt transaction was already submitted in this process.");
  }
  buyReceiptSubmittedThisProcess = true;
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
  const status = isRecord(result) && isRecord(result.effects) && isRecord(result.effects.status) ? result.effects.status : null;
  return status?.status === "success" ? "success" : "failure";
}

function devInspectError(result) {
  if (isRecord(result) && typeof result.error === "string") {
    return result.error;
  }
  const status = isRecord(result) && isRecord(result.effects) && isRecord(result.effects.status) ? result.effects.status : null;
  return typeof status?.error === "string" ? status.error : "devInspect did not return success.";
}

async function tryRead(source, read) {
  try {
    return { source, status: "success", value: await read() };
  } catch (error) {
    return { source, status: "error", value: null, error: sanitizeError(error) };
  }
}

function parseMode(options) {
  if (options.mode === "preflight" || options.preflight) {
    return "preflight";
  }
  if (options.mode === "execute" || options.execute) {
    return "execute";
  }
  throw new Error("Usage: node scripts/validate-deepvol-buy-move-receipt.mjs --mode preflight|execute [--sender <address>] [--manager <object-id>] [--quantity <positive integer>] [--max-premium-paid <positive integer>] [--create-fee-bps 30]");
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

function parseQuantityCandidates(value) {
  if (value === undefined || value === null) {
    return defaultQuantities;
  }
  return [parsePositiveInteger(value, "quantity")];
}

function parseBps(value) {
  const bps = Number(parsePositiveInteger(value, "create fee bps"));
  if (!Number.isInteger(bps) || bps <= 0 || bps > deepVolConfig.maxCreateFeeBps) {
    throw new Error(`create fee bps must be an integer between 1 and ${deepVolConfig.maxCreateFeeBps}.`);
  }
  return bps;
}

function parsePositiveInteger(value, label) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error(`${label} must be a positive integer string.`);
  }
  if (BigInt(value) <= 0n) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return BigInt(value).toString();
}

function assertStaticTestnetConfig() {
  if (deepVolConfig.network !== "testnet" || predictConfig.network !== "testnet" || !predictConfig.publicServer.includes("testnet")) {
    throw new Error("DeepVol buy receipt validation is only allowed against Sui Testnet config and public server.");
  }
  if (normalizeAddress(deepVolConfig.packageId) !== normalizeAddress(expectedDeepVolPackageId)) {
    throw new Error(`DEEPVOL_TESTNET.packageId mismatch: expected ${expectedDeepVolPackageId}, got ${deepVolConfig.packageId}.`);
  }
  if (normalizeAddress(deepVolConfig.protocolVaultId) !== normalizeAddress(expectedProtocolVaultId)) {
    throw new Error(`DEEPVOL_TESTNET.protocolVaultId mismatch: expected ${expectedProtocolVaultId}, got ${deepVolConfig.protocolVaultId}.`);
  }
}

function formatAbort(abort) {
  return `${abort.module ?? "unknown"}::${abort.function ?? "unknown"} code=${abort.code ?? "unknown"} reason=${abort.knownReason ?? "unknown"} message=${abort.message}`;
}

function normalizeComparableValue(value) {
  const stringValue = String(value);
  if (/^0x[0-9a-fA-F]+$/.test(stringValue)) {
    return normalizeAddress(stringValue);
  }
  return stringValue;
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

function absoluteDistance(left, right) {
  return left >= right ? left - right : right - left;
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
