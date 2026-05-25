import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const seriesHookSource = readFileSync("src/hooks/useActiveBtcMoveSeries.ts", "utf8");
const createHookSource = readFileSync("src/hooks/useCreateVolSeries.ts", "utf8");
const buyPageSource = readFileSync("src/routes/BuyMovePage.tsx", "utf8");
const quoteHookSource = readFileSync("src/hooks/useDeepVolQuote.ts", "utf8");
const marketSource = readFileSync("../../packages/sdk/src/deepbookPredict/market.ts", "utf8");
const constantsSource = readFileSync("src/lib/constants.ts", "utf8");

// --- useActiveBtcMoveSeries assertions ---

for (const expected of [
  'export type MoveSeriesStatus = "ready" | "stale" | "missing" | "loading" | "idle"',
  "export type ActiveBtcMoveSeriesController",
  "export function useActiveBtcMoveSeries",
  "series.oracleId !== activeMarket.oracleId",
  "series.expiry !== activeMarket.expiry",
  "DEEPVOL_STORAGE_KEYS.createdSeries",
  "moveSeriesStatusLabel",
  "moveSeriesStatusMessage",
  "loadStoredSeriesId",
  "storeSeriesId",
  "readVolSeries",
  'status: "ready"',
  'status: "stale"',
  'status: "missing"',
  'status: "loading"',
  'status: "idle"',
  "BigInt(series.lowerStrike) >= BigInt(series.upperStrike)",
  "series.active",
  "setSeriesId",
  "localStorage.getItem",
  "localStorage.setItem",
]) {
  assert.ok(seriesHookSource.includes(expected), `missing in useActiveBtcMoveSeries: ${expected}`);
}

// --- useCreateVolSeries assertions ---

for (const expected of [
  "export type CreateVolSeriesStatus",
  "export type CreateVolSeriesController",
  "export function useCreateVolSeries",
  "buildCreateVolSeriesTransaction",
  "useSignAndExecuteTransaction",
  "lower >= upper",
  "DEEPVOL_STORAGE_KEYS.createdSeries",
  "activeMarket.oracleId",
  "activeMarket.expiry",
  "activeMarket.status",
  'canCreate',
  'digest',
  'createdSeriesId',
  "explorerUrl",
  "buildSuiExplorerTransactionUrl",
  "::series::VolSeries",
]) {
  assert.ok(createHookSource.includes(expected), `missing in useCreateVolSeries: ${expected}`);
}

// --- BuyMovePage integration assertions ---

for (const expected of [
  "useActiveBtcPredictMarket",
  "useActiveBtcMoveSeries",
  "useCreateVolSeries",
  "seriesId: moveSeries.seriesId",
  "Create BTC MOVE Series",
  "Create or select a fresh BTC MOVE series for the active BTC market before buying.",
  "moveSeriesStatusTone",
  "isValidCreateRange",
  "create-lower-strike",
  "create-upper-strike",
  "Apply manual series",
  "manual-series-id",
  "Advanced: manual series selection",
  "Active VolSeries",
  "moveSeries.setSeriesId",
  "createSeries.create",
  "Use this series",
  "Active BTC market",
  "Market discovery",
  "BTC MOVE series",
  "VolSeries",
  "moveSeries.status",
]) {
  assert.ok(buyPageSource.includes(expected), `missing in BuyMovePage: ${expected}`);
}

// --- useDeepVolQuote dynamic seriesId ---

for (const expected of [
  "seriesId?: string | null",
  "effectiveSeriesId",
]) {
  assert.ok(quoteHookSource.includes(expected), `missing in useDeepVolQuote: ${expected}`);
}

// --- market.ts suggested range fix ---

assert.ok(
  marketSource.includes("BigInt(suggestedLowerStrike) >= BigInt(suggestedUpperStrike)"),
  "missing suggested range normalization in market.ts",
);
assert.ok(
  marketSource.includes("anchor - BigInt(tickSize)"),
  "missing tick-based lower offset in market.ts",
);
assert.ok(
  marketSource.includes("anchor + BigInt(tickSize)"),
  "missing tick-based upper offset in market.ts",
);

// --- constants.ts createdSeries key ---

assert.ok(
  constantsSource.includes('createdSeries: "deepvol:created-series"'),
  'missing createdSeries key in DEEPVOL_STORAGE_KEYS',
);

console.log("test:move-series-gates — all assertions passed");
