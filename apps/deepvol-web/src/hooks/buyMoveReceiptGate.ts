type BuyMoveReceiptGateQuote = {
  blockers: string[];
  series: unknown;
  feeCoin: { balanceAtomic?: string } | null;
  upQuoteAtomic: string | null;
  downQuoteAtomic: string | null;
  expectedPremiumAtomic: string | null;
  createFeeAtomic: string | null;
  maxPremiumPaidAtomic: string | null;
  preflight: {
    binaryMintPassed: boolean;
    buyReceiptPassed: boolean;
    managerBalanceAtomic: string | null;
    dependencyKey: string | null;
  };
};

type BuyMoveReceiptGateParams = {
  quote: BuyMoveReceiptGateQuote;
  predictManagerId: string | null;
  walletAddress: string | null;
  walletConnected: boolean;
  walletTestnet: boolean;
  currentPreflightDependencyKey: string;
};

export function getBuyMoveReceiptBlockers({
  quote,
  predictManagerId,
  walletAddress,
  walletConnected,
  walletTestnet,
  currentPreflightDependencyKey,
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

  if (quote.feeCoin && quote.createFeeAtomic && BigInt(quote.feeCoin.balanceAtomic ?? "0") < BigInt(quote.createFeeAtomic)) {
    entries.push("A sender-owned Coin<DUSDC> must cover the quoted Create Fee.");
  }

  if (!quote.upQuoteAtomic || !quote.downQuoteAtomic || !quote.expectedPremiumAtomic || !quote.maxPremiumPaidAtomic) {
    entries.push("Fresh UP and DOWN quote data is required before submitting.");
  }

  if (quote.preflight.managerBalanceAtomic && quote.expectedPremiumAtomic && BigInt(quote.preflight.managerBalanceAtomic) < BigInt(quote.expectedPremiumAtomic)) {
    entries.push("Deposit DUSDC to PredictManager before buying BTC MOVE.");
  }

  if (!quote.preflight.buyReceiptPassed) {
    entries.push("buy_move_receipt<DUSDC> preflight must pass before wallet prompt.");
  }

  if (quote.preflight.buyReceiptPassed && quote.preflight.dependencyKey !== currentPreflightDependencyKey) {
    entries.push("Run buy_move_receipt<DUSDC> preflight again for the current quote and wallet state.");
  }

  return [...new Set(entries)];
}
