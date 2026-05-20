type BuyMoveReceiptGateQuote = {
  blockers: string[];
  series: unknown;
  feeCoin: unknown;
  upQuoteAtomic: string | null;
  downQuoteAtomic: string | null;
  expectedPremiumAtomic: string | null;
  maxPremiumPaidAtomic: string | null;
  preflight: {
    binaryMintPassed: boolean;
    buyReceiptPassed: boolean;
  };
};

type BuyMoveReceiptGateParams = {
  quote: BuyMoveReceiptGateQuote;
  predictManagerId: string | null;
  walletAddress: string | null;
  walletConnected: boolean;
  walletTestnet: boolean;
};

export function getBuyMoveReceiptBlockers({
  quote,
  predictManagerId,
  walletAddress,
  walletConnected,
  walletTestnet,
}: BuyMoveReceiptGateParams) {
  const entries = [...quote.blockers];

  if (!walletAddress || !walletConnected) {
    entries.push("Connect a Sui wallet before submitting.");
  }

  if (walletConnected && !walletTestnet) {
    entries.push("Switch to Sui Testnet before submitting.");
  }

  if (!quote.series) {
    entries.push("Configured VolSeries readback must complete before submitting.");
  }

  if (!predictManagerId) {
    entries.push("A PredictManager ID is required before submitting.");
  }

  if (!quote.feeCoin) {
    entries.push("A sender-owned Coin<DUSDC> covering the Create Fee is required.");
  }

  if (!quote.upQuoteAtomic || !quote.downQuoteAtomic || !quote.expectedPremiumAtomic || !quote.maxPremiumPaidAtomic) {
    entries.push("Fresh UP and DOWN quote data is required before submitting.");
  }

  if (!quote.preflight.binaryMintPassed || !quote.preflight.buyReceiptPassed) {
    entries.push("Full binary mint and buy_move_receipt preflight must pass before wallet prompt.");
  }

  return [...new Set(entries)];
}
