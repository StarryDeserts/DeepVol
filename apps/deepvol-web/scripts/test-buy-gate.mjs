import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const bundle = await build({
  configFile: false,
  logLevel: "silent",
  build: {
    write: false,
    lib: {
      entry: "src/hooks/buyMoveReceiptGate.ts",
      formats: ["es"],
    },
    rollupOptions: {
      external: [],
    },
  },
});
const output = Array.isArray(bundle) ? bundle[0].output : bundle.output;
const chunk = output.find((entry) => entry.type === "chunk");

if (!chunk) {
  throw new Error("Vite did not produce a buy gate test chunk.");
}

const encoded = Buffer.from(chunk.code, "utf8").toString("base64");
const { getBuyMoveReceiptBlockers } = await import(`data:text/javascript;base64,${encoded}`);
const readyQuote = {
  blockers: [],
  series: {},
  feeCoin: { balanceAtomic: "25" },
  upQuoteAtomic: "100",
  downQuoteAtomic: "100",
  expectedPremiumAtomic: "200",
  createFeeAtomic: "10",
  maxPremiumPaidAtomic: "210",
  preflight: {
    binaryMintPassed: false,
    buyReceiptPassed: false,
    managerBalanceAtomic: "250",
  },
};
const wallet = {
  walletAddress: "0xabc",
  walletConnected: true,
  walletTestnet: true,
  predictManagerId: "0xmanager",
};
const receiptPreflightBlocker = "buy_move_receipt<DUSDC> preflight must pass before wallet prompt.";

assert.ok(
  getBuyMoveReceiptBlockers({ quote: readyQuote, ...wallet }).includes(receiptPreflightBlocker),
  "missing receipt preflight must block the wallet prompt",
);
assert.deepEqual(
  getBuyMoveReceiptBlockers({
    quote: {
      ...readyQuote,
      preflight: { ...readyQuote.preflight, buyReceiptPassed: true },
    },
    ...wallet,
  }),
  [],
  "receipt preflight should allow submit even when direct binary preflight is only diagnostic",
);
assert.ok(
  getBuyMoveReceiptBlockers({
    quote: {
      ...readyQuote,
      preflight: { ...readyQuote.preflight, binaryMintPassed: true, buyReceiptPassed: false },
    },
    ...wallet,
  }).includes(receiptPreflightBlocker),
  "direct binary diagnostic passing alone must not allow submit",
);
assert.ok(
  getBuyMoveReceiptBlockers({
    quote: {
      ...readyQuote,
      preflight: { ...readyQuote.preflight, buyReceiptPassed: true },
    },
    ...wallet,
    predictManagerId: null,
  }).includes("A PredictManager ID is required before submitting."),
  "missing manager must block submit",
);
assert.ok(
  getBuyMoveReceiptBlockers({
    quote: {
      ...readyQuote,
      preflight: { ...readyQuote.preflight, buyReceiptPassed: true, managerBalanceAtomic: "100" },
    },
    ...wallet,
  }).includes("Deposit DUSDC to PredictManager before buying BTC MOVE."),
  "insufficient manager balance must block submit",
);
assert.ok(
  getBuyMoveReceiptBlockers({
    quote: {
      ...readyQuote,
      feeCoin: { balanceAtomic: "5" },
      preflight: { ...readyQuote.preflight, buyReceiptPassed: true },
    },
    ...wallet,
  }).includes("A sender-owned Coin<DUSDC> must cover the quoted Create Fee."),
  "insufficient fee coin must block submit",
);
assert.ok(
  getBuyMoveReceiptBlockers({
    quote: {
      ...readyQuote,
      upQuoteAtomic: null,
      preflight: { ...readyQuote.preflight, buyReceiptPassed: true },
    },
    ...wallet,
  }).includes("Fresh UP and DOWN quote data is required before submitting."),
  "missing quote must block submit",
);

console.log("PASS buyMoveReceiptGate receipt preflight gating");
console.log(`Loaded ${pathToFileURL("src/hooks/buyMoveReceiptGate.ts").href}`);
