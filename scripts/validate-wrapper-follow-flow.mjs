import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import {
  RANGEPILOT_ADMIN_CAP_ID,
  RANGEPILOT_PROTOCOL_VAULT_ID,
  RANGEPILOT_TESTNET,
  RANGEPILOT_WRAPPER_PACKAGE_ID,
} from "@deepvol/config/rangePilotTestnet";
import {
  buildSuiExplorerTransactionUrl,
  createDeepBookPredictServerClient,
  devInspectMintRangePreflight,
  devInspectRangeQuote,
  getDusdcBalance,
  getDusdcCoins,
  inspectDevInspectU64,
  parseRangeMintedEvent,
  readRangePositionQuantity,
  scanMintableRangeCandidates,
  summarizeDevInspectU64Diagnostic,
} from "@deepvol/sdk/deepbookPredict";
import {
  buildCreateStrategyTransaction,
  buildFollowStrategyAndMintTransaction,
} from "@deepvol/sdk/rangePilotStrategy";

const execFileAsync = promisify(execFile);
const deepbookConfig = DEEPBOOK_PREDICT_TESTNET;
const wrapperConfig = RANGEPILOT_TESTNET;
const adminAddress = "0xc558e37d20405a9751c81124ac8d167e2b2d368b834319adafa549449e0715f5";
const followerAddress = "0x4ff903b0dcc52dc8753787baf19b34b7425dfa64d187cc7c726b38413705fa75";
const metadataUri = "https://rangepilot.local/strategy/testnet/btc-range-demo-1";
const creatorFeeBps = 100;
const feeAmountAtomic = "1000000";
const expectedCreatorFeeAtomic = "10000";
const expectedPlatformFeeAtomic = "1000";
const maxMintCostAtomic = "5000000";
const minimumGasMist = 100_000_000n;
const clockObjectId = "0x6";
const forbiddenTransactionTargets = [
  "::predict::mint_range",
  "::predict::redeem_range",
  "::predict::supply",
  "withdraw_platform_fees",
  "create_protocol_vault",
  "sui client publish",
];

main().catch((error) => {
  console.error("Wrapper follow validation failed:", sanitizeError(error));
  process.exitCode = 1;
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertStaticConfig();

  const client = new SuiJsonRpcClient({
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet",
  });
  const server = createDeepBookPredictServerClient({ config: deepbookConfig });

  if (args.mode === "prepare") {
    await runPrepare({ client, server, strategyId: args.strategyId ?? null });
    return;
  }

  if (args.mode === "create-strategy") {
    await runCreateStrategy({ client, server });
    return;
  }

  if (args.mode === "summarize-create") {
    requireArg(args.digest, "--digest is required for --summarize-create.");
    await summarizeCreate({ client, digest: args.digest });
    return;
  }

  if (args.mode === "follow") {
    await runFollow({ client, server, strategyId: args.strategyId ?? null });
    return;
  }

  if (args.mode === "summarize-follow") {
    requireArg(args.digest, "--digest is required for --summarize-follow.");
    await summarizeFollow({ client, digest: args.digest });
    return;
  }

  throw new Error("Use --prepare, --create-strategy, --summarize-create, --follow, or --summarize-follow.");
}

async function runPrepare({ client, server, strategyId }) {
  await assertCliEnvAndAddress({ expectedAddress: followerAddress });

  if (strategyId) {
    const strategy = await readStrategyObject({ client, strategyId });
    const context = await prepareExistingStrategy({ client, server, sender: followerAddress, strategy });
    printFollowGateSummary(context);

    if (!context.gatesPassed) {
      process.exitCode = 1;
    }

    return;
  }

  const context = await prepareFreshCandidate({ client, server, sender: followerAddress });
  printPrepareSummary(context);

  if (!context.gatesPassed) {
    process.exitCode = 1;
  }
}

async function runCreateStrategy({ client, server }) {
  await assertCliEnvAndAddress({ expectedAddress: adminAddress });
  const context = await prepareFreshCandidate({ client, server, sender: followerAddress });
  printPrepareSummary(context);

  if (!context.gatesPassed || !context.selectedCandidate) {
    throw new Error("Strategy creation skipped: follower quote/full mint preflight gates did not pass.");
  }

  const strategyTx = buildCreateStrategyTransaction({
    wrapper: wrapperConfig,
    oracleId: context.selectedCandidate.oracleId,
    expiry: context.selectedCandidate.expiry,
    lowerStrike: context.selectedCandidate.lowerStrike,
    higherStrike: context.selectedCandidate.higherStrike,
    defaultQuantity: context.selectedCandidate.quantity,
    creatorFeeBps,
    metadataUri,
  });
  assertNoForbiddenTargets(strategyTx, "create_strategy builder");
  const devInspect = await client.devInspectTransactionBlock({
    sender: adminAddress,
    transactionBlock: strategyTx,
  });
  requireDevInspectSuccess(devInspect, "create_strategy devInspect");

  const metadataBytes = [...new TextEncoder().encode(metadataUri)].join(",");
  const cliArgs = [
    "client",
    "call",
    "--package",
    RANGEPILOT_WRAPPER_PACKAGE_ID,
    "--module",
    "strategy",
    "--function",
    "create_strategy",
    "--args",
    context.selectedCandidate.oracleId,
    context.selectedCandidate.expiry,
    context.selectedCandidate.lowerStrike,
    context.selectedCandidate.higherStrike,
    context.selectedCandidate.quantity,
    String(creatorFeeBps),
    `[${metadataBytes}]`,
    clockObjectId,
    "--gas-budget",
    "100000000",
    "--json",
  ];

  assertCreateStrategyCliArgs(cliArgs);
  await runSuiCli([...cliArgs.slice(0, -1), "--dry-run", "--json"], "create_strategy dry-run");
  const result = await runSuiCli(cliArgs, "create_strategy");
  requireExecutionSuccess(result, "create_strategy");

  const digest = extractDigest(result);
  if (!digest) {
    throw new Error("create_strategy succeeded but digest was not found in CLI JSON output.");
  }

  console.log("\nStrategy creation submitted");
  console.log(`create digest: ${digest}`);
  console.log(`explorer: ${buildSuiExplorerTransactionUrl(digest, deepbookConfig.network)}`);
  await summarizeCreate({ client, digest });
}

async function runFollow({ client, server, strategyId }) {
  await assertCliEnvAndAddress({ expectedAddress: followerAddress });
  const strategy = strategyId
    ? await readStrategyObject({ client, strategyId })
    : await loadLatestCreatedStrategy({ client });

  console.log("Selected Strategy");
  console.log(`strategy ID: ${strategy.strategyId}`);
  console.log(`creator: ${strategy.creator}`);
  console.log(`metadata_uri: ${strategy.metadataUri}`);
  console.log(`active: ${strategy.active}`);
  console.log(`range: oracle=${strategy.oracleId} expiry=${strategy.expiry} lower=${strategy.lowerStrike} higher=${strategy.higherStrike}`);
  console.log(`quantity: ${strategy.defaultQuantity}`);

  const context = await prepareExistingStrategy({ client, server, sender: followerAddress, strategy });
  printFollowGateSummary(context);

  if (!context.gatesPassed) {
    throw new Error("Wrapper follow skipped: exact quote, mint preflight, or wrapper preflight gate failed.");
  }

  const before = await readFollowState({ client, server, strategy, managerId: context.managerId, sender: followerAddress });
  printStateSnapshot("Before follow", before);

  const cliArgs = [
    "client",
    "call",
    "--package",
    RANGEPILOT_WRAPPER_PACKAGE_ID,
    "--module",
    "strategy",
    "--function",
    "follow_strategy_and_mint",
    "--type-args",
    deepbookConfig.quoteAssets.DUSDC.coinType,
    "--args",
    strategy.strategyId,
    deepbookConfig.predictId,
    context.managerId,
    strategy.oracleId,
    context.feeCoin.coinObjectId,
    RANGEPILOT_PROTOCOL_VAULT_ID,
    feeAmountAtomic,
    strategy.defaultQuantity,
    clockObjectId,
    "--gas-budget",
    "200000000",
    "--json",
  ];

  assertFollowCliArgs(cliArgs, context.feeCoin.coinObjectId, strategy.strategyId, context.managerId, strategy.oracleId);
  const result = await runSuiCli(cliArgs, "follow_strategy_and_mint");
  requireExecutionSuccess(result, "follow_strategy_and_mint");

  const digest = extractDigest(result);
  if (!digest) {
    throw new Error("follow_strategy_and_mint succeeded but digest was not found in CLI JSON output.");
  }

  const after = await readFollowState({ client, server, strategy, managerId: context.managerId, sender: followerAddress });

  console.log("\nWrapper follow submitted");
  console.log(`follow digest: ${digest}`);
  console.log(`explorer: ${buildSuiExplorerTransactionUrl(digest, deepbookConfig.network)}`);
  printStateSnapshot("After follow", after);
  printStateDeltas({ before, after });
  await summarizeFollow({ client, digest, strategy, before, after });
}

async function prepareFreshCandidate({ client, server, sender }) {
  const blockers = [];
  const gas = await getSuiGas(client, sender);
  const walletDusdc = await getDusdcBalance(client, sender, deepbookConfig);
  const manager = await findPredictManagerByOwner({ client, owner: sender });
  let managerBalanceAtomic = null;
  let scan = null;

  if (gas.totalMist < minimumGasMist) {
    blockers.push(`SUI gas balance ${gas.totalMist.toString()} MIST is below ${minimumGasMist.toString()} MIST.`);
  }

  if (BigInt(walletDusdc.totalAtomic) < BigInt(feeAmountAtomic)) {
    blockers.push(`Wallet DUSDC ${walletDusdc.totalAtomic} is below follow fee amount ${feeAmountAtomic}.`);
  }

  if (!manager.managerId) {
    blockers.push("Follower PredictManager was not discovered from owned objects or recent PredictManagerCreated events.");
  } else {
    managerBalanceAtomic = await readManagerBalanceAtomic({ client, server, sender, managerId: manager.managerId });
    scan = await scanMintableRangeCandidates({
      client,
      server,
      sender,
      managerId: manager.managerId,
      config: deepbookConfig,
      maxMintCostAtomic,
      maxQuoteAttempts: 120,
      maxPreflightAttempts: 40,
    });
  }

  const selectedCandidate = scan?.selectedCandidate ?? null;

  if (!selectedCandidate) {
    blockers.push(...(scan?.blockers.map((blocker) => `${blocker.code}: ${blocker.message}`) ?? []));
    blockers.push("No runtime range candidate passed official quote and full mint preflight gates.");
  } else if (BigInt(selectedCandidate.mintCostAtomic) <= 0n) {
    blockers.push(`Selected quote mint cost ${selectedCandidate.mintCostAtomic} must be positive.`);
  }

  if (managerBalanceAtomic !== null && selectedCandidate && BigInt(managerBalanceAtomic) < BigInt(selectedCandidate.mintCostAtomic)) {
    blockers.push(`Manager DUSDC balance ${managerBalanceAtomic} is below selected mint cost ${selectedCandidate.mintCostAtomic}.`);
  }

  const feeCoin = findSingleDusdcFeeCoin(walletDusdc.coins, feeAmountAtomic);
  if (!feeCoin) {
    blockers.push(`No single DUSDC fee coin covers fee amount ${feeAmountAtomic}; coin merge PTB is not part of this guarded follow path.`);
  }

  return {
    sender,
    gas,
    walletDusdc,
    manager,
    managerBalanceAtomic,
    scan,
    selectedCandidate,
    feeCoin,
    gatesPassed: blockers.length === 0,
    blockers,
  };
}

async function prepareExistingStrategy({ client, server, sender, strategy }) {
  const blockers = [];
  const gas = await getSuiGas(client, sender);
  const walletDusdc = await getDusdcBalance(client, sender, deepbookConfig);
  const manager = await findPredictManagerByOwner({ client, owner: sender });
  const feeCoin = findSingleDusdcFeeCoin(walletDusdc.coins, feeAmountAtomic);
  let managerBalanceAtomic = null;
  let quote = null;
  let mintPreflight = null;
  let wrapperPreflight = null;

  if (!strategy.active) {
    blockers.push("Strategy is inactive.");
  }

  if (gas.totalMist < minimumGasMist) {
    blockers.push(`SUI gas balance ${gas.totalMist.toString()} MIST is below ${minimumGasMist.toString()} MIST.`);
  }

  if (BigInt(walletDusdc.totalAtomic) < BigInt(feeAmountAtomic)) {
    blockers.push(`Wallet DUSDC ${walletDusdc.totalAtomic} is below follow fee amount ${feeAmountAtomic}.`);
  }

  if (!feeCoin) {
    blockers.push(`No single DUSDC fee coin covers fee amount ${feeAmountAtomic}; coin merge PTB is not part of this guarded follow path.`);
  }

  if (!manager.managerId) {
    blockers.push("Follower PredictManager was not discovered from owned objects or recent PredictManagerCreated events.");
  } else {
    managerBalanceAtomic = await readManagerBalanceAtomic({ client, server, sender, managerId: manager.managerId });
    try {
      quote = await devInspectRangeQuote({
        oracleId: strategy.oracleId,
        oracleObjectId: strategy.oracleId,
        expiry: strategy.expiry,
        lowerStrike: strategy.lowerStrike,
        higherStrike: strategy.higherStrike,
        quantity: strategy.defaultQuantity,
        client,
        sender,
        config: deepbookConfig,
      });
    } catch (error) {
      blockers.push(`Official range quote failed: ${sanitizeError(error)}`);
    }

    if (quote && BigInt(quote.mintCostAtomic) <= 0n) {
      blockers.push(`Official range quote mint cost ${quote.mintCostAtomic} must be positive.`);
    }

    if (quote && managerBalanceAtomic !== null && BigInt(managerBalanceAtomic) < BigInt(quote.mintCostAtomic)) {
      blockers.push(`Manager DUSDC balance ${managerBalanceAtomic} is below selected mint cost ${quote.mintCostAtomic}.`);
    }

    if (quote && BigInt(quote.mintCostAtomic) > 0n) {
      mintPreflight = await devInspectMintRangePreflight({
        managerId: manager.managerId,
        oracleId: strategy.oracleId,
        oracleObjectId: strategy.oracleId,
        expiry: strategy.expiry,
        lowerStrike: strategy.lowerStrike,
        higherStrike: strategy.higherStrike,
        quantity: strategy.defaultQuantity,
        client,
        sender,
        config: deepbookConfig,
        candidateParams: {
          mintCostAtomic: quote.mintCostAtomic,
          redeemPayoutAtomic: quote.redeemPayoutAtomic,
        },
      });

      if (mintPreflight.status !== "passed") {
        blockers.push(`Full DeepBook mint preflight failed: ${formatAbort(mintPreflight.abort)}.`);
      }
    }
  }

  if (manager.managerId && feeCoin && quote && mintPreflight?.status === "passed") {
    const followTx = buildFollowStrategyAndMintTransaction({
      wrapper: wrapperConfig,
      strategyId: strategy.strategyId,
      predictId: deepbookConfig.predictId,
      managerId: manager.managerId,
      oracleObjectId: strategy.oracleId,
      feeCoinObjectId: feeCoin.coinObjectId,
      protocolVaultId: RANGEPILOT_PROTOCOL_VAULT_ID,
      feeAmountAtomic,
      quantity: strategy.defaultQuantity,
      quoteCoinType: deepbookConfig.quoteAssets.DUSDC.coinType,
      requireQuotePreviewPassed: true,
      requireFullMintPreflightPassed: true,
    });
    assertNoForbiddenTargets(followTx, "wrapper follow builder");
    wrapperPreflight = await client.devInspectTransactionBlock({
      sender,
      transactionBlock: followTx,
    });

    if (!isDevInspectSuccess(wrapperPreflight)) {
      blockers.push(`Wrapper follow devInspect failed: ${devInspectError(wrapperPreflight)}`);
    }
  }

  return {
    sender,
    strategy,
    gas,
    walletDusdc,
    managerId: manager.managerId,
    managerSource: manager.source,
    managerBalanceAtomic,
    feeCoin,
    quote,
    mintPreflight,
    wrapperPreflight,
    gatesPassed: blockers.length === 0,
    blockers,
  };
}

async function readFollowState({ client, server, strategy, managerId, sender }) {
  const [protocolVaultBalanceAtomic, creatorDusdc, managerBalanceAtomic, rangePosition] = await Promise.all([
    readProtocolVaultBalanceAtomic(client),
    getDusdcBalance(client, strategy.creator, deepbookConfig),
    readManagerBalanceAtomic({ client, server, sender, managerId }),
    readRangePositionQuantity({
      managerId,
      oracleId: strategy.oracleId,
      oracleObjectId: strategy.oracleId,
      expiry: strategy.expiry,
      lowerStrike: strategy.lowerStrike,
      higherStrike: strategy.higherStrike,
      client,
      sender,
      config: deepbookConfig,
    }).catch((error) => ({ error: sanitizeError(error), quantity: null })),
  ]);

  return {
    protocolVaultBalanceAtomic,
    creatorDusdcAtomic: creatorDusdc.totalAtomic,
    managerBalanceAtomic,
    rangePositionQuantity: rangePosition.quantity ?? null,
    rangePositionError: rangePosition.error ?? null,
  };
}

async function summarizeCreate({ client, digest }) {
  const tx = await client.getTransactionBlock({
    digest,
    options: { showEvents: true, showEffects: true, showObjectChanges: true },
  });
  requireExecutionSuccess(tx, "create_strategy summary");
  const event = findRangePilotEvent(tx.events, "StrategyCreated");
  const fields = normalizeStrategyCreatedFields(event?.parsedJson ?? null);
  const objectId = fields.strategyId ?? findCreatedStrategyObjectId(tx.objectChanges) ?? null;
  const object = objectId ? await readStrategyObject({ client, strategyId: objectId }) : null;

  console.log("\nCreate summary");
  console.log(`digest: ${digest}`);
  console.log(`StrategyCreated event: ${event ? "found" : "not found"}`);
  console.log(`Strategy object ID: ${objectId ?? "unavailable"}`);
  console.log(`Strategy shared: ${object?.shared ? "yes" : "no"}`);
  console.log(`creator: ${object?.creator ?? fields.creator ?? "unavailable"}`);
  console.log(`creator fee bps: ${object?.creatorFeeBps ?? fields.creatorFeeBps ?? "unavailable"}`);
  console.log(`metadata_uri: ${object?.metadataUri ?? fields.metadataUri ?? "unavailable"}`);
  console.log(`active: ${object?.active ?? "unavailable"}`);
  console.log(`range: oracle=${object?.oracleId ?? fields.oracleId ?? "unavailable"} expiry=${object?.expiry ?? fields.expiry ?? "unavailable"} lower=${object?.lowerStrike ?? fields.lowerStrike ?? "unavailable"} higher=${object?.higherStrike ?? fields.higherStrike ?? "unavailable"}`);
}

async function summarizeFollow({ client, digest, strategy = null, before = null, after = null }) {
  const tx = await client.getTransactionBlock({
    digest,
    options: { showEvents: true, showEffects: true, showBalanceChanges: true, showEffects: true, showObjectChanges: true },
  });
  requireExecutionSuccess(tx, "follow_strategy_and_mint summary");
  const strategyFollowed = findRangePilotEvent(tx.events, "StrategyFollowed");
  const platformDeposited = findRangePilotEvent(tx.events, "PlatformFeeDeposited");
  const rangeMinted = parseRangeMintedEvent(tx, deepbookConfig);
  const followedFields = normalizeStrategyFollowedFields(strategyFollowed?.parsedJson ?? null);
  const resolvedStrategy = strategy ?? (followedFields.strategyId ? await readStrategyObject({ client, strategyId: followedFields.strategyId }) : null);
  let directPosition = null;

  if (resolvedStrategy && followedFields.managerId) {
    directPosition = await readRangePositionQuantity({
      managerId: followedFields.managerId,
      oracleId: resolvedStrategy.oracleId,
      oracleObjectId: resolvedStrategy.oracleId,
      expiry: resolvedStrategy.expiry,
      lowerStrike: resolvedStrategy.lowerStrike,
      higherStrike: resolvedStrategy.higherStrike,
      client,
      sender: followedFields.follower ?? followerAddress,
      config: deepbookConfig,
    }).catch((error) => ({ quantity: null, error: sanitizeError(error) }));
  }

  console.log("\nFollow summary");
  console.log(`digest: ${digest}`);
  console.log(`StrategyFollowed event: ${strategyFollowed ? "found" : "not found"}`);
  console.log(`PlatformFeeDeposited event: ${platformDeposited ? "found" : "not found"}`);
  console.log(`RangeMinted event: ${rangeMinted ? "found" : "not found"}`);
  console.log(`follower: ${followedFields.follower ?? "unavailable"}`);
  console.log(`manager ID: ${followedFields.managerId ?? "unavailable"}`);
  console.log(`strategy ID: ${followedFields.strategyId ?? "unavailable"}`);
  console.log(`quantity: ${followedFields.quantity ?? "unavailable"}`);
  console.log(`fee amount: ${followedFields.feeAmountAtomic ?? "unavailable"}`);
  console.log(`creator fee: ${followedFields.creatorFeeAtomic ?? "unavailable"}`);
  console.log(`platform fee: ${followedFields.platformFeeAtomic ?? "unavailable"}`);
  console.log(`direct range_position: ${directPosition?.quantity ?? "unavailable"}`);

  if (rangeMinted?.fields) {
    console.log(`RangeMinted quantity: ${rangeMinted.fields.quantity ?? "unavailable"}`);
    console.log(`RangeMinted cost: ${rangeMinted.fields.costAtomic ?? "unavailable"}`);
  }

  if (before && after) {
    printStateDeltas({ before, after });
  }
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

  if (env !== "testnet") {
    throw new Error(`Active Sui env must be testnet, got ${env}.`);
  }

  if (address !== normalizeAddress(expectedAddress)) {
    throw new Error(`Active Sui address must be ${expectedAddress}, got ${address}.`);
  }
}

async function getSuiGas(client, owner) {
  const balance = await client.getBalance({ owner, coinType: "0x2::sui::SUI" });

  return {
    totalMist: BigInt(balance.totalBalance),
    coinObjectCount: Number(balance.coinObjectCount ?? 0),
  };
}

async function findPredictManagerByOwner({ client, owner }) {
  const fromOwned = await findOwnedPredictManager({ client, owner });
  if (fromOwned.managerId) {
    return fromOwned;
  }

  const fromEvents = await findPredictManagerFromEvents({ client, owner });
  return fromEvents.managerId ? fromEvents : fromOwned;
}

async function findOwnedPredictManager({ client, owner }) {
  const candidates = [];
  let cursor = null;

  do {
    const page = await client.getOwnedObjects({
      owner,
      filter: { StructType: `${deepbookConfig.packageId}::predict_manager::PredictManager` },
      options: { showType: true, showOwner: true, showContent: true },
      cursor,
      limit: 50,
    });

    for (const entry of page.data ?? []) {
      const objectId = entry.data?.objectId;
      if (objectId) {
        candidates.push(objectId);
      }
    }

    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor && candidates.length < 2);

  if (candidates.length === 1) {
    return { managerId: candidates[0], source: "owned_object" };
  }

  if (candidates.length > 1) {
    return { managerId: null, source: "owned_object_ambiguous", candidates };
  }

  return { managerId: null, source: "owned_object_not_found", candidates };
}

async function findPredictManagerFromEvents({ client, owner }) {
  let cursor = null;
  const candidates = [];

  for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
    const page = await client.queryEvents({
      query: { Sender: owner },
      cursor,
      limit: 50,
      order: "descending",
    });

    for (const event of page.data ?? []) {
      if (!event.type?.startsWith(`${deepbookConfig.packageId}::`) || !event.type.endsWith("::predict_manager::PredictManagerCreated")) {
        continue;
      }

      const managerId = managerIdFromParsedJson(event.parsedJson);
      if (managerId) {
        candidates.push(managerId);
      }
    }

    if (!page.hasNextPage || candidates.length > 0) {
      break;
    }

    cursor = page.nextCursor;
  }

  const unique = [...new Set(candidates)];

  if (unique.length === 1) {
    return { managerId: unique[0], source: "sender_event" };
  }

  if (unique.length > 1) {
    return { managerId: null, source: "sender_event_ambiguous", candidates: unique };
  }

  return { managerId: null, source: "sender_event_not_found", candidates: unique };
}

async function readManagerBalanceAtomic({ client, server, sender, managerId }) {
  const fromServer = await tryRead(async () => {
    const summary = await server.getManagerSummary(managerId);
    return findLikelyManagerBalance(summary);
  });

  if (fromServer) {
    return fromServer;
  }

  const tx = new Transaction();
  tx.moveCall({
    target: `${deepbookConfig.packageId}::predict_manager::balance`,
    typeArguments: [deepbookConfig.quoteAssets.DUSDC.coinType],
    arguments: [tx.object(managerId)],
  });
  assertNoForbiddenTargets(tx, "predict_manager::balance devInspect");
  const result = await client.devInspectTransactionBlock({ sender, transactionBlock: tx });

  if (!isDevInspectSuccess(result)) {
    return null;
  }

  const diagnostic = inspectDevInspectU64(result);
  if (!diagnostic.decoded) {
    console.log(`manager balance diagnostic: ${summarizeDevInspectU64Diagnostic(diagnostic)}`);
  }

  return diagnostic.decoded;
}

async function readProtocolVaultBalanceAtomic(client) {
  const response = await client.getObject({
    id: RANGEPILOT_PROTOCOL_VAULT_ID,
    options: { showType: true, showOwner: true, showContent: true },
  });

  if (response.error) {
    throw new Error(`ProtocolVault object read failed: ${response.error.code ?? "unknown"}`);
  }

  const content = response.data?.content;
  const fields = content?.fields ?? content;
  const balance = fields?.balance;
  const value = integerStringOrNull(balance) ?? balance?.fields?.value ?? balance?.value ?? findFirstNumericValue(balance);

  return value === undefined || value === null ? null : String(value);
}

async function loadLatestCreatedStrategy({ client }) {
  let cursor = null;

  for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
    const page = await client.queryEvents({
      query: { MoveEventType: `${RANGEPILOT_WRAPPER_PACKAGE_ID}::strategy::StrategyCreated` },
      cursor,
      limit: 50,
      order: "descending",
    });

    for (const event of page.data ?? []) {
      const fields = normalizeStrategyCreatedFields(event.parsedJson);
      if (fields.creator !== normalizeAddress(adminAddress)) {
        continue;
      }
      if (fields.metadataUri !== metadataUri) {
        continue;
      }
      if (!fields.strategyId) {
        continue;
      }

      return readStrategyObject({ client, strategyId: fields.strategyId });
    }

    if (!page.hasNextPage) {
      break;
    }

    cursor = page.nextCursor;
  }

  throw new Error("No matching StrategyCreated event was found. Pass --strategy-id <id> or run --create-strategy first.");
}

async function readStrategyObject({ client, strategyId }) {
  const response = await client.getObject({
    id: strategyId,
    options: { showType: true, showOwner: true, showContent: true },
  });

  if (response.error) {
    throw new Error(`Strategy object read failed for ${strategyId}: ${response.error.code ?? "unknown"}`);
  }

  const fields = response.data?.content?.fields;
  if (!fields) {
    throw new Error(`Strategy object ${strategyId} content fields were unavailable.`);
  }

  return {
    strategyId,
    shared: Boolean(response.data?.owner?.Shared),
    creator: normalizeAddress(String(fields.creator)),
    oracleId: String(fields.oracle_id),
    expiry: String(fields.expiry),
    lowerStrike: String(fields.lower_strike),
    higherStrike: String(fields.higher_strike),
    defaultQuantity: String(fields.default_quantity),
    creatorFeeBps: Number(fields.creator_fee_bps),
    platformFeeBps: Number(fields.platform_fee_bps),
    metadataUri: decodeMetadataUri(fields.metadata_uri),
    active: Boolean(fields.active),
    createdAtMs: String(fields.created_at_ms),
  };
}

function printPrepareSummary(context) {
  console.log("Mode: wrapper follow preflight");
  console.log(`Network: ${deepbookConfig.network}`);
  console.log(`Follower: ${context.sender}`);
  console.log(`SUI gas: ${context.gas.totalMist.toString()} MIST across ${context.gas.coinObjectCount} coins`);
  console.log(`Wallet DUSDC: ${context.walletDusdc.totalAtomic} atomic across ${context.walletDusdc.coins.length} coins`);
  console.log(`PredictManager: ${context.manager.managerId ?? "not found"} (${context.manager.source})`);
  console.log(`Manager DUSDC balance: ${context.managerBalanceAtomic ?? "unavailable"} atomic`);
  console.log(`Selected fee coin: ${context.feeCoin?.coinObjectId ?? "unavailable"}`);
  console.log(`Expected creator fee: ${expectedCreatorFeeAtomic} atomic`);
  console.log(`Expected platform fee: ${expectedPlatformFeeAtomic} atomic`);

  if (context.selectedCandidate) {
    const candidate = context.selectedCandidate;
    console.log("Selected runtime candidate");
    console.log(`oracle: ${candidate.oracleId}`);
    console.log(`expiry: ${candidate.expiry}`);
    console.log(`lower: ${candidate.lowerStrike}`);
    console.log(`higher: ${candidate.higherStrike}`);
    console.log(`quantity: ${candidate.quantity}`);
    console.log(`mint cost: ${candidate.mintCostAtomic} atomic`);
    console.log(`preflight: ${candidate.preflight.status}`);
  }

  if (context.scan) {
    console.log("Scan diagnostics");
    console.log(`quote successes: ${context.scan.diagnostics.quoteSuccessCount}`);
    console.log(`positive affordable quotes: ${context.scan.diagnostics.positiveAffordableQuoteCount}`);
    console.log(`mint preflight passes: ${context.scan.diagnostics.preflightPassCount}`);
  }

  printBlockers(context.blockers);
  console.log(`preflight gates: ${context.gatesPassed ? "passed" : "blocked"}`);
}

function printFollowGateSummary(context) {
  console.log("\nExact wrapper follow gates");
  console.log(`Follower: ${context.sender}`);
  console.log(`PredictManager: ${context.managerId ?? "not found"} (${context.managerSource})`);
  console.log(`Wallet DUSDC: ${context.walletDusdc.totalAtomic} atomic`);
  console.log(`Manager DUSDC balance: ${context.managerBalanceAtomic ?? "unavailable"} atomic`);
  console.log(`Fee coin: ${context.feeCoin?.coinObjectId ?? "unavailable"}`);
  console.log(`quote: ${context.quote ? `mint_cost=${context.quote.mintCostAtomic} redeem=${context.quote.redeemPayoutAtomic}` : "unavailable"}`);
  console.log(`DeepBook mint preflight: ${context.mintPreflight?.status ?? "not run"}`);
  console.log(`wrapper follow preflight: ${isDevInspectSuccess(context.wrapperPreflight) ? "passed" : context.wrapperPreflight ? "blocked" : "not run"}`);
  printBlockers(context.blockers);
  console.log(`follow gates: ${context.gatesPassed ? "passed" : "blocked"}`);
}

function printStateSnapshot(label, state) {
  console.log(`\n${label}`);
  console.log(`ProtocolVault balance: ${state.protocolVaultBalanceAtomic ?? "unavailable"}`);
  console.log(`creator DUSDC: ${state.creatorDusdcAtomic ?? "unavailable"}`);
  console.log(`follower manager DUSDC: ${state.managerBalanceAtomic ?? "unavailable"}`);
  console.log(`follower range_position: ${state.rangePositionQuantity ?? "unavailable"}`);
  if (state.rangePositionError) {
    console.log(`range_position read error: ${state.rangePositionError}`);
  }
}

function printStateDeltas({ before, after }) {
  console.log("\nPost-state deltas");
  console.log(`ProtocolVault delta: ${formatDelta(before.protocolVaultBalanceAtomic, after.protocolVaultBalanceAtomic)}`);
  console.log(`creator DUSDC delta: ${formatDelta(before.creatorDusdcAtomic, after.creatorDusdcAtomic)}`);
  console.log(`follower manager DUSDC delta: ${formatDelta(before.managerBalanceAtomic, after.managerBalanceAtomic)}`);
  console.log(`follower range_position delta: ${formatDelta(before.rangePositionQuantity, after.rangePositionQuantity)}`);
}

function printBlockers(blockers) {
  if (blockers.length === 0) {
    return;
  }

  for (const blocker of blockers) {
    console.log(`blocker: ${blocker}`);
  }
}

function findSingleDusdcFeeCoin(coins, amountAtomic) {
  const required = BigInt(amountAtomic);

  return [...coins]
    .filter((coin) => BigInt(coin.balanceAtomic) >= required)
    .sort((left, right) => compareBigInt(BigInt(left.balanceAtomic), BigInt(right.balanceAtomic)))[0] ?? null;
}

function findRangePilotEvent(events, name) {
  return events?.find((event) => event.type === `${RANGEPILOT_WRAPPER_PACKAGE_ID}::strategy::${name}`) ?? null;
}

function normalizeStrategyCreatedFields(parsedJson) {
  const record = isRecord(parsedJson) ? parsedJson : {};

  return {
    strategyId: stringOrNull(record.strategy_id),
    creator: normalizeOptionalAddress(record.creator),
    oracleId: stringOrNull(record.oracle_id),
    expiry: integerStringOrNull(record.expiry),
    lowerStrike: integerStringOrNull(record.lower_strike),
    higherStrike: integerStringOrNull(record.higher_strike),
    defaultQuantity: integerStringOrNull(record.default_quantity),
    creatorFeeBps: integerStringOrNull(record.creator_fee_bps),
    platformFeeBps: integerStringOrNull(record.platform_fee_bps),
    metadataUri: decodeMetadataUri(record.metadata_uri),
    createdAtMs: integerStringOrNull(record.created_at_ms),
  };
}

function normalizeStrategyFollowedFields(parsedJson) {
  const record = isRecord(parsedJson) ? parsedJson : {};

  return {
    strategyId: stringOrNull(record.strategy_id),
    creator: normalizeOptionalAddress(record.creator),
    follower: normalizeOptionalAddress(record.follower),
    managerId: stringOrNull(record.manager_id),
    oracleId: stringOrNull(record.oracle_id),
    expiry: integerStringOrNull(record.expiry),
    lowerStrike: integerStringOrNull(record.lower_strike),
    higherStrike: integerStringOrNull(record.higher_strike),
    protocolVaultId: stringOrNull(record.protocol_vault_id),
    quantity: integerStringOrNull(record.quantity),
    feeAmountAtomic: integerStringOrNull(record.fee_amount),
    creatorFeeAtomic: integerStringOrNull(record.creator_fee),
    platformFeeAtomic: integerStringOrNull(record.platform_fee),
    timestampMs: integerStringOrNull(record.timestamp_ms),
  };
}

function findCreatedStrategyObjectId(objectChanges) {
  return objectChanges
    ?.find((change) => change.type === "created" && change.objectType === `${RANGEPILOT_WRAPPER_PACKAGE_ID}::strategy::Strategy`)
    ?.objectId ?? null;
}

function managerIdFromParsedJson(parsedJson) {
  const record = isRecord(parsedJson) ? parsedJson : {};
  const keys = ["manager_id", "managerId", "manager", "predict_manager", "predictManager", "id", "object_id", "objectId"];

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.startsWith("0x")) {
      return value;
    }
  }

  return null;
}

function findLikelyManagerBalance(value) {
  if (!isRecord(value)) {
    return null;
  }

  if (Array.isArray(value.balances)) {
    const dusdc = value.balances.find((entry) => {
      return isRecord(entry) && (
        String(entry.symbol ?? entry.asset ?? "").toUpperCase() === "DUSDC" ||
        String(entry.quote_asset ?? entry.coin_type ?? entry.coinType ?? entry.type ?? "").toLowerCase().includes("::dusdc::dusdc")
      );
    });

    if (isRecord(dusdc)) {
      const balance = integerStringOrNull(dusdc.balance ?? dusdc.amount ?? dusdc.value);
      if (balance !== null) {
        return balance;
      }
    }
  }

  for (const key of ["trading_balance", "balance", "balance_atomic", "dusdc_balance", "dusdc_balance_atomic", "available_balance", "available_balance_atomic"]) {
    const balance = integerStringOrNull(value[key]);
    if (balance !== null) {
      return balance;
    }
  }

  return null;
}

function assertStaticConfig() {
  if (deepbookConfig.network !== "testnet" || wrapperConfig.network !== "testnet") {
    throw new Error("Wrapper follow validation is only allowed against Sui Testnet config.");
  }

  if (RANGEPILOT_WRAPPER_PACKAGE_ID !== "0xe0b877a06541d184b8c3bec46b81ccca2de38495979c25a658f98923407bf697") {
    throw new Error("Unexpected RangePilot wrapper package ID; aborting before any transaction.");
  }

  if (RANGEPILOT_PROTOCOL_VAULT_ID !== "0x9430cc42b879c8f70a855230aecf7042e3efcadb41924cb6ff6c66c8e167d992") {
    throw new Error("Unexpected RangePilot ProtocolVault ID; aborting before any transaction.");
  }

  if (RANGEPILOT_ADMIN_CAP_ID !== "0xbd825bd9f0ea1846314a02977430e691054e56752d8cf30b483cf211fec880f7") {
    throw new Error("Unexpected RangePilot AdminCap ID; aborting before any transaction.");
  }

  if (deepbookConfig.quoteAssets.DUSDC.coinType !== "0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC") {
    throw new Error("Unexpected DUSDC coin type; aborting before any transaction.");
  }
}

function assertNoForbiddenTargets(tx, label) {
  const data = JSON.stringify(tx.getData());
  const directForbidden = forbiddenTransactionTargets.find((target) => data.includes(target));

  if (directForbidden) {
    throw new Error(`${label} transaction contains forbidden target ${directForbidden}; aborting before execution.`);
  }
}

function assertCreateStrategyCliArgs(args) {
  const text = args.join(" ");

  if (!text.includes(`${RANGEPILOT_WRAPPER_PACKAGE_ID} --module strategy --function create_strategy`)) {
    throw new Error("create_strategy CLI target guard failed.");
  }

  assertNoForbiddenCliText(text, "create_strategy CLI");
}

function assertFollowCliArgs(args, feeCoinId, strategyId, managerId, oracleId) {
  const text = args.join(" ");

  if (!text.includes(`${RANGEPILOT_WRAPPER_PACKAGE_ID} --module strategy --function follow_strategy_and_mint`)) {
    throw new Error("follow_strategy_and_mint CLI target guard failed.");
  }

  for (const required of [deepbookConfig.quoteAssets.DUSDC.coinType, strategyId, deepbookConfig.predictId, managerId, oracleId, feeCoinId, RANGEPILOT_PROTOCOL_VAULT_ID, feeAmountAtomic, clockObjectId]) {
    if (!required || !text.includes(required)) {
      throw new Error(`follow_strategy_and_mint CLI missing required argument ${required}.`);
    }
  }

  assertNoForbiddenCliText(text, "follow_strategy_and_mint CLI");
}

function assertNoForbiddenCliText(text, label) {
  for (const forbidden of ["sui client publish", "withdraw_platform_fees", "::predict::mint_range", "::predict::redeem_range", "::predict::supply"]) {
    if (text.includes(forbidden)) {
      throw new Error(`${label} contains forbidden call ${forbidden}.`);
    }
  }
}

async function runSuiCli(args, label) {
  const stdout = await runSuiText(args, label);
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${label} did not return JSON: ${sanitizeError(error)}; stdout=${stdout.slice(0, 500)}`);
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
    throw new Error(`${label} failed: ${stderr || stdout || sanitizeError(error)}`);
  }
}

function requireExecutionSuccess(result, label) {
  const status = result?.effects?.status ?? result?.status ?? null;

  if (status?.status !== "success") {
    throw new Error(`${label} did not succeed: ${status?.error ?? JSON.stringify(status) ?? "unknown execution status"}`);
  }
}

function requireDevInspectSuccess(result, label) {
  if (!isDevInspectSuccess(result)) {
    throw new Error(`${label} did not succeed: ${devInspectError(result)}`);
  }
}

function isDevInspectSuccess(result) {
  if (!result) {
    return false;
  }

  if (typeof result.error === "string") {
    return false;
  }

  return result.effects?.status?.status === "success";
}

function devInspectError(result) {
  return result?.error ?? result?.effects?.status?.error ?? "unknown devInspect error";
}

function extractDigest(value) {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.digest === "string") {
    return value.digest;
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

function parseArgs(args) {
  const parsed = { mode: null, digest: null, strategyId: null };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--prepare") {
      parsed.mode = "prepare";
    } else if (arg === "--create-strategy") {
      parsed.mode = "create-strategy";
    } else if (arg === "--summarize-create") {
      parsed.mode = "summarize-create";
    } else if (arg === "--follow") {
      parsed.mode = "follow";
    } else if (arg === "--summarize-follow") {
      parsed.mode = "summarize-follow";
    } else if (arg === "--digest") {
      parsed.digest = args[index + 1] ?? null;
      index += 1;
    } else if (arg === "--strategy-id" || arg === "--strategy") {
      parsed.strategyId = args[index + 1] ?? null;
      index += 1;
    }
  }

  return parsed;
}

function requireArg(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function decodeMetadataUri(value) {
  if (Array.isArray(value)) {
    const bytes = value.map((entry) => Number(entry));
    return new TextDecoder().decode(new Uint8Array(bytes));
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function findFirstNumericValue(value) {
  if (!isRecord(value)) {
    return null;
  }

  if (integerStringOrNull(value.value) !== null) {
    return value.value;
  }

  for (const child of Object.values(value)) {
    const found = findFirstNumericValue(child);
    if (found !== null) {
      return found;
    }
  }

  return null;
}

async function tryRead(read) {
  try {
    return await read();
  } catch {
    return null;
  }
}

function formatAbort(abort) {
  const label = [abort.module, abort.function, abort.code].filter(Boolean).join("::");
  const known = abort.constantName ? ` (${abort.constantName})` : "";
  const likelyCause = abort.likelyCause ? ` ${abort.likelyCause}` : "";

  return `${label || "Move abort"}${known}: ${abort.message}${likelyCause}`;
}

function formatDelta(beforeValue, afterValue) {
  if (beforeValue === null || beforeValue === undefined || afterValue === null || afterValue === undefined) {
    return "unavailable";
  }

  return (BigInt(afterValue) - BigInt(beforeValue)).toString();
}

function compareBigInt(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function integerStringOrNull(value) {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    return null;
  }

  try {
    const integer = BigInt(value);
    return integer >= 0n ? integer.toString() : null;
  } catch {
    return null;
  }
}

function stringOrNull(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeOptionalAddress(value) {
  return typeof value === "string" ? normalizeAddress(value) : null;
}

function normalizeAddress(value) {
  return value.toLowerCase();
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
