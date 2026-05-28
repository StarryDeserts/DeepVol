/**
 * test-open-design-ui.mjs — structural and isolation tests for DeepVol Open Design app
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const REPO_ROOT = resolve(ROOT, "../..");
const SRC = join(ROOT, "src");

let pass = 0;
let fail = 0;

function assert(label, ok) {
  if (ok) {
    pass++;
  } else {
    fail++;
    console.error(`  FAIL  ${label}`);
  }
}

function fileExists(rel) {
  return existsSync(join(SRC, rel));
}

function fileContent(rel) {
  return readFileSync(join(SRC, rel), "utf-8");
}

function repoFileExists(rel) {
  return existsSync(join(REPO_ROOT, rel));
}

function repoFileContent(rel) {
  return readFileSync(join(REPO_ROOT, rel), "utf-8");
}

function allTsFiles(dir, results = []) {
  const abs = join(SRC, dir);
  if (!existsSync(abs)) return results;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      allTsFiles(join(dir, entry.name), results);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      results.push(join(dir, entry.name));
    }
  }
  return results;
}

console.log("test:open-design-ui\n");

// ── Route existence ──
console.log("Route files:");
assert("LandingPage exists", fileExists("routes/LandingPage.tsx"));
assert("MarketsPage exists", fileExists("routes/MarketsPage.tsx"));
assert("BtcMarketPage exists", fileExists("routes/BtcMarketPage.tsx"));
assert("PortfolioPage exists", fileExists("routes/PortfolioPage.tsx"));

// ── Router handles compat routes ──
console.log("\nRouter compat routes:");
const appContent = fileContent("App.tsx");
assert("App.tsx references /markets/btc", appContent.includes("/markets/btc"));
assert("App.tsx references /portfolio", appContent.includes("/portfolio"));

// ── Component structure ──
console.log("\nComponent structure:");
assert("TradeTabs exists", fileExists("components/trade/TradeTabs.tsx"));
assert("MoveTradePanel exists", fileExists("components/trade/MoveTradePanel.tsx"));
assert("PrimitiveTradePanel exists", fileExists("components/trade/PrimitiveTradePanel.tsx"));

const tradeTabs = fileContent("components/trade/TradeTabs.tsx");
assert("TradeTabs has MOVE tab", tradeTabs.includes("MOVE"));
assert("TradeTabs has UP tab", tradeTabs.includes("UP"));
assert("TradeTabs has DOWN tab", tradeTabs.includes("DOWN"));
assert("TradeTabs has RANGE tab", tradeTabs.includes("RANGE"));

// ── PredictManager not in main flow ──
console.log("\nPredictManager UX:");
const btcMarket = fileContent("routes/BtcMarketPage.tsx");
assert(
  "BtcMarketPage uses usePredictManagerSession (auto-discovery)",
  btcMarket.includes("usePredictManagerSession"),
);
assert(
  "PredictManager manual ID not in main trade flow",
  !btcMarket.includes("Enter PredictManager ID") &&
    !btcMarket.includes("Manual manager ID"),
);

// ── PredictManager setup CTA ──
console.log("\nPredictManager setup CTA:");
assert("PredictManagerSetup exists", fileExists("components/trade/PredictManagerSetup.tsx"));
const pmSetup = fileContent("components/trade/PredictManagerSetup.tsx");
assert("PredictManagerSetup imports PredictManagerSession type", pmSetup.includes("PredictManagerSession"));
assert("PredictManagerSetup calls createManager", pmSetup.includes("createManager"));
assert("PredictManagerSetup handles wallet_required", pmSetup.includes("wallet_required"));
assert("PredictManagerSetup handles wrong_network", pmSetup.includes("wrong_network"));
assert("PredictManagerSetup handles missing status", pmSetup.includes('"missing"'));
assert("PredictManagerSetup handles loading status", pmSetup.includes('"loading"'));
assert("PredictManagerSetup handles invalid status", pmSetup.includes('"invalid"'));
assert("PredictManagerSetup handles error status", pmSetup.includes('"error"'));
assert("PredictManagerSetup handles ready status with funding check", pmSetup.includes('"ready"') && pmSetup.includes("ManagerFundingCard"));
assert("PredictManagerSetup has manual override under details", pmSetup.includes("<details") && pmSetup.includes("setManualManager"));
assert("BtcMarketPage imports PredictManagerSetup", btcMarket.includes("PredictManagerSetup"));
assert("BtcMarketPage renders PredictManagerSetup", btcMarket.includes("<PredictManagerSetup"));
assert("BtcMarketPage no longer has passive blocker pills", !btcMarket.includes('pill pill-warn text-[10px]'));

// ── TransactionStatusStrip ──
console.log("\nTransactionStatusStrip:");
assert("TransactionStatusStrip exists", fileExists("components/trade/TransactionStatusStrip.tsx"));
const txStrip = fileContent("components/trade/TransactionStatusStrip.tsx");
assert("TransactionStatusStrip handles idle state", txStrip.includes('"idle"'));
assert("TransactionStatusStrip handles success state", txStrip.includes("toast-pass"));
assert("TransactionStatusStrip handles failed state", txStrip.includes("toast-fail"));

// ── ManagerFundingCard ──
console.log("\nManagerFundingCard:");
assert("ManagerFundingCard exists", fileExists("components/trade/ManagerFundingCard.tsx"));
const fundingCard = fileContent("components/trade/ManagerFundingCard.tsx");
assert("ManagerFundingCard calls buildDepositDusdcTransaction", fundingCard.includes("buildDepositDusdcTransaction"));
assert("ManagerFundingCard calls selectDusdcCoinsForAmount", fundingCard.includes("selectDusdcCoinsForAmount"));
assert("ManagerFundingCard uses useDeepVolDusdcBalance", fundingCard.includes("useDeepVolDusdcBalance"));
assert("ManagerFundingCard uses translateDeepBookPredictError", fundingCard.includes("translateDeepBookPredictError"));
assert("ManagerFundingCard has deposit CTA", fundingCard.includes("Deposit DUSDC"));
assert("ManagerFundingCard is wired to action handler", fundingCard.includes("depositDusdc"));

// ── PredictManagerSetup funding integration ──
console.log("\nPredictManagerSetup funding:");
assert("PredictManagerSetup no longer returns null when ready", !pmSetup.includes('if (status === "ready") return null'));
assert("PredictManagerSetup imports ManagerFundingCard", pmSetup.includes("ManagerFundingCard"));
assert("PredictManagerSetup checks balance for funding state", pmSetup.includes("isFunded"));

// ── AdvancedDetails exists ──
assert("AdvancedDetails exists", fileExists("components/organisms/AdvancedDetails.tsx"));
const advDetails = fileContent("components/organisms/AdvancedDetails.tsx");
assert("AdvancedDetails uses <details> element", advDetails.includes("<details"));

// ── Portfolio sections ──
console.log("\nPortfolio:");
const portfolio = fileContent("routes/PortfolioPage.tsx");
assert("Portfolio references MOVE Receipts", portfolio.includes("Receipt") || portfolio.includes("receipt"));
assert(
  "Portfolio references Primitive Positions",
  portfolio.includes("Primitive") || portfolio.includes("primitive"),
);

// ── RANGE diagnostics ──
console.log("\nRANGE support:");
assert(
  "BtcMarketPage handles RANGE product tab",
  btcMarket.includes("RANGE"),
);
assert(
  "BtcMarketPage imports RangeExecutionPanel",
  btcMarket.includes("RangeExecutionPanel"),
);
assert(
  "RANGE panel is NOT hardcoded disabled in BtcMarketPage",
  !btcMarket.includes("Mint disabled") && !btcMarket.includes("Execution disabled"),
);

// ── State system components ──
console.log("\nState system:");
assert("QuotePanel exists", fileExists("components/organisms/QuotePanel.tsx"));
assert("PreflightPanel exists", fileExists("components/organisms/PreflightPanel.tsx"));
assert("WalletActionBar exists", fileExists("components/organisms/WalletActionBar.tsx"));

// ── Execution wiring ──
console.log("\nExecution wiring:");
const movePanel = fileContent("components/trade/MoveExecutionPanel.tsx");
assert("MoveExecutionPanel imports useBuyMoveReceipt", movePanel.includes("useBuyMoveReceipt"));
assert("MoveExecutionPanel imports useDeepVolQuote", movePanel.includes("useDeepVolQuote"));
assert("MoveExecutionPanel imports useActiveBtcMoveSeries", movePanel.includes("useActiveBtcMoveSeries"));
assert("MoveExecutionPanel has submit handler", movePanel.includes(".submit") || movePanel.includes("onSubmit"));

// ── MOVE active market context ──
console.log("\nMOVE active market context:");
assert("MoveExecutionPanel shows active market section", movePanel.includes("Active market"));
assert("MoveExecutionPanel imports formatTimestampMs", movePanel.includes("formatTimestampMs"));
assert("MoveExecutionPanel shows market help for idle series", movePanel.includes("BTC market discovered"));

assert("BinaryPrimitiveExecutionPanel exists", fileExists("components/trade/BinaryPrimitiveExecutionPanel.tsx"));
const binaryPanel = fileContent("components/trade/BinaryPrimitiveExecutionPanel.tsx");
assert("BinaryPrimitiveExecutionPanel imports usePrimitiveWalletExecution", binaryPanel.includes("usePrimitiveWalletExecution"));
assert("BinaryPrimitiveExecutionPanel imports usePrimitiveQuote", binaryPanel.includes("usePrimitiveQuote"));
assert("BinaryPrimitiveExecutionPanel imports usePrimitivePreflight", binaryPanel.includes("usePrimitivePreflight"));
assert("BinaryPrimitiveExecutionPanel has submit handler", binaryPanel.includes(".submit") || binaryPanel.includes("onSubmit"));

assert("RangeExecutionPanel exists", fileExists("components/trade/RangeExecutionPanel.tsx"));
const rangePanel = fileContent("components/trade/RangeExecutionPanel.tsx");
assert("RangeExecutionPanel imports usePrimitiveWalletExecution", rangePanel.includes("usePrimitiveWalletExecution"));
assert("RangeExecutionPanel imports usePrimitiveMintableRange", rangePanel.includes("usePrimitiveMintableRange"));
assert("RangeExecutionPanel has submit handler", rangePanel.includes(".submit") || rangePanel.includes("onSubmit"));
assert("RANGE is NOT hardcoded permanently disabled", !rangePanel.includes("Execution disabled") && !rangePanel.includes("Mint disabled"));

// ── Button UX ──
console.log("\nButton UX:");
assert("WalletActionButton exists", fileExists("components/trade/WalletActionButton.tsx"));
const actionButton = fileContent("components/trade/WalletActionButton.tsx");
assert("WalletActionButton shows blockers", actionButton.includes("blockers"));
assert("WalletActionButton handles transactionStatus", actionButton.includes("transactionStatus"));

// ── BtcMarketPage wiring ──
console.log("\nBtcMarketPage wiring:");
assert("BtcMarketPage imports MoveExecutionPanel", btcMarket.includes("MoveExecutionPanel"));
assert("BtcMarketPage imports BinaryPrimitiveExecutionPanel", btcMarket.includes("BinaryPrimitiveExecutionPanel"));
assert("BtcMarketPage imports RangeExecutionPanel", btcMarket.includes("RangeExecutionPanel"));

// ── Import isolation ──
console.log("\nImport isolation:");
const allFiles = allTsFiles(".");
let isolationClean = true;
for (const f of allFiles) {
  const content = fileContent(f);
  if (content.includes("deepvol-web/src/components")) {
    console.error(`  FAIL  ${f} imports from deepvol-web/src/components`);
    isolationClean = false;
    fail++;
  }
  if (content.includes("deepvol-web/src/styles")) {
    console.error(`  FAIL  ${f} imports from deepvol-web/src/styles`);
    isolationClean = false;
    fail++;
  }
}
if (isolationClean) {
  pass++;
  // Count as one passing assertion
}
assert(
  "No runtime import from apps/deepvol-web UI",
  isolationClean,
);

// ── DeepVol-32: Product context isolation ──
console.log("\nProduct context isolation (DeepVol-32):");
const gateFile = fileContent("hooks/primitiveQuoteGate.ts");
assert(
  "primitiveQuoteGate does not use MOVE-specific VolSeries text",
  !gateFile.includes("BTC MOVE VolSeries"),
);
assert(
  "primitiveQuoteGate buildPrimitivePreflightBlockers checks mintability",
  gateFile.includes("primitiveMintabilityStatus") && gateFile.includes("rangeMintabilityStatus"),
);
assert(
  "PrimitiveInputState has primitiveMintabilityStatus field",
  gateFile.includes("primitiveMintabilityStatus?:"),
);
assert(
  "PrimitiveInputState has rangeMintabilityStatus field",
  gateFile.includes("rangeMintabilityStatus?:"),
);

console.log("\nPreflight mintability threading:");
const preflightHook = fileContent("hooks/usePrimitivePreflight.ts");
assert(
  "usePrimitivePreflight accepts primitiveMintabilityStatus param",
  preflightHook.includes("primitiveMintabilityStatus"),
);
assert(
  "usePrimitivePreflight accepts rangeMintabilityStatus param",
  preflightHook.includes("rangeMintabilityStatus"),
);

console.log("\nCaller wiring:");
assert(
  "BinaryPrimitiveExecutionPanel passes primitiveMintabilityStatus to preflight",
  binaryPanel.includes("primitiveMintabilityStatus: mintableStrike.status") ||
    (binaryPanel.includes("primitiveMintabilityStatus") && binaryPanel.includes("mintableStrike.status")),
);
assert(
  "RangeExecutionPanel passes rangeMintabilityStatus to preflight",
  rangePanel.includes("rangeMintabilityStatus: mintableRange.status") ||
    (rangePanel.includes("rangeMintabilityStatus") && rangePanel.includes("mintableRange.status")),
);

console.log("\nMOVE range band fallback:");
assert(
  "MoveExecutionPanel uses suggestedLowerStrike fallback",
  movePanel.includes("suggestedLowerStrike"),
);
assert(
  "MoveExecutionPanel uses suggestedUpperStrike fallback",
  movePanel.includes("suggestedUpperStrike"),
);

console.log("\nBinary panel does not use MOVE copy:");
assert(
  "BinaryPrimitiveExecutionPanel has no BTC MOVE range text",
  !binaryPanel.includes("BTC MOVE range"),
);
assert(
  "RangeExecutionPanel has no BTC MOVE range text",
  !rangePanel.includes("BTC MOVE range"),
);

// ── DeepVol-33: Runtime mintability input parity ──
console.log("\nRuntime mintability input parity (DeepVol-33):");
assert("tradeRuntimeContext exists", fileExists("hooks/tradeRuntimeContext.ts"));
const runtimeContext = fileExists("hooks/tradeRuntimeContext.ts") ? fileContent("hooks/tradeRuntimeContext.ts") : "";
assert("tradeRuntimeContext exports buildTradeRuntimeContext", runtimeContext.includes("buildTradeRuntimeContext"));
assert("tradeRuntimeContext normalizes quantity", runtimeContext.includes("normalizePositiveIntegerInput"));
assert("tradeRuntimeContext validates oracleObjectId", runtimeContext.includes("oracleObjectId") && runtimeContext.includes("Missing runtime input: oracleObjectId"));
assert("tradeRuntimeContext validates anchor", runtimeContext.includes("forward or spot"));
assert("tradeRuntimeContext validates tickSize", runtimeContext.includes("Missing runtime input: tickSize"));
assert("tradeRuntimeContext validates minStrike", runtimeContext.includes("Missing runtime input: minStrike"));
assert("tradeRuntimeContext emits dependencyKey", runtimeContext.includes("dependencyKey"));

assert("mintabilityDiagnostics exists", fileExists("hooks/mintabilityDiagnostics.ts"));
const diagnostics = fileExists("hooks/mintabilityDiagnostics.ts") ? fileContent("hooks/mintabilityDiagnostics.ts") : "";
assert("mintabilityDiagnostics tracks failure family", diagnostics.includes("failureFamily"));
assert("mintabilityDiagnostics tracks raw failure summary", diagnostics.includes("rawErrorSummary"));
assert("mintabilityDiagnostics distinguishes quote and preflight", diagnostics.includes("quoteStatus") && diagnostics.includes("preflightStatus"));

const moveMintabilityHook = fileContent("hooks/useBtcMoveMintableRange.ts");
const primitiveStrikeHook = fileContent("hooks/usePrimitiveMintableStrike.ts");
const primitiveRangeHook = fileContent("hooks/usePrimitiveMintableRange.ts");
assert("MOVE mintability uses runtime context", moveMintabilityHook.includes("buildTradeRuntimeContext"));
assert("UP/DOWN mintability uses runtime context", primitiveStrikeHook.includes("buildTradeRuntimeContext"));
assert("RANGE mintability uses runtime context", primitiveRangeHook.includes("buildTradeRuntimeContext"));
assert("MOVE mintability passes raw activeMarket fields to SDK", moveMintabilityHook.includes("oracleId: activeMarket.oracleId") && !moveMintabilityHook.includes("runtimeContext.sdkInput"));
assert("UP/DOWN mintability passes raw activeMarket fields to SDK", primitiveStrikeHook.includes("oracleId: activeMarket.oracleId") && !primitiveStrikeHook.includes("runtimeContext.sdkInput"));
assert("RANGE mintability passes raw activeMarket fields to SDK", primitiveRangeHook.includes("oracleId: activeMarket.oracleId") && !primitiveRangeHook.includes("runtimeContext.sdkInput"));
assert("MOVE mintability does not reset on price-bearing dependency key", !moveMintabilityHook.includes("runtimeContext.dependencyKey") && moveMintabilityHook.includes("prerequisiteBlockers") && !moveMintabilityHook.includes("if (!runtimeContext.sdkInput)"));
assert("UP/DOWN mintability does not reset on price-bearing dependency key", !primitiveStrikeHook.includes("runtimeContext.dependencyKey") && primitiveStrikeHook.includes("prerequisiteBlockers") && !primitiveStrikeHook.includes("if (!runtimeContext.sdkInput)"));
assert("RANGE mintability resets on market-identity key not price", primitiveRangeHook.includes("resetValidationScopeKey") && primitiveRangeHook.includes("[resetValidationScopeKey]") && !primitiveRangeHook.includes("runtimeContext.dependencyKey") && primitiveRangeHook.includes("prerequisiteBlockers") && !primitiveRangeHook.includes("if (!runtimeContext.sdkInput)"));
assert("UP/DOWN mintability hook is binary only", !primitiveStrikeHook.includes('primitiveKind: "UP" | "DOWN" | "RANGE"'));

// ── DeepVol-36: dependencyKey / reset key no longer carry oracle price ──
assert("tradeRuntimeContext dependencyKey excludes oracle price", (() => {
  const start = runtimeContext.indexOf("buildRuntimeDependencyKey({");
  const end = runtimeContext.indexOf("});", start);
  if (start < 0 || end < 0) return false;
  const call = runtimeContext.slice(start, end);
  return !call.includes("spot") && !call.includes("forward");
})());
assert("RANGE reset scope key excludes oracle price", (() => {
  const start = primitiveRangeHook.indexOf("const resetValidationScopeKey");
  const end = primitiveRangeHook.indexOf("]);", start);
  if (start < 0 || end < 0) return false;
  const block = primitiveRangeHook.slice(start, end);
  return !block.includes("spot") && !block.includes("forward");
})());

assert("TradeRuntimeDiagnostics exists", fileExists("components/trade/TradeRuntimeDiagnostics.tsx"));
const runtimeDiagnostics = fileExists("components/trade/TradeRuntimeDiagnostics.tsx") ? fileContent("components/trade/TradeRuntimeDiagnostics.tsx") : "";
assert("TradeRuntimeDiagnostics labels wallet DUSDC separately", runtimeDiagnostics.includes("Wallet DUSDC"));
assert("TradeRuntimeDiagnostics labels PredictManager DUSDC separately", runtimeDiagnostics.includes("PredictManager DUSDC"));
assert("TradeRuntimeDiagnostics labels quote mint cost", runtimeDiagnostics.includes("Quote mint cost"));
assert("TradeRuntimeDiagnostics labels anchor source", runtimeDiagnostics.includes("Anchor source"));
assert("TradeRuntimeDiagnostics labels oracle object", runtimeDiagnostics.includes("Oracle object"));
assert("MoveExecutionPanel renders runtime diagnostics", movePanel.includes("TradeRuntimeDiagnostics"));
assert("BinaryPrimitiveExecutionPanel renders runtime diagnostics", binaryPanel.includes("TradeRuntimeDiagnostics"));
assert("RangeExecutionPanel renders runtime diagnostics", rangePanel.includes("TradeRuntimeDiagnostics"));

const deepVolQuote = fileContent("hooks/useDeepVolQuote.ts");
assert("DeepVol quote accepts active market context", deepVolQuote.includes("activeMarket"));
assert("DeepVol quote no longer uses series.oracleId as oracleObjectId", !deepVolQuote.includes("oracleObjectId: series.oracleId"));
assert("DeepVol quote keys include oracleObjectId", deepVolQuote.includes("oracleObjectId"));

// ── DeepVol-34: Verified state-machine parity ──
console.log("\nVerified state-machine parity (DeepVol-34):");
assert("Old UI state machine parity doc exists", repoFileExists("docs/DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md"));
const oldUiStateMachineDoc = repoFileExists("docs/DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md") ? repoFileContent("docs/DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md") : "";
assert("Old UI state machine doc covers MOVE order", oldUiStateMachineDoc.includes("active market -> mintable range -> VolSeries -> quote -> preflight -> wallet"));
assert("Old UI state machine doc covers UP/DOWN order", oldUiStateMachineDoc.includes("active market -> mintable strike -> quote -> preflight -> wallet"));
assert("Old UI state machine doc covers RANGE order", oldUiStateMachineDoc.includes("active market -> mintable interval -> quote -> preflight -> wallet"));
assert("Old UI state machine doc records no Claude transactions", oldUiStateMachineDoc.includes("Claude Code did not execute") && oldUiStateMachineDoc.includes("RANGE mint"));

assert("MOVE step order matches old app", movePanel.includes("useCreateVolSeries") && movePanel.includes("moveQuoteSeriesId") && movePanel.includes("moveSeriesReadyForQuote") && movePanel.includes("mintable range -&gt; VolSeries -&gt; quote -&gt; preflight -&gt; wallet"));
assert("MOVE quote waits for state-machine series", movePanel.includes("seriesId: moveQuoteSeriesId") && movePanel.includes('moveSeries.status === "ready"'));
assert("MOVE VolSeries creation is gated by mintability", movePanel.includes("Create or select a VolSeries") && movePanel.includes("mintableRange.status === \"passed\"") && movePanel.includes("recordCreatedSeries"));

assert("UP step order matches old app", binaryPanel.includes("quoteStrikeInput") && binaryPanel.includes('mintableStrike.status === "passed"') && binaryPanel.includes("mintable strike -&gt; quote -&gt; preflight -&gt; wallet"));
assert("DOWN step order matches old app", binaryPanel.includes('kind: "UP" | "DOWN"') && binaryPanel.includes("quoteStrikeInput") && binaryPanel.includes("primitiveMintabilityStatus: mintableStrike.status"));
assert("UP/DOWN quote uses only passed mintable strike", binaryPanel.includes("strikeInput: quoteStrikeInput") && !binaryPanel.includes("strikeInput: mintableStrike.candidate?.strike ?? strikeInput"));

assert("RANGE step order matches old app", rangePanel.includes("quoteLowerStrikeInput") && rangePanel.includes("quoteUpperStrikeInput") && rangePanel.includes('mintableRange.status === "passed"') && rangePanel.includes("mintable interval -&gt; quote -&gt; preflight -&gt; wallet"));
assert("RANGE quote uses only passed mintable interval", rangePanel.includes("lowerStrikeInput: quoteLowerStrikeInput") && rangePanel.includes("upperStrikeInput: quoteUpperStrikeInput") && !rangePanel.includes("lowerStrikeInput: effectiveLower"));
assert("RANGE does not run preflight after 0 passed candidates", gateFile.includes("rangeMintabilityStatus") && gateFile.includes("Validate a mintable RANGE interval before running preflight."));
assert("mintability failed blocks preflight", gateFile.includes("primitiveMintabilityStatus !== \"passed\"") && gateFile.includes("rangeMintabilityStatus !== \"passed\""));

const walletExecution = fileContent("hooks/usePrimitiveWalletExecution.ts");
assert("non-positive quote != insufficient balance", walletExecution.includes("Fresh primitive mint cost must be positive") && walletExecution.includes("PredictManager DUSDC balance must cover") && diagnostics.includes("classifyBalanceFailure"));
assert("product contexts are isolated", !binaryPanel.includes("BTC MOVE range") && !rangePanel.includes("BTC MOVE range") && !primitiveStrikeHook.includes('primitiveKind: "UP" | "DOWN" | "RANGE"'));

// ── Summary ──
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("\nFAIL open-design-ui tests");
  process.exit(1);
} else {
  console.log("\nPASS open-design-ui tests");
}
