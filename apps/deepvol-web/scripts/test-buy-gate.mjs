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
  feeCoin: {},
  upQuoteAtomic: "100",
  downQuoteAtomic: "100",
  expectedPremiumAtomic: "200",
  maxPremiumPaidAtomic: "210",
  preflight: {
    binaryMintPassed: false,
    buyReceiptPassed: false,
  },
};
const wallet = {
  walletAddress: "0xabc",
  walletConnected: true,
  walletTestnet: true,
  predictManagerId: "0xmanager",
};
const preflightBlocker = "Full binary mint and buy_move_receipt preflight must pass before wallet prompt.";

assert.ok(
  getBuyMoveReceiptBlockers({ quote: readyQuote, ...wallet }).includes(preflightBlocker),
  "missing preflight must block the wallet prompt",
);
assert.ok(
  getBuyMoveReceiptBlockers({
    quote: {
      ...readyQuote,
      preflight: { binaryMintPassed: true, buyReceiptPassed: false },
    },
    ...wallet,
  }).includes(preflightBlocker),
  "receipt preflight alone must block the wallet prompt",
);
assert.deepEqual(
  getBuyMoveReceiptBlockers({
    quote: {
      ...readyQuote,
      preflight: { binaryMintPassed: true, buyReceiptPassed: true },
    },
    ...wallet,
  }),
  [],
  "both preflight gates plus all prerequisites should allow submit",
);

console.log("PASS buyMoveReceiptGate preflight gating");
console.log(`Loaded ${pathToFileURL("src/hooks/buyMoveReceiptGate.ts").href}`);
