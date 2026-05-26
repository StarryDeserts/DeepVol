import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gateSource = readFileSync("src/hooks/primitiveQuoteGate.ts", "utf8");
const hookSource = readFileSync("src/hooks/usePrimitiveMintableStrike.ts", "utf8");
const routeSource = readFileSync("src/routes/PrimitiveQuotePage.tsx", "utf8");
const cacheSource = readFileSync("src/lib/primitiveMintability.ts", "utf8");
const constantsSource = readFileSync("src/lib/constants.ts", "utf8");
const errorsSource = readFileSync("../../packages/sdk/src/deepbookPredict/errors.ts", "utf8");
const sdkSource = readFileSync("../../packages/sdk/src/deepbookPredict/primitiveMintability.ts", "utf8");
const typesSource = readFileSync("../../packages/types/src/deepbookPredict.ts", "utf8");

// --- Mintability gate tests ---

assert.ok(
  gateSource.includes('primitiveMintabilityStatus'),
  "execution gate must accept primitiveMintabilityStatus field",
);
assert.ok(
  gateSource.includes('Validate a mintable ${input.primitiveKind} strike before buying.'),
  "UP/DOWN execution must require mintability validation",
);
assert.match(
  gateSource,
  /input\.primitiveKind !== "RANGE" && input\.primitiveMintabilityStatus !== "passed"/,
  "mintability gate must apply to UP/DOWN only, not RANGE",
);

// --- Error mapping tests ---

assert.ok(
  errorsSource.includes('PRIMITIVE_STRIKE_NOT_MINTABLE_MESSAGE'),
  "errors.ts must define PRIMITIVE_STRIKE_NOT_MINTABLE_MESSAGE",
);
assert.ok(
  errorsSource.includes("Selected strike is not mintable for the current market. Try regenerating a mintable strike."),
  "primitive mintability error must have primitive-friendly message",
);
assert.ok(
  errorsSource.includes("formatPrimitiveMintabilityError"),
  "errors.ts must export formatPrimitiveMintabilityError",
);
assert.ok(
  errorsSource.includes("Selected BTC MOVE range is not mintable for the current market."),
  "BTC MOVE mintability message must still exist (regression check)",
);
assert.ok(
  errorsSource.includes('context?: { family?: "btc_move" | "primitive" }'),
  "translateDeepBookPredictError must accept context parameter with family",
);
assert.ok(
  errorsSource.includes('context?.family === "primitive"'),
  "translateDeepBookPredictError must check for primitive family context",
);

// --- localStorage cache tests ---

assert.ok(
  constantsSource.includes('primitiveMintability: "deepvol:primitive-mintability"'),
  "constants must define primitiveMintability storage key",
);
assert.ok(
  cacheSource.includes("buildPrimitiveMintabilityKey"),
  "cache must export buildPrimitiveMintabilityKey",
);
assert.ok(
  cacheSource.includes("classifyPrimitiveMintability"),
  "cache must export classifyPrimitiveMintability",
);
assert.ok(
  cacheSource.includes("recordPrimitiveMintabilityPass"),
  "cache must export recordPrimitiveMintabilityPass",
);
assert.ok(
  cacheSource.includes("clearPrimitiveMintabilityRecord"),
  "cache must export clearPrimitiveMintabilityRecord",
);
assert.ok(
  cacheSource.includes("direction: string | null | undefined"),
  "cache key must include direction for primitive type differentiation",
);
assert.ok(
  cacheSource.includes("strike: string | null | undefined"),
  "cache key must include strike",
);
assert.ok(
  cacheSource.includes("5 * 60 * 1000"),
  "cache TTL must be 5 minutes",
);

for (const status of ["passedRecent", "nonMintable", "expiredValidation", "validationRequired"]) {
  assert.ok(
    cacheSource.includes(`"${status}"`),
    `cache classification must include "${status}" status`,
  );
}

// --- SDK candidate search tests ---

assert.ok(
  sdkSource.includes("findMintableBinaryPrimitiveCandidate"),
  "SDK must export findMintableBinaryPrimitiveCandidate",
);
assert.ok(
  sdkSource.includes("devInspectBinaryQuote"),
  "SDK candidate search must use devInspectBinaryQuote",
);
assert.ok(
  sdkSource.includes("devInspectMintBinaryPreflight"),
  "SDK candidate search must use devInspectMintBinaryPreflight",
);
assert.ok(
  sdkSource.includes('family: "primitive"'),
  'SDK candidate search must tag candidateParams with family: "primitive"',
);
assert.ok(
  sdkSource.includes("isAssertMintableAskAbort"),
  "SDK candidate search must check for assert_mintable_ask abort",
);
assert.ok(
  sdkSource.includes("roundDownToTick"),
  "SDK candidate search must tick-align strikes",
);
assert.ok(
  sdkSource.includes('direction === "up"'),
  "SDK candidate search must handle UP direction",
);

// --- Types tests ---

assert.ok(
  typesSource.includes("PrimitiveMintableStrikeCandidate"),
  "types must define PrimitiveMintableStrikeCandidate",
);
assert.ok(
  typesSource.includes("PrimitiveMintableStrikeAttempt"),
  "types must define PrimitiveMintableStrikeAttempt",
);
assert.ok(
  typesSource.includes("FindMintableBinaryPrimitiveCandidateOptions"),
  "types must define FindMintableBinaryPrimitiveCandidateOptions",
);
assert.ok(
  typesSource.includes("FindMintableBinaryPrimitiveCandidateResult"),
  "types must define FindMintableBinaryPrimitiveCandidateResult",
);
assert.ok(
  typesSource.includes("PrimitiveMintabilityBlocker"),
  "types must define PrimitiveMintabilityBlocker",
);

// --- Hook tests ---

assert.ok(
  hookSource.includes("usePrimitiveMintableStrike"),
  "hook must be named usePrimitiveMintableStrike",
);
assert.ok(
  hookSource.includes("findMintableBinaryPrimitiveCandidate"),
  "hook must call findMintableBinaryPrimitiveCandidate",
);
assert.ok(
  hookSource.includes("recordPrimitiveMintabilityPass"),
  "hook must cache passed results",
);
assert.ok(
  hookSource.includes("clearPrimitiveMintabilityRecord"),
  "hook invalidate must clear cache",
);
assert.ok(
  hookSource.includes("RANGE mintability search is not available yet."),
  "hook must block RANGE mintability search",
);
assert.ok(
  hookSource.includes('primitiveKind === "UP" ? "up"'),
  "hook must map UP to direction up",
);

// --- UI tests ---

assert.ok(
  routeSource.includes("usePrimitiveMintableStrike"),
  "PrimitiveQuotePage must use usePrimitiveMintableStrike hook",
);
assert.ok(
  routeSource.includes("Regenerate mintable"),
  "PrimitiveQuotePage must have Regenerate mintable strike button",
);
assert.ok(
  routeSource.includes("mintableStrike.invalidate()"),
  "PrimitiveQuotePage must invalidate mintability on manual strike edit",
);
assert.ok(
  routeSource.includes("mintableStrike.regenerate"),
  "PrimitiveQuotePage must wire regenerate callback",
);
assert.ok(
  routeSource.includes("Mintable strike validation"),
  "PrimitiveQuotePage must have Mintable strike validation section",
);
assert.ok(
  routeSource.includes('primitiveKind !== "RANGE"'),
  "PrimitiveQuotePage must hide mintability section for RANGE",
);
assert.ok(
  routeSource.includes("primitiveMintabilityStatus: mintableStrike.status"),
  "PrimitiveQuotePage must pass mintability status to execution hook",
);

// --- Copy tests ---

assert.ok(
  routeSource.includes("does not create a DeepVol MoveReceipt"),
  "UP/DOWN primitive copy must say no MoveReceipt",
);
assert.ok(
  gateSource.includes("RANGE wallet execution remains disabled until dedicated mintability validation passes."),
  "RANGE execution disabled blocker text must be present",
);

// --- Execution hook wiring ---

const executionSource = readFileSync("src/hooks/usePrimitiveWalletExecution.ts", "utf8");
assert.ok(
  executionSource.includes("primitiveMintabilityStatus"),
  "execution hook must accept primitiveMintabilityStatus parameter",
);

console.log("PASS primitive mintability source checks");
