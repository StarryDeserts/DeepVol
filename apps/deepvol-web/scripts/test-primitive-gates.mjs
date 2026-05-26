import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const marketsSource = readFileSync("src/routes/MarketsPage.tsx", "utf8");
const primitiveCardsSource = readFileSync("src/components/PredictPrimitiveCards.tsx", "utf8");
const portfolioSource = readFileSync("src/routes/PortfolioPage.tsx", "utf8");
const primitiveTradeRecordCardSource = readFileSync("src/components/PrimitiveTradeRecordCard.tsx", "utf8");

assert.match(marketsSource, /Trade movement, not direction\./, "Markets must keep BTC MOVE hero copy");
assert.match(marketsSource, /<BtcMoveCard \/>/, "Markets must keep BTC MOVE featured before primitives");
assert.ok(
  marketsSource.indexOf("<BtcMoveCard />") < marketsSource.indexOf("<PredictPrimitiveCards />"),
  "Markets must render BTC MOVE before primitive cards",
);
assert.match(marketsSource, /Primitive terminal/, "Markets must identify primitive terminal status");

for (const primitive of ["UP", "DOWN", "RANGE"]) {
  assert.match(primitiveCardsSource, new RegExp(`kind: "${primitive}"`), `${primitive} primitive metadata must exist`);
}

assert.match(primitiveCardsSource, /status: "Wallet-gated terminal"/, "UP/DOWN primitives must be wallet-gated terminals");
assert.match(primitiveCardsSource, /status: "Quote\/preflight only"/, "RANGE primitive must remain quote/preflight only");
assert.match(
  primitiveCardsSource,
  /UP and DOWN open wallet-gated primitive terminals\. RANGE remains quote\/preflight-only\./,
  "Primitive cards must describe DeepVol-15 primitive execution policy",
);
assert.match(primitiveCardsSource, /\/primitives\?type=UP/, "UP card must link to primitive terminal route");
assert.match(primitiveCardsSource, /\/primitives\?type=DOWN/, "DOWN card must link to primitive terminal route");
assert.match(primitiveCardsSource, /\/primitives\?type=RANGE/, "RANGE card must link to primitive terminal route");
assert.doesNotMatch(
  primitiveCardsSource,
  /disabled>/,
  "Primitive card CTAs must not use obsolete preview-only disabled buttons",
);
assert.match(
  primitiveCardsSource,
  /Trade BTC MOVE receipt/,
  "Primitive cards must link back to the supported BTC MOVE receipt route",
);

assert.match(portfolioSource, /MOVE Receipts/, "Portfolio must separate MOVE Receipts");
assert.match(portfolioSource, /Local primitive trade records/, "Portfolio must render primitive local records separately");
assert.match(portfolioSource, /PrimitiveTradeRecordCard/, "Portfolio must render primitive records with the primitive record card");
assert.match(portfolioSource, /useDeepVolPrimitiveRecords/, "Portfolio must read local primitive trade records");
assert.match(primitiveTradeRecordCardSource, /usePrimitiveRecordPositionReadback/, "Primitive record cards must keep known-key primitive readback");
assert.match(portfolioSource, /known-key readback where possible/, "Portfolio must explain known-key readback scope");
assert.match(
  portfolioSource,
  /Primitive positions are raw Predict positions and do not create MoveReceipt/,
  "Portfolio must state primitive records are local hints, not MoveReceipts",
);
assert.match(
  portfolioSource,
  /MOVE Receipts remain separate\./,
  "Portfolio must state MOVE Receipts remain separate",
);

console.log("PASS primitive terminal gating");
console.log(`Loaded ${pathToFileURL("src/components/PredictPrimitiveCards.tsx").href}`);
