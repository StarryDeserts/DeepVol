import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hookSource = readFileSync("src/hooks/useActiveBtcPredictMarket.ts", "utf8");
const routeSource = readFileSync("src/routes/PrimitiveQuotePage.tsx", "utf8");
const readbackSource = readFileSync("src/hooks/usePrimitivePositionReadback.ts", "utf8");
const errorsSource = readFileSync("../../packages/sdk/src/deepbookPredict/errors.ts", "utf8");
const preflightSource = readFileSync("src/hooks/usePrimitivePreflight.ts", "utf8");
const executionSource = readFileSync("src/hooks/usePrimitiveWalletExecution.ts", "utf8");

for (const expected of [
  "const canDiscover = Boolean(wallet.address && wallet.isTestnet);",
  "enabled: canDiscover && manualOverride === null",
  "refresh: () => void;",
  "applyManualOverride: () => void;",
  "setManualOverride(null);",
  "source: \"manual_override\"",
  "status: \"unknown\"",
  "Manual BTC market override still needs quote/preflight confirmation before trading primitives.",
  "manualOverrideDiagnostics",
  "return manualOverrideDiagnostics;",
  "? MANUAL_OVERRIDE_INVALID_DIAGNOSTIC",
]) {
  assert.ok(hookSource.includes(expected), `missing active market hook behavior: ${expected}`);
}

for (const expected of [
  "export type DiscoveryPhase =",
  "\"idle\"",
  "\"refreshing\"",
  "\"found\"",
  "\"not_found\"",
  "\"server_error\"",
  "\"quote_failed\"",
  "\"preflight_failed\"",
  "discoveryPhase: DiscoveryPhase;",
  "deriveDiscoveryPhase",
  "statusLabelForDiscovery",
  "statusMessageForDiscovery",
]) {
  assert.ok(hookSource.includes(expected), `missing discovery phase hook export: ${expected}`);
}

for (const expected of [
  "Connect a Sui Testnet wallet to discover active BTC markets.",
  "Discovering active BTC markets on Predict server...",
  "No active BTC Predict market found.",
  "Could not reach the Predict server.",
  "A BTC oracle was found, but quote validation failed.",
  "A BTC oracle was found, but mint preflight validation failed.",
]) {
  assert.ok(hookSource.includes(expected), `missing discovery phase message: ${expected}`);
}

assert.match(
  hookSource,
  /const discoveredMarket = canDiscover \? discoveryQuery\.data\?\.market \?\? null : null;/,
  "discovery data must only be exposed when the wallet/Testnet canDiscover guard is true",
);
assert.match(
  hookSource,
  /const discoveredDiagnostics = canDiscover \? discoveryQuery\.data\?\.diagnostics \?\? \[\] : \[\];/,
  "discovery diagnostics must be ignored while discovery is disabled so cached query data cannot leak stale market state",
);
assert.match(
  hookSource,
  /const discoveryError = canDiscover[\s\S]*?null;/,
  "discovery errors must be ignored while discovery is disabled",
);
assert.match(
  hookSource,
  /const market = canDiscover[\s\S]*?: null;/,
  "hook must not expose discovered or manual markets when wallet/Testnet discovery is disabled",
);
assert.match(
  hookSource,
  /const market = canDiscover[\s\S]*?manualOverrideDiagnostics\.includes\(MANUAL_OVERRIDE_INVALID_DIAGNOSTIC\)[\s\S]*?\? null[\s\S]*?: manualOverride \?\? discoveredMarket[\s\S]*?: null;/,
  "invalid manual override must block stale discovered market fallback and keep status unknown",
);
assert.match(
  hookSource,
  /if \(!canDiscover\) \{[\s\S]*?setManualOverride\(null\);[\s\S]*?return;[\s\S]*?\}/,
  "manual override must be cleared or ignored when wallet/Testnet discovery is disabled",
);

for (const expected of [
  "MANUAL_OVERRIDE_INVALID_DIAGNOSTIC",
  "Manual active market override requires an oracle object and unsigned-integer expiry/strike values.",
  "isValidSuiObjectId(oracleId)",
  "unsignedIntegerStringOrNull(input.expiry)",
  "optionalUnsignedIntegerStringOrNull(input.upStrike)",
  "optionalUnsignedIntegerStringOrNull(input.downStrike)",
  "optionalUnsignedIntegerStringOrNull(input.lowerStrike)",
  "optionalUnsignedIntegerStringOrNull(input.upperStrike)",
]) {
  assert.ok(hookSource.includes(expected), `missing manual override validation source: ${expected}`);
}

assert.match(
  hookSource,
  /if \([\s\S]*?oracleId[\s\S]*?expiry[\s\S]*?upStrike[\s\S]*?downStrike[\s\S]*?lowerStrike[\s\S]*?upperStrike[\s\S]*?\) \{[\s\S]*?return \{[\s\S]*?market: null,[\s\S]*?diagnostics: \[MANUAL_OVERRIDE_INVALID_DIAGNOSTIC\],[\s\S]*?\};[\s\S]*?\}/,
  "invalid manual override input must not produce an arbitrary market and must expose a diagnostic",
);
assert.match(
  hookSource,
  /const manualResult = buildManualMarketContext\(manualInput\);[\s\S]*?setManualOverride\(manualResult\.market\);[\s\S]*?setManualOverrideDiagnostics\(manualResult\.diagnostics\);/,
  "manual override must store valid markets and invalid diagnostics from validation result",
);
assert.doesNotMatch(
  hookSource,
  /expiry: input\.expiry\.trim\(\)/,
  "manual override must not accept raw expiry strings",
);
assert.doesNotMatch(
  hookSource,
  /suggestedUpStrike: emptyToNull\(input\.upStrike\)/,
  "manual override must not accept raw arbitrary strike strings",
);

for (const expected of [
  "const activeMarket = useActiveBtcPredictMarket();",
  "activeMarket: activeMarket.market,",
  "const displayedMarketStatus = quote.marketStatus;",
  "const displayedMarketStatusLabel = activeMarket.statusLabel;",
  "const displayedMarketStatusMessage = quote.marketStatusMessage ?? activeMarket.statusMessage;",
  "Market status:",
  "Refresh active BTC market",
  "activeMarket.refresh",
  "activeMarket.isRefreshing",
  "activeMarket.isLoading",
  "Apply manual market",
  "activeMarket.applyManualOverride",
  "activeMarket.manualInput.oracleId",
  "activeMarket.manualInput.expiry",
  "activeMarket.manualInput.upStrike",
  "activeMarket.manualInput.downStrike",
  "activeMarket.manualInput.lowerStrike",
  "activeMarket.manualInput.upperStrike",
  "activeMarket.discoveryPhase",
]) {
  assert.ok(routeSource.includes(expected), `missing active market UI source: ${expected}`);
}

for (const expected of [
  "Oracle object",
  "Expiry",
  "UP strike",
  "DOWN strike",
  "Lower strike",
  "Upper strike",
  "Source",
  "Diagnostics",
  "Suggested UP / DOWN",
  "Suggested lower / upper",
]) {
  assert.ok(routeSource.includes(expected), `missing active market UI label/detail: ${expected}`);
}

assert.match(
  routeSource,
  /const activeMarket = useActiveBtcPredictMarket\(\);[\s\S]*?const quote = usePrimitiveQuote\(\{[\s\S]*?activeMarket: activeMarket\.market,/,
  "PrimitiveQuotePage must discover the active market and pass activeMarket.market into usePrimitiveQuote",
);
assert.match(
  routeSource,
  /<StatusPill tone=\{activeMarketStatusTone\(displayedMarketStatus, activeMarket\.discoveryPhase\)\}>\{displayedMarketStatusLabel\}<\/StatusPill>/,
  "active market UI must render the discovery-aware status through StatusPill with discoveryPhase",
);
assert.match(
  routeSource,
  /disabled=\{activeMarket\.isLoading \|\| activeMarket\.isRefreshing\}[\s\S]*?onClick=\{activeMarket\.refresh\}/,
  "refresh button must be wired to activeMarket.refresh and disabled while loading/refreshing",
);
assert.match(
  routeSource,
  /onClick=\{activeMarket\.applyManualOverride\}/,
  "manual override button must call activeMarket.applyManualOverride",
);
assert.match(
  routeSource,
  /activeMarket\.setManualInput\(\(input\) => \(\{ \.\.\.input, oracleId: event\.target\.value \}\)\)/,
  "manual override oracle input must update activeMarket.manualInput.oracleId via setManualInput",
);
assert.match(
  routeSource,
  /const activeMarketBlocked = displayedMarketStatus !== "live";/,
  "non-live active market must be blocked based on quote gate effective status",
);

assert.ok(
  routeSource.includes('<details className="advancedDetails">'),
  "manual override must be wrapped in a collapsed <details> element",
);
assert.ok(
  routeSource.includes("Advanced: manual market override"),
  "collapsed manual override must have a clear summary label",
);
assert.ok(
  routeSource.includes("Developer fallback only"),
  "collapsed manual override must warn that it is a developer fallback",
);

const detailsStart = routeSource.indexOf('<details className="advancedDetails">');
const detailsEnd = routeSource.indexOf("</details>", detailsStart);
assert.notEqual(detailsStart, -1, "details element must exist");
assert.notEqual(detailsEnd, -1, "details element must close");
const detailsBlock = routeSource.slice(detailsStart, detailsEnd);
assert.ok(detailsBlock.includes("activeMarket.applyManualOverride"), "manual override apply must be inside collapsed details");
assert.ok(detailsBlock.includes("activeMarket.manualInput.oracleId"), "manual override oracle input must be inside collapsed details");
assert.ok(detailsBlock.includes("activeMarket.manualInput.expiry"), "manual override expiry input must be inside collapsed details");
assert.match(
  routeSource,
  /usePrimitivePositionReadback\(\{[\s\S]*?series: quote\.series,[\s\S]*?oracleObjectId: quote\.oracleObjectId,/,
  "PrimitiveQuotePage must pass the selected active-market series and oracleObjectId into primitive position readback",
);
assert.match(
  routeSource,
  /This readback checks the selected active BTC market keys only\./,
  "PrimitiveQuotePage readback copy must not imply historical configured BTC MOVE keys are used after active-market migration",
);
assert.doesNotMatch(
  routeSource,
  /configured BTC MOVE keys/,
  "PrimitiveQuotePage readback copy must not mention configured BTC MOVE keys after active-market migration",
);
assert.match(
  readbackSource,
  /series: VolSeries \| null;[\s\S]*?oracleObjectId: string \| null;/,
  "primitive position readback params must accept selected series and oracleObjectId",
);
assert.doesNotMatch(
  readbackSource,
  /useDeepVolConfig|readVolSeries|configuredSeriesId/,
  "primitive position readback must not use configured historical VolSeries for active primitive readback",
);
assert.match(
  readbackSource,
  /Active BTC primitive market must be loaded before reading known primitive keys\./,
  "primitive position readback must block until selected active market context is available",
);
assert.match(
  readbackSource,
  /Selected active BTC market oracle object must be available before reading primitive positions\./,
  "primitive position readback must block until selected oracleObjectId is available",
);
assert.match(
  readbackSource,
  /oracleId: series\.oracleId,[\s\S]*expiry: series\.expiry,/,
  "primitive position readback must read binary/range keys from the selected active market series",
);

const unconfirmedBindingIndex = errorsSource.indexOf("error instanceof DeepBookPredictUnconfirmedBindingError");
const nonLiveOracleIndex = errorsSource.indexOf("if (isNonLiveOracleAbort(error))");
assert.notEqual(unconfirmedBindingIndex, -1, "friendly error mapper must still handle unconfirmed binding errors");
assert.notEqual(nonLiveOracleIndex, -1, "friendly error mapper must classify non-live oracle aborts");
assert.ok(
  nonLiveOracleIndex < unconfirmedBindingIndex,
  "non-live oracle aborts wrapped in binding errors must be translated before raw binding messages are returned",
);
assert.match(
  preflightSource,
  /translateDeepBookPredictError\(result\.abort\.message\)/,
  "failed primitive preflight abort messages must use friendly DeepBook Predict translation",
);
assert.match(
  preflightSource,
  /translateDeepBookPredictError\(error\)/,
  "thrown primitive preflight errors must use friendly DeepBook Predict translation",
);
assert.match(
  executionSource,
  /blockBeforeWallet\(translateDeepBookPredictError\(latestPreflight\.abort\.message\)\)/,
  "final wallet execution preflight abort must be translated before blocking wallet review",
);

console.log("PASS primitive active market source checks");
