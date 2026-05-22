import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const gateSource = readFileSync("src/hooks/primitiveQuoteGate.ts", "utf8");
const packageSource = readFileSync("package.json", "utf8");
const routePath = "src/routes/PrimitiveQuotePage.tsx";
const panelPath = "src/components/PrimitiveQuotePanel.tsx";
const executionHookPath = "src/hooks/usePrimitiveWalletExecution.ts";

for (const expected of [
  "Connect a Sui wallet before refreshing primitive quotes.",
  "Switch the connected wallet to Sui Testnet before refreshing primitive quotes.",
  "Configured BTC MOVE VolSeries must be loaded before primitive quotes.",
  "Configured BTC MOVE VolSeries is inactive.",
  "Enter a positive integer quantity for primitive quote.",
  "Enter a positive strike for UP/DOWN primitive quote.",
  "Enter positive lower and upper strikes for RANGE primitive quote.",
  "RANGE lower strike must be below upper strike.",
  "Enter a PredictManager ID before running primitive mint preflight.",
  "Refresh a fresh primitive quote before running mint preflight.",
  "RANGE wallet execution remains disabled until dedicated mintability validation passes.",
  "Refresh quote before wallet review.",
  "Run primitive mint preflight again for the current quote and wallet state.",
  "PredictManager DUSDC balance must cover the current mint cost.",
]) {
  assert.ok(gateSource.includes(expected), `missing primitive gate copy: ${expected}`);
}

for (const expected of [
  "buildPrimitiveQuoteBlockers",
  "buildPrimitivePreflightBlockers",
  "buildPrimitiveExecutionBlockers",
  "buildPrimitiveQuoteDependencyKey",
  "buildPrimitivePreflightDependencyKey",
]) {
  assert.match(gateSource, new RegExp(`export function ${expected}`), `${expected} must be exported`);
}

assert.match(packageSource, /"test:primitive-quote-gates"/, "primitive quote gate test script must be wired");

const routeAndPanelForbiddenPatterns = [
  "useSignAndExecuteTransaction",
  "useBuyMoveReceipt",
  "buildMintRangeTransaction",
  "buildBuyMoveReceiptTransaction",
  "buildRedeemBinaryPositionTransaction",
  "withdraw_protocol_fees",
];

for (const filePath of [routePath, panelPath]) {
  if (!existsSync(filePath)) {
    continue;
  }

  const source = readFileSync(filePath, "utf8");
  for (const forbidden of routeAndPanelForbiddenPatterns) {
    assert.ok(!source.includes(forbidden), `${filePath} must not import or reference ${forbidden}`);
  }
}

const executionSource = readFileSync(executionHookPath, "utf8");
assert.match(executionSource, /useSignAndExecuteTransaction/, "primitive execution hook may own wallet signing logic");
for (const forbidden of [
  "buildMintRangeTransaction",
  "buildBuyMoveReceiptTransaction",
  "buildRedeemBinaryPositionTransaction",
  "withdraw_protocol_fees",
]) {
  assert.ok(!executionSource.includes(forbidden), `${executionHookPath} must not import or reference ${forbidden}`);
}

console.log("PASS primitive quote/preflight gate source checks");
