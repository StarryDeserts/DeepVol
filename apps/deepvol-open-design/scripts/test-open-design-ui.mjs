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

// ── Verified app fallback boundary ──
console.log("\nVerified app fallback boundary:");
const btcMarket = fileContent("routes/BtcMarketPage.tsx");
const productRoute = fileContent("lib/productRoute.ts");
const packageJson = readFileSync(join(ROOT, "package.json"), "utf-8");
assert("productRoute exports verifiedTradingHref", productRoute.includes("verifiedTradingHref"));
assert("productRoute supports verified app base env", productRoute.includes("VITE_DEEPVOL_VERIFIED_APP_URL"));
assert("verified MOVE route targets old app", productRoute.includes('MOVE: "/buy/btc-move"'));
assert("verified UP route targets old app", productRoute.includes('UP: "/primitives?type=UP"'));
assert("verified DOWN route targets old app", productRoute.includes('DOWN: "/primitives?type=DOWN"'));
assert("verified RANGE route targets old app", productRoute.includes('RANGE: "/primitives?type=RANGE"'));
assert("Open Design depends on shared trading package", packageJson.includes('"@deepvol/trading-react"'));
assert("BtcMarketPage imports shared trading machines", btcMarket.includes("@deepvol/trading-react") && btcMarket.includes("useMoveTradeMachine") && btcMarket.includes("useUpTradeMachine") && btcMarket.includes("useDownTradeMachine") && btcMarket.includes("useRangeTradeMachine"));
assert("BtcMarketPage imports verified trading helper", btcMarket.includes("verifiedTradingHref"));
assert("BtcMarketPage does not render PredictManager setup", !btcMarket.includes("<PredictManagerSetup"));
assert("BtcMarketPage explains shared verified execution", btcMarket.includes("Open Design direct controls use the shared verified trading state machine."));
assert("BtcMarketPage keeps verified app execution fallback copy", btcMarket.includes("Trading execution is handled by the verified DeepVol app."));
assert("BtcMarketPage warns automated smoke not to review wallet", btcMarket.includes("Automated smoke must not click wallet review"));

// ── PredictManager setup remains legacy-only ──
console.log("\nPredictManager setup legacy component:");
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

// ── RANGE fallback support ──
console.log("\nRANGE support:");
assert("BtcMarketPage handles RANGE product tab", btcMarket.includes("RANGE"));
assert("BtcMarketPage routes RANGE to verified app", productRoute.includes('RANGE: "/primitives?type=RANGE"'));
assert(
  "RANGE is not a dead-end disabled flow in BtcMarketPage",
  !btcMarket.includes("Mint disabled") && !btcMarket.includes("Execution disabled"),
);

// ── State system components ──
console.log("\nState system:");
assert("QuotePanel exists", fileExists("components/organisms/QuotePanel.tsx"));
assert("PreflightPanel exists", fileExists("components/organisms/PreflightPanel.tsx"));
assert("WalletActionBar exists", fileExists("components/organisms/WalletActionBar.tsx"));

// ── Legacy execution components are not exposed by the BTC route ──
console.log("\nExecution fallback wiring:");
assert("MoveExecutionPanel still exists as legacy source", fileExists("components/trade/MoveExecutionPanel.tsx"));
const movePanel = fileContent("components/trade/MoveExecutionPanel.tsx");
assert("BinaryPrimitiveExecutionPanel still exists as legacy source", fileExists("components/trade/BinaryPrimitiveExecutionPanel.tsx"));
const binaryPanel = fileContent("components/trade/BinaryPrimitiveExecutionPanel.tsx");
assert("RangeExecutionPanel still exists as legacy source", fileExists("components/trade/RangeExecutionPanel.tsx"));
const rangePanel = fileContent("components/trade/RangeExecutionPanel.tsx");
assert("WalletActionButton still exists as legacy source", fileExists("components/trade/WalletActionButton.tsx"));
assert("BtcMarketPage does not render direct MOVE execution panel", !btcMarket.includes("<MoveExecutionPanel"));
assert("BtcMarketPage does not render direct binary execution panel", !btcMarket.includes("<BinaryPrimitiveExecutionPanel"));
assert("BtcMarketPage does not render direct RANGE execution panel", !btcMarket.includes("<RangeExecutionPanel"));
assert("BtcMarketPage does not import direct execution panels", !btcMarket.includes("../components/trade/MoveExecutionPanel") && !btcMarket.includes("../components/trade/BinaryPrimitiveExecutionPanel") && !btcMarket.includes("../components/trade/RangeExecutionPanel"));

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

// ── DeepVol-38: shared machine direct controls with verified app fallback ──
console.log("\nShared machine execution boundary (DeepVol-38):");
const landingPage = fileContent("routes/LandingPage.tsx");
const marketsPage = fileContent("routes/MarketsPage.tsx");
const portfolioPage = fileContent("routes/PortfolioPage.tsx");
assert("LandingPage uses verified trading CTA", landingPage.includes("verifiedTradingHref"));
assert("MarketsPage uses verified trading CTA", marketsPage.includes("verifiedTradingHref"));
assert("PortfolioPage uses verified trading CTA", portfolioPage.includes("verifiedTradingHref"));
assert("BtcMarketPage keeps product tabs", btcMarket.includes("MOVE") && btcMarket.includes("UP") && btcMarket.includes("DOWN") && btcMarket.includes("RANGE"));
assert("BtcMarketPage keeps active market status", btcMarket.includes("market.statusLabel") && btcMarket.includes("expiryDisplay"));
assert("BtcMarketPage renders shared machine steps", btcMarket.includes("Verified state-machine steps") && btcMarket.includes("machine.steps"));
assert("BtcMarketPage wires Review in wallet to shared action", btcMarket.includes("Review in wallet") && btcMarket.includes("machine.actions.reviewInWallet") && btcMarket.includes("reviewAction?.run()"));
assert("BtcMarketPage gates Review in wallet on blockers and action state", btcMarket.includes("machine.blockers.length > 0") && btcMarket.includes("reviewAction.disabled"));
assert("BtcMarketPage keeps verified CTA fallback for selected product", btcMarket.includes("href={verifiedTradingHref(product)}"));
assert("BtcMarketPage renders display-only execution diagnostics", btcMarket.includes("<MachineDiagnostics") && btcMarket.includes("diagnostics={machine.diagnostics}"));
assert("BtcMarketPage does not import Open Design local execution hooks", !btcMarket.includes("../hooks/useBtcMoveMintableRange") && !btcMarket.includes("../hooks/usePrimitiveMintableStrike") && !btcMarket.includes("../hooks/usePrimitiveMintableRange") && !btcMarket.includes("../hooks/useDeepVolQuote") && !btcMarket.includes("../hooks/useDeepVolPreflight") && !btcMarket.includes("../hooks/usePrimitivePreflight") && !btcMarket.includes("../hooks/usePrimitiveWalletExecution"));
assert("BtcMarketPage exposes shared prep actions without faking pass state", btcMarket.includes("generateMintableRange") && btcMarket.includes("generateMintableStrike") && btcMarket.includes("generateMintableInterval") && !btcMarket.includes('status: "passed"'));
assert("BtcMarketPage no longer renders legacy direct execution panels", !btcMarket.includes("<MoveExecutionPanel") && !btcMarket.includes("<BinaryPrimitiveExecutionPanel") && !btcMarket.includes("<RangeExecutionPanel"));
assert("Fallback CTAs mention verified app", btcMarket.includes("verified DeepVol app") && landingPage.includes("verified DeepVol app") && marketsPage.includes("verified DeepVol app") && portfolioPage.includes("verified DeepVol app"));
assert("Primitive fallback CTAs cover UP/DOWN/RANGE", portfolioPage.includes('"UP", "DOWN", "RANGE"') && productRoute.includes('UP: "/primitives?type=UP"') && productRoute.includes('DOWN: "/primitives?type=DOWN"'));
assert("Legacy binary and range panels remain product-isolated", !binaryPanel.includes("BTC MOVE range") && !rangePanel.includes("BTC MOVE range"));

console.log("\nVerified app remains source of executable state machine:");
assert("Old UI state machine parity doc exists", repoFileExists("docs/DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md"));
const oldUiStateMachineDoc = repoFileExists("docs/DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md") ? repoFileContent("docs/DEEPVOL_OLD_UI_TRADING_STATE_MACHINE.md") : "";
assert("Old UI state machine doc covers MOVE order", oldUiStateMachineDoc.includes("active market -> mintable range -> VolSeries -> quote -> preflight -> wallet"));
assert("Old UI state machine doc covers UP/DOWN order", oldUiStateMachineDoc.includes("active market -> mintable strike -> quote -> preflight -> wallet"));
assert("Old UI state machine doc covers RANGE order", oldUiStateMachineDoc.includes("active market -> mintable interval -> quote -> preflight -> wallet"));
assert("Old UI state machine doc records no Claude transactions", oldUiStateMachineDoc.includes("Claude Code did not execute") && oldUiStateMachineDoc.includes("RANGE mint"));

// ── Summary ──
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("\nFAIL open-design-ui tests");
  process.exit(1);
} else {
  console.log("\nPASS open-design-ui tests");
}
