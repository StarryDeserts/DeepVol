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
  'export type MoveSeriesStatus = "ready" | "stale" | "missing" | "loading" | "idle" | "validationRequired" | "nonMintable"',
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
  "classifyMoveSeriesMintability",
  'status: "ready"',
  'status: "stale"',
  'status: "missing"',
  'status: "loading"',
  'status: "idle"',
  'status: "validationRequired"',
  'status: "nonMintable"',
  "Series found, validation required.",
  "Selected BTC MOVE series is not mintable for the current market.",
  "mintabilityStatus.status === \"passedRecent\"",
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
  "mintabilityValidation",
  "Validate a mintable BTC MOVE range before creating a VolSeries.",
  "recordCreatedSeries",
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
  "useBtcMoveMintableRange",
  "Create BTC MOVE Series",
  "Regenerate mintable range",
  "Mintable BTC MOVE range found.",
  "No mintable BTC MOVE range was found for the current market.",
  "Validate a mintable BTC MOVE range before creating a VolSeries.",
  "Create or select a fresh BTC MOVE series for the active BTC market before buying.",
  "moveSeriesStatusTone",
  "isValidCreateRange",
  "mintableRange.status === \"passed\"",
  "mintableRange.invalidate()",
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
  "seriesId: string | null",
  "effectiveSeriesId",
]) {
  assert.ok(quoteHookSource.includes(expected), `missing in useDeepVolQuote: ${expected}`);
}
assert.ok(
  !quoteHookSource.includes("const effectiveSeriesId = seriesId ?? config.configuredSeriesId"),
  "useDeepVolQuote must not fall back to configuredSeriesId when the active series is missing",
);
assert.ok(
  quoteHookSource.includes("const effectiveSeriesId = seriesId;"),
  "useDeepVolQuote must use only the caller-selected active series ID",
);
assert.ok(
  quoteHookSource.includes("Select an active BTC MOVE VolSeries before preparing quotes."),
  "useDeepVolQuote must expose a blocker when no active series is selected",
);

for (const expected of [
  "const readySeriesId = moveSeries.status === \"ready\" ? moveSeries.seriesId : null;",
  "seriesId: readySeriesId",
  "const seriesGateBlockers = useMemo",
  "const gatedQuote = useMemo",
  "...seriesGateBlockers",
  "quote: gatedQuote",
  "<MoveQuotePanel quote={gatedQuote} preflight={preflight} />",
  "quote={{ ...gatedQuote, preflight: preflight.preflight, blockers: [...gatedQuote.blockers, ...preflight.blockers] }}",
  "createSeries.createdSeriesId !== selectedSeriesId",
  "setMoveSeriesId(createSeries.createdSeriesId)",
]) {
  assert.ok(buyPageSource.includes(expected), `missing active series gate in BuyMovePage: ${expected}`);
}

assert.ok(
  !buyPageSource.includes("moveSeries.seriesId ?? config.configuredSeriesId"),
  "BuyMovePage must not display configuredSeriesId as the Active VolSeries fallback",
);

for (const expected of [
  "Active VolSeries",
  "Not selected",
  "Create or select a fresh BTC MOVE series for the active BTC market before buying.",
]) {
  assert.ok(buyPageSource.includes(expected), `missing active VolSeries UI copy: ${expected}`);
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
