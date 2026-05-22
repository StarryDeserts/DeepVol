import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gateSource = readFileSync("src/hooks/primitiveQuoteGate.ts", "utf8");
const executionSource = readFileSync("src/hooks/usePrimitiveWalletExecution.ts", "utf8");
const storageSource = readFileSync("src/lib/deepVolPrimitiveStorage.ts", "utf8");
const constantsSource = readFileSync("src/lib/constants.ts", "utf8");
const portfolioSource = readFileSync("src/routes/PortfolioPage.tsx", "utf8");
const panelSource = readFileSync("src/components/PrimitiveQuotePanel.tsx", "utf8");
const packageSource = readFileSync("package.json", "utf8");

assert.match(packageSource, /"test:primitive-execution-gates"/, "primitive execution gate test script must be wired");

for (const expected of [
  "quoteStatus: PrimitiveQuoteStatus",
  "preflightStatus: PrimitivePreflightStatus",
  "managerBalanceAtomic: string | null",
  "isSubmitting: boolean",
  "PRIMITIVE_QUOTE_FRESHNESS_MS",
  "PRIMITIVE_PREFLIGHT_FRESHNESS_MS",
  "RANGE wallet execution remains disabled until dedicated mintability validation passes.",
  "Refresh quote before wallet review.",
  "Run primitive mint preflight again for the current quote and wallet state.",
  "PredictManager DUSDC balance must be read before wallet review.",
  "PredictManager DUSDC balance must cover the current mint cost.",
]) {
  assert.ok(gateSource.includes(expected), `missing primitive execution gate source: ${expected}`);
}

assert.match(
  gateSource,
  /if \(!input\.walletConnected \|\| !input\.walletAddress\)/,
  "UP/DOWN execution must inherit wallet-connect blocker",
);
assert.match(
  gateSource,
  /if \(input\.walletConnected && !input\.walletTestnet\)/,
  "UP/DOWN execution must inherit Testnet blocker",
);
assert.match(
  gateSource,
  /if \(!input\.predictManagerId\)/,
  "UP/DOWN execution must require PredictManager ID",
);
assert.match(
  gateSource,
  /if \(input\.quoteStatus !== "ready"/,
  "UP/DOWN execution must require ready quote",
);
assert.match(
  gateSource,
  /if \(input\.preflightStatus !== "passed"/,
  "UP/DOWN execution must require passed preflight",
);
assert.match(
  gateSource,
  /if \(!input\.managerBalanceAtomic\)/,
  "UP/DOWN execution must require manager balance readback",
);
assert.match(
  gateSource,
  /BigInt\(input\.managerBalanceAtomic\) < BigInt\(input\.mintCostAtomic\)/,
  "UP/DOWN execution must require sufficient manager DUSDC balance",
);
assert.match(
  gateSource,
  /if \(input\.primitiveKind === "RANGE"\)/,
  "RANGE execution must remain hard-blocked",
);

for (const expected of [
  "devInspectBinaryQuote",
  "devInspectManagerBalance",
  "devInspectMintBinaryPreflight",
  "readBinaryPositionQuantity",
  "buildMintBinaryPrimitiveTransaction",
  "allowRealTestnetMint: true",
  "useSignAndExecuteTransaction",
  "waitForTransaction",
  "effects/readback were verified",
  "persistPrimitiveTrade",
]) {
  assert.ok(executionSource.includes(expected), `missing primitive execution hook behavior: ${expected}`);
}
const freshQuoteCallIndex = executionSource.indexOf("const freshQuote = await devInspectBinaryQuote");
const managerBalanceCallIndex = executionSource.indexOf("const managerBalance = await devInspectManagerBalance");
const latestPreflightCallIndex = executionSource.indexOf("const latestPreflight = await devInspectMintBinaryPreflight");
const transactionBuildIndex = executionSource.indexOf("const transaction = buildMintBinaryPrimitiveTransaction");

for (const [label, index] of [
  ["fresh quote call", freshQuoteCallIndex],
  ["manager balance call", managerBalanceCallIndex],
  ["latest preflight call", latestPreflightCallIndex],
  ["transaction build call", transactionBuildIndex],
]) {
  assert.notEqual(index, -1, `missing ${label}`);
}

assert.ok(
  freshQuoteCallIndex < transactionBuildIndex,
  "wallet execution must rerun quote before building transaction",
);
assert.ok(
  managerBalanceCallIndex < transactionBuildIndex,
  "wallet execution must rerun manager balance before building transaction",
);
assert.ok(
  latestPreflightCallIndex < transactionBuildIndex,
  "wallet execution must rerun preflight before building transaction",
);

for (const forbidden of [
  "buildMintRangeTransaction",
  "buildBuyMoveReceiptTransaction",
  "buildRedeemBinaryPositionTransaction",
  "withdraw_protocol_fees",
  "decodeSuiPrivateKey",
  "Ed25519Keypair",
  "Secp256k1Keypair",
  "Secp256r1Keypair",
  "raw transaction bytes",
  "raw signatures",
]) {
  assert.ok(!executionSource.includes(forbidden), `primitive execution hook must not reference ${forbidden}`);
}

assert.match(constantsSource, /primitiveTrades: "deepvol:primitive-trades"/, "primitive storage key must be separate from receipt storage");
for (const expected of [
  "primitiveType: PrimitiveKind",
  "digest: string",
  "wallet: string",
  "predictManagerId: string",
  "positionKey: string",
  "readStoredPrimitiveTrades",
  "persistPrimitiveTrade",
  "subscribePrimitiveTradeStorage",
  "buildPrimitivePositionKey",
  "deepvol:primitive-storage-updated",
]) {
  assert.ok(storageSource.includes(expected), `missing primitive storage behavior: ${expected}`);
}
assert.doesNotMatch(storageSource, /move-receipts/, "primitive storage must not reuse MoveReceipt storage");

assert.match(portfolioSource, /ReceiptSummaryCard/, "Portfolio must keep MoveReceipt rendering");
assert.match(portfolioSource, /PrimitiveTradeRecordCard/, "Portfolio must render primitive local records separately");
assert.ok(
  portfolioSource.indexOf("Receipt-linked BTC MOVE positions") < portfolioSource.indexOf("Local primitive trade records"),
  "Portfolio must show MOVE receipts before primitive local records",
);
assert.match(panelSource, /Review \$\{quote\.primitiveKind\} in wallet/, "UP/DOWN panel must expose wallet review action");
assert.match(panelSource, /RANGE execution disabled/, "RANGE panel must show disabled policy");
assert.match(panelSource, /TransactionStatus status=\{execution\.transactionStatus\}/, "primitive panel must show execution digest/status");

console.log("PASS primitive execution gate source checks");
