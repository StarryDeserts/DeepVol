import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const gateSource = readFileSync("src/hooks/primitiveQuoteGate.ts", "utf8");
const packageSource = readFileSync("package.json", "utf8");
const routePath = "src/routes/PrimitiveQuotePage.tsx";
const panelPath = "src/components/PrimitiveQuotePanel.tsx";
const executionHookPath = "src/hooks/usePrimitiveWalletExecution.ts";
const quoteHookPath = "src/hooks/usePrimitiveQuote.ts";
const preflightHookPath = "src/hooks/usePrimitivePreflight.ts";

for (const expected of [
  "Connect a Sui wallet before refreshing primitive quotes.",
  "Switch the connected wallet to Sui Testnet before refreshing primitive quotes.",
  "Active BTC primitive market must be loaded before primitive quotes.",
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

assert.match(
  gateSource,
  /input\.marketStatusMessage \?\? PRIMITIVE_MARKET_NON_LIVE_BLOCKER/,
  "primitive market blocker must preserve stale/expired market copy",
);
assert.match(
  gateSource,
  /marketStatus: PrimitiveMarketStatus \| null;/,
  "primitive input must require marketStatus so callers cannot omit market liveness",
);
assert.match(
  gateSource,
  /marketStatusMessage: string \| null;/,
  "primitive input must require marketStatusMessage so stale/expired copy is explicit",
);
assert.match(
  gateSource,
  /oracleObjectId: string \| null;/,
  "primitive input must carry the selected active-market oracleObjectId",
);
assert.match(
  gateSource,
  /input\.oracleObjectId \?\? "no-oracle-object"/,
  "primitive quote dependency key must include selected oracleObjectId",
);
assert.match(
  gateSource,
  /input\.series\?\.expiry \?\? "no-expiry",[\s\S]*input\.marketStatus \?\? "no-market-status"/,
  "primitive quote dependency key must include expiry and effective market status",
);

assert.match(packageSource, /"test:primitive-quote-gates"/, "primitive quote gate test script must be wired");

const quoteHookSource = readFileSync(quoteHookPath, "utf8");
const preflightHookSource = readFileSync(preflightHookPath, "utf8");
const executionSource = readFileSync(executionHookPath, "utf8");

for (const [label, source, pattern] of [
  [
    "quote hook current input",
    quoteHookSource,
    /const currentInput = useMemo<PrimitiveInputState>\(\(\) => \(\{[\s\S]*oracleObjectId,[\s\S]*marketStatus,[\s\S]*marketStatusMessage,/,
  ],
  [
    "preflight hook input",
    preflightHookSource,
    /const input = useMemo<PrimitiveInputState>\(\(\) => \(\{[\s\S]*oracleObjectId: quote\.oracleObjectId,[\s\S]*marketStatus: quote\.marketStatus,[\s\S]*marketStatusMessage: quote\.marketStatusMessage,/,
  ],
  [
    "execution hook expected quote key input",
    executionSource,
    /const expectedQuoteDependencyKey = useMemo\(\(\) => buildPrimitiveQuoteDependencyKey\(\{[\s\S]*oracleObjectId: quote\.oracleObjectId,[\s\S]*marketStatus: quote\.marketStatus,[\s\S]*marketStatusMessage: quote\.marketStatusMessage,/,
  ],
  [
    "execution hook expected preflight key input",
    executionSource,
    /const expectedPreflightDependencyKey = useMemo\(\(\) => buildPrimitivePreflightDependencyKey\(\{[\s\S]*oracleObjectId: quote\.oracleObjectId,[\s\S]*marketStatus: quote\.marketStatus,[\s\S]*marketStatusMessage: quote\.marketStatusMessage,/,
  ],
  [
    "execution hook execution input",
    executionSource,
    /const executionInput = useMemo<PrimitiveExecutionInput>\(\(\) => \(\{[\s\S]*oracleObjectId: quote\.oracleObjectId,[\s\S]*marketStatus: quote\.marketStatus,[\s\S]*marketStatusMessage: quote\.marketStatusMessage,/,
  ],
]) {
  assert.match(source, pattern, `${label} must pass oracleObjectId, marketStatus, and marketStatusMessage into primitive gate input`);
}

for (const [label, source] of [
  ["quote hook", quoteHookSource],
  ["preflight hook", preflightHookSource],
  ["execution hook", executionSource],
]) {
  assert.doesNotMatch(
    source,
    /(?:seriesQuery\.data\?\.active|seriesQuery\.data\s*&&\s*seriesQuery\.data\.active|quote\.series\?\.active|quote\.series\s*&&\s*quote\.series\.active)[\s\S]{0,120}\?[\s\S]{0,40}"live"/,
    `${label} must not promote configured VolSeries.active to live primitive market status`,
  );
}

assert.doesNotMatch(
  quoteHookSource,
  /readVolSeries\(client,\s*config\.configuredSeriesId\)/,
  "primitive quote hook must not read the configured VolSeries after active-market selection is wired",
);
assert.doesNotMatch(
  quoteHookSource,
  /useDeepVolConfig|readVolSeries|primitive-vol-series/,
  "primitive quote hook must not depend on configured-series config/query state",
);
assert.match(
  quoteHookSource,
  /activeMarket:\s*PrimitiveActiveMarketContext\s*\|\s*null;/,
  "usePrimitiveQuote params must accept the selected activeMarket context",
);
assert.match(
  quoteHookSource,
  /seriesId:\s*`\$\{activeMarket\.source\}:\$\{activeMarket\.oracleId\}:\$\{activeMarket\.expiry\}`/,
  "primitive quote series compatibility object must identify the selected active market",
);
assert.match(
  quoteHookSource,
  /oracleId:\s*activeMarket\.oracleId,[\s\S]*expiry:\s*activeMarket\.expiry,/,
  "primitive quote series compatibility object must use selected market oracle and expiry",
);
assert.match(
  quoteHookSource,
  /const oracleObjectId\s*=\s*activeMarket\?\.oracleObjectId \?\? null;/,
  "primitive quote hook must keep the selected oracleObjectId outside the VolSeries compatibility object",
);
assert.match(
  quoteHookSource,
  /buildPrimitiveQuoteState\(\{[\s\S]*oracleObjectId,[\s\S]*marketStatus,[\s\S]*marketStatusMessage,/,
  "primitive quote state must expose oracleObjectId with effective market status downstream",
);
assert.match(
  quoteHookSource,
  /active:\s*marketStatus\s*===\s*"live"/,
  "primitive quote series compatibility object must only be active for effectively live selected markets",
);
assert.match(
  quoteHookSource,
  /const marketStatus:\s*PrimitiveMarketStatus\s*=\s*deriveEffectiveMarketStatus\(activeMarket, nowMs\);/,
  "primitive quote hook must derive effective active-market status from expiry invalidation state and selected status",
);
assert.match(
  quoteHookSource,
  /function deriveEffectiveMarketStatus\(activeMarket: PrimitiveActiveMarketContext \| null, nowMs: number\): PrimitiveMarketStatus \{[\s\S]*BigInt\(activeMarket\.expiry\) <= BigInt\(nowMs\)[\s\S]*return "expired";/,
  "primitive quote hook must fail closed by treating expired activeMarket expiry as expired against an explicit clock value even if cached status is live",
);
assert.match(
  quoteHookSource,
  /useEffect\(\(\) => \{\s*setNowMs\(Date\.now\(\)\);\s*\}, \[activeMarket\?\.oracleObjectId, activeMarket\?\.expiry\]\);/,
  "primitive quote hook may refresh the expiry clock on selected market changes only",
);
assert.match(
  quoteHookSource,
  /useEffect\(\(\) => \{[\s\S]*const activeMarketExpiry = activeMarket\?\.expiry;[\s\S]*if \(!activeMarketExpiry\) \{[\s\S]*return;[\s\S]*\}[\s\S]*if \(!Number\.isFinite\(expiryMs\) \|\| nowMs >= expiryMs\) \{[\s\S]*return;[\s\S]*\}[\s\S]*setTimeout\([\s\S]*setNowMs\(Date\.now\(\)\)[\s\S]*return \(\) => clearTimeout\(expiryTimer\);[\s\S]*\}, \[activeMarket\?\.expiry, nowMs\]\);/,
  "primitive quote hook must reschedule capped expiry timers from nowMs changes and stop when expiry is missing, invalid, or reached",
);
const expiryTimerEffect = quoteHookSource.match(
  /useEffect\(\(\) => \{\s*const activeMarketExpiry = activeMarket\?\.expiry;[\s\S]*?\}, \[activeMarket\?\.expiry, nowMs\]\);/,
)?.[0] ?? "";
assert.ok(expiryTimerEffect, "primitive quote hook must have a nowMs-dependent expiry timer effect");
assert.doesNotMatch(
  expiryTimerEffect,
  /if \(!activeMarketExpiry\) \{[\s\S]*?setNowMs\(Date\.now\(\)\)[\s\S]*?return;[\s\S]*?\}/,
  "primitive quote expiry timer must not update nowMs from the missing-expiry branch of a nowMs-dependent effect",
);
assert.doesNotMatch(
  expiryTimerEffect,
  /catch \{\s*setNowMs\(Date\.now\(\)/,
  "primitive quote expiry timer must not update nowMs from the invalid-BigInt branch of a nowMs-dependent effect",
);
assert.doesNotMatch(
  expiryTimerEffect,
  /if \(!Number\.isFinite\(expiryMs\)[^)]*\) \{\s*setNowMs\(Date\.now\(\)/,
  "primitive quote expiry timer must not update nowMs from the non-finite-expiry branch of a nowMs-dependent effect",
);
assert.match(
  quoteHookSource,
  /const marketStatus:\s*PrimitiveMarketStatus\s*=\s*deriveEffectiveMarketStatus\(activeMarket, nowMs\);/,
  "primitive quote hook must derive render-time effective market status from the expiry invalidation clock",
);
assert.match(
  quoteHookSource,
  /const marketStatusMessage\s*=\s*marketStatus\s*===\s*"live"[\s\S]*\?\s*null[\s\S]*:/,
  "primitive quote hook must suppress market-status blocker copy only for effectively live selected markets",
);
assert.match(
  quoteHookSource,
  /const refreshNowMs = Date\.now\(\);[\s\S]*const freshMarketStatus:\s*PrimitiveMarketStatus\s*=\s*deriveEffectiveMarketStatus\(activeMarket, refreshNowMs\);[\s\S]*setNowMs\(refreshNowMs\);[\s\S]*const refreshInput: PrimitiveInputState = \{[\s\S]*\.\.\.currentInput,[\s\S]*series: buildSelectedMarketSeries\(activeMarket, freshMarketStatus\),[\s\S]*marketStatus: freshMarketStatus,[\s\S]*marketStatusMessage: freshMarketStatus === "live"[\s\S]*\};[\s\S]*const blockers = buildPrimitiveQuoteBlockers\(refreshInput\);/,
  "refreshQuote must re-check effective active-market expiry/status at invocation time instead of relying only on a stale currentInput closure",
);
assert.match(
  quoteHookSource,
  /translateDeepBookPredictError\(error\)/,
  "primitive quote hook must translate DeepBook Predict quote errors",
);

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
