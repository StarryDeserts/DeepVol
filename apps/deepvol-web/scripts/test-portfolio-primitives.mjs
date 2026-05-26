import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function readExisting(path) {
  assert.ok(existsSync(path), `${path} must exist`);
  return readFileSync(path, "utf8");
}

const packageSource = readExisting("package.json");
const portfolioSource = readExisting("src/routes/PortfolioPage.tsx");
const cardSource = readExisting("src/components/PrimitiveTradeRecordCard.tsx");
const readbackHookSource = readExisting("src/hooks/usePrimitiveRecordPositionReadback.ts");
const sdkPortfolioSource = readExisting("../../packages/sdk/src/deepbookPredict/portfolio.ts");

assert.match(packageSource, /"test:portfolio-primitives"/, "Portfolio primitive source test script must be wired");

for (const expected of [
  "usePrimitiveRecordPositionReadback",
  "PrimitiveRecordPositionReadbackStatus",
  "readBinaryPositionQuantity",
  "readRangePositionQuantity",
  "record.predictManagerId",
  "record.oracleId",
  "record.expiry",
  "record.strike",
  "record.lowerStrike",
  "record.upperStrike",
  "RANGE readback pending; local transaction record shown.",
]) {
  assert.ok(readbackHookSource.includes(expected), `missing primitive record readback behavior: ${expected}`);
}

assert.ok(
  sdkPortfolioSource.includes("predict_manager::position") || sdkPortfolioSource.includes("buildManagerBinaryPositionTransaction"),
  "SDK portfolio helpers must support binary predict_manager::position readback",
);
assert.ok(
  sdkPortfolioSource.includes("predict_manager::range_position") || sdkPortfolioSource.includes("buildManagerRangePositionTransaction"),
  "SDK portfolio helpers must support RANGE predict_manager::range_position readback",
);

for (const expected of [
  "MOVE Receipts",
  "Primitive Positions",
  "Primitive positions are raw Predict positions and do not create MoveReceipt",
  "PrimitiveTradeRecordCard",
]) {
  assert.ok(portfolioSource.includes(expected), `Portfolio must render primitive/MOVE separation copy: ${expected}`);
}
assert.ok(
  portfolioSource.indexOf("MOVE Receipts") < portfolioSource.indexOf("Primitive Positions"),
  "Portfolio must show MOVE Receipts before Primitive Positions",
);

for (const forbidden of [
  "series: null",
  "oracleObjectId: null",
  "PredictManager ID for primitive readback",
  "Known-key readback groundwork",
]) {
  assert.ok(!portfolioSource.includes(forbidden), `Portfolio must remove blocked manual readback pattern: ${forbidden}`);
}

for (const expected of [
  "Readback status",
  "Position quantity",
  "Readback error",
  "readback failure does not hide local record",
  "Primitive positions are raw Predict positions and do not create MoveReceipt",
]) {
  assert.ok(cardSource.includes(expected), `Primitive trade card must display readback/local-record behavior: ${expected}`);
}

console.log("PASS Portfolio primitive source checks");
