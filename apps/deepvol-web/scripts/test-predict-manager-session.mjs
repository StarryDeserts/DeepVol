import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function readExisting(path) {
  assert.ok(existsSync(path), `${path} must exist`);
  return readFileSync(path, "utf8");
}

const packageSource = readExisting("package.json");
const storageSource = readExisting("src/lib/predictManagerStorage.ts");
const sessionSource = readExisting("src/hooks/usePredictManagerSession.ts");
const deepVolManagerSource = readExisting("src/hooks/useDeepVolPredictManager.ts");
const primitiveStorageSource = readExisting("src/lib/deepVolPrimitiveStorage.ts");
const setupCardSource = readExisting("src/components/PredictManagerSetupCard.tsx");
const buyMoveSource = readExisting("src/routes/BuyMovePage.tsx");
const primitiveRouteSource = readExisting("src/routes/PrimitiveQuotePage.tsx");

assert.match(packageSource, /"test:predict-manager-session"/, "PredictManager session source test script must be wired");

for (const expected of [
  "PredictManagerStorageSource",
  "StoredPredictManagerSession",
  "buildPredictManagerStorageKey",
  "readStoredPredictManagerSession",
  "writeStoredPredictManagerSession",
  "clearStoredPredictManagerSession",
  "normalizeStoredPredictManagerSession",
  "DEEPVOL_STORAGE_KEYS.predictManager",
  "walletAddress",
  "predictManagerId",
  "createdDigest",
  "updatedAt",
  '"created"',
  '"manual"',
  '"local_record"',
  '"recovered"',
]) {
  assert.ok(storageSource.includes(expected), `missing PredictManager storage behavior: ${expected}`);
}

assert.ok(
  primitiveStorageSource.includes("recoverPredictManagerIdFromPrimitiveRecords"),
  "primitive storage must expose manager recovery from local primitive records",
);
assert.ok(
  primitiveStorageSource.includes("executedAtMs"),
  "primitive manager recovery must prefer latest local primitive records",
);

for (const expected of [
  "usePredictManagerSession",
  "PredictManagerSessionStatus",
  "wallet_required",
  "wrong_network",
  "loading",
  "missing",
  "ready",
  "invalid",
  "error",
  "setManualManager",
  "clear",
  "refresh",
  "createManager",
  "buildCreateManagerTransaction",
  "recoverPredictManagerIdFromCreateResult",
  "validatePredictManagerHint",
  "devInspectManagerBalance",
  "recoverPredictManagerIdFromPrimitiveRecords",
  "findPredictManagerByOwner",
  "readStoredPredictManagerSession",
  "writeStoredPredictManagerSession",
  "clearStoredPredictManagerSession",
]) {
  assert.ok(sessionSource.includes(expected), `missing PredictManager session behavior: ${expected}`);
}

assert.ok(
  sessionSource.includes("Stored PredictManager hint internal owner does not match the connected wallet."),
  "session validation must reject wallet-scoped manager hints owned by another wallet",
);
assert.ok(
  sessionSource.includes("PredictManager object exists on Testnet and is owned by the connected wallet."),
  "session validation must validate PredictManager object type and owner",
);
assert.ok(
  sessionSource.includes('source: "created"'),
  "create flow must persist created managers with source created",
);
assert.ok(
  sessionSource.includes('source: "manual"'),
  "manual override must persist managers with source manual",
);
assert.ok(
  sessionSource.includes('source: "local_record"'),
  "local primitive recovery must persist managers with source local_record",
);

assert.ok(
  deepVolManagerSource.includes("usePredictManagerSession"),
  "useDeepVolPredictManager must delegate to the shared PredictManager session hook",
);
assert.ok(
  deepVolManagerSource.includes("managerId: session.predictManagerId"),
  "useDeepVolPredictManager wrapper must preserve managerId compatibility",
);

assert.ok(
  setupCardSource.includes("Advanced / Developer"),
  "PredictManager setup card must expose manual manager input only as an Advanced / Developer fallback",
);
assert.ok(
  setupCardSource.includes("<details"),
  "PredictManager manual fallback must be collapsed by default",
);
assert.ok(
  setupCardSource.includes("PredictManager is your personal DeepBook Predict account for holding DUSDC balances and primitive positions."),
  "PredictManager setup copy must describe the product-wide account role",
);
assert.ok(
  setupCardSource.includes("Use this only if you already know your PredictManager object ID."),
  "manual override copy must warn that it is a developer fallback",
);

assert.ok(
  buyMoveSource.includes("usePredictManagerSession") || deepVolManagerSource.includes("usePredictManagerSession"),
  "BuyMovePage must use the shared session directly or through the compatibility wrapper",
);
assert.ok(
  primitiveRouteSource.includes("usePredictManagerSession"),
  "PrimitiveQuotePage must use the shared PredictManager session hook",
);
assert.ok(
  !primitiveRouteSource.includes("const [predictManagerInput, setPredictManagerInput]"),
  "PrimitiveQuotePage must not keep page-local PredictManager input as the default source",
);
assert.ok(
  primitiveRouteSource.includes('predictManagerSession.status === "ready"'),
  "PrimitiveQuotePage must only feed ready session managers into primitive gates",
);

console.log("PASS PredictManager session source checks");
