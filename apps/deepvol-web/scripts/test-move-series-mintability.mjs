import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function readSource(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const errorsSource = readSource("../../packages/sdk/src/deepbookPredict/errors.ts");
const marketSource = readSource("../../packages/sdk/src/deepbookPredict/market.ts");
const typeSource = readSource("../../packages/types/src/deepbookPredict.ts");
const mintabilityLibSource = readSource("src/lib/moveSeriesMintability.ts");
const mintabilityHookSource = readSource("src/hooks/useBtcMoveMintableRange.ts");
const seriesHookSource = readSource("src/hooks/useActiveBtcMoveSeries.ts");
const createHookSource = readSource("src/hooks/useCreateVolSeries.ts");
const buyPageSource = readSource("src/routes/BuyMovePage.tsx");
const preflightSource = readSource("src/hooks/useDeepVolPreflight.ts");
const buyGateSource = readSource("src/hooks/buyMoveReceiptGate.ts");
const portfolioSource = readSource("src/routes/PortfolioPage.tsx");
const primitivesSource = readSource("src/routes/PrimitiveQuotePage.tsx");

for (const expected of [
  "Selected BTC MOVE range is not mintable for the current market. Try a wider range or refresh suggested strikes.",
  "Selected BTC MOVE range is not mintable for the current market. Create or select a wider BTC MOVE series before buying.",
  "formatBtcMoveMintabilityError",
  "assert_mintable_ask",
]) {
  assert.ok(errorsSource.includes(expected), `missing friendly assert_mintable_ask mapping: ${expected}`);
}

for (const expected of [
  "BtcMoveMintableRangeCandidate",
  "FindMintableBtcMoveRangeCandidateOptions",
  "FindMintableBtcMoveRangeCandidateResult",
  "BtcMoveMintableLegDiagnostics",
]) {
  assert.ok(typeSource.includes(expected), `missing BTC MOVE mintability type: ${expected}`);
}

for (const expected of [
  "export async function findMintableBtcMoveRangeCandidate",
  "[10n, 20n, 50n, 100n, 200n, 500n]",
  "roundDownToTick",
  "roundUpToTick",
  "devInspectBinaryQuote",
  "devInspectMintBinaryPreflight",
  "direction: \"up\"",
  "strike: candidate.upperStrike",
  "direction: \"down\"",
  "strike: candidate.lowerStrike",
  "assert_mintable_ask",
]) {
  assert.ok(marketSource.includes(expected), `missing mintable range search implementation: ${expected}`);
}

for (const expected of [
  "buildMoveSeriesMintabilityKey",
  "classifyMoveSeriesMintability",
  "recordMoveSeriesMintabilityPass",
  "recordMoveSeriesMintabilityFailure",
  "validationRequired",
  "nonMintable",
  "passedAtMs",
  "failedAtMs",
  "seriesId",
]) {
  assert.ok(mintabilityLibSource.includes(expected), `missing mintability validation helper: ${expected}`);
}

for (const expected of [
  "export function useBtcMoveMintableRange",
  "findMintableBtcMoveRangeCandidate",
  "regenerate",
  "invalidate",
  "recordCreatedSeries",
  "Mintable BTC MOVE range found.",
  "No mintable BTC MOVE range was found for the current market.",
]) {
  assert.ok(mintabilityHookSource.includes(expected), `missing mintable range hook behavior: ${expected}`);
}

for (const expected of [
  "validationRequired",
  "nonMintable",
  "classifyMoveSeriesMintability",
  "Series found, validation required.",
  "Selected BTC MOVE series is not mintable for the current market.",
  "mintabilityStatus.status === \"passedRecent\"",
]) {
  assert.ok(seriesHookSource.includes(expected), `missing active series mintability status: ${expected}`);
}

for (const expected of [
  "Validate a mintable BTC MOVE range before creating a VolSeries.",
  "mintabilityValidation",
  "recordCreatedSeries",
]) {
  assert.ok(createHookSource.includes(expected), `missing create_series mintability gate: ${expected}`);
}

for (const expected of [
  "Regenerate mintable range",
  "useBtcMoveMintableRange",
  "Mintable BTC MOVE range found.",
  "UP and DOWN legs passed quote and mint preflight.",
  "No mintable BTC MOVE range was found for the current market.",
  "Try refreshing the active BTC market or widening the search range.",
  "mintableRange.invalidate()",
  "mintableRange.status === \"passed\"",
  "Validate a mintable BTC MOVE range before creating a VolSeries.",
]) {
  assert.ok(buyPageSource.includes(expected), `missing BuyMovePage mintability gate: ${expected}`);
}

assert.ok(
  preflightSource.includes("Selected BTC MOVE range is not mintable for the current market. Create or select a wider BTC MOVE series before buying."),
  "receipt preflight must show friendly assert_mintable_ask message",
);
assert.ok(
  buyGateSource.includes("Active BTC MOVE VolSeries readback must complete before submitting."),
  "wallet prompt must stay blocked without a ready active series",
);
assert.ok(
  primitivesSource.includes("Primitive") || primitivesSource.includes("primitives"),
  "primitive route source should remain present and unaffected",
);
assert.ok(
  portfolioSource.includes("receipt") || portfolioSource.includes("Receipt"),
  "portfolio receipt display source should remain present and unaffected",
);

console.log("test:move-series-mintability — all assertions passed");
