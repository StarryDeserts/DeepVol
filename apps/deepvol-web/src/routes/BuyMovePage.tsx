import { useState } from "react";
import { AdvancedDetails } from "../components/AdvancedDetails";
import { BuyMoveReceiptCard } from "../components/BuyMoveReceiptCard";
import { DeepVolFlowChecklist, type DeepVolFlowStep } from "../components/DeepVolFlowChecklist";
import { ManagerFundingCard } from "../components/ManagerFundingCard";
import { MovePayoutDiagram } from "../components/MovePayoutDiagram";
import { MoveQuotePanel } from "../components/MoveQuotePanel";
import { PredictManagerSetupCard } from "../components/PredictManagerSetupCard";
import { DataGrid } from "../components/ui/DataGrid";
import { PageHero } from "../components/ui/PageHero";
import { StateCallout } from "../components/ui/StateCallout";
import { useDeepVolConfig } from "../hooks/useDeepVolConfig";
import { useDeepVolDusdcBalance } from "../hooks/useDeepVolDusdcBalance";
import { useDeepVolPredictManager } from "../hooks/useDeepVolPredictManager";
import { useDeepVolPreflight } from "../hooks/useDeepVolPreflight";
import { useDeepVolQuote } from "../hooks/useDeepVolQuote";
import { useSuiWallet } from "../hooks/useSuiWallet";
import { DEFAULT_MOVE_QUANTITY } from "../lib/constants";
import { normalizePositiveIntegerInput, shortId } from "../lib/format";

export function BuyMovePage() {
  const wallet = useSuiWallet();
  const config = useDeepVolConfig();
  const manager = useDeepVolPredictManager();
  const dusdcBalance = useDeepVolDusdcBalance();
  const [quantityInput, setQuantityInput] = useState(DEFAULT_MOVE_QUANTITY);
  const [manualManagerInput, setManualManagerInput] = useState("");
  const normalizedQuantity = normalizePositiveIntegerInput(quantityInput) ?? quantityInput;
  const predictManagerId = manager.managerId;
  const quote = useDeepVolQuote({
    quantityInput: normalizedQuantity,
    predictManagerId,
  });
  const preflight = useDeepVolPreflight({
    quote,
    predictManagerId,
    walletDusdcChecked: Boolean(dusdcBalance.data),
  });
  const flowSteps = buildFlowSteps({
    wallet,
    managerId: predictManagerId,
    walletDusdcChecked: Boolean(dusdcBalance.data),
    quote,
    preflightPassed: preflight.preflight.buyReceiptPassed,
  });
  const validationMessage = manager.validatedHintQuery.isLoading
    ? "Checking PredictManager object type and owner on Sui Testnet."
    : manager.validatedHintQuery.data?.message ?? null;
  const discoveryMessage = manager.managerQuery.data?.status === "found"
    ? "Using a locally stored manager hint; deposits and quotes unlock only after validation."
    : manager.managerQuery.data?.status === "unconfirmed"
      ? manager.managerQuery.data.reason
      : manager.managerQuery.data?.status === "error"
        ? manager.managerQuery.data.error
        : null;

  function storeManualManagerId() {
    manager.setManualManagerId(manualManagerInput);
  }

  return (
    <div className="tradeWorkspace">
      <section className="tradeContextColumn">
        <PageHero eyebrow="BTC MOVE transaction" title="Open BTC MOVE">
          <p>
            Buy exposure to BTC leaving the configured range. DeepVol mints the UP and DOWN Predict legs together and returns a
            non-custodial but protocol-enforced receipt.
          </p>
        </PageHero>
        <DeepVolFlowChecklist steps={flowSteps} />
        <MovePayoutDiagram lowerStrike={quote.series?.lowerStrike} upperStrike={quote.series?.upperStrike} />
        <StateCallout tone="info" title="Non-custodial boundary">
          The receipt records the DeepVol-created legs; underlying Predict positions stay in your PredictManager.
        </StateCallout>
        <section className="card tradeSetupCard">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">Step 5</div>
              <h2>Quantity and BTC MOVE series</h2>
            </div>
          </div>
          <DataGrid
            variant="compact"
            items={[
              {
                label: "Configured VolSeries",
                value: <span className="mono" title={config.configuredSeriesId}>{shortId(config.configuredSeriesId)}</span>,
              },
              {
                label: "ProtocolVault",
                value: <span className="mono" title={config.protocolVaultId ?? undefined}>{shortId(config.protocolVaultId)}</span>,
              },
              {
                label: "Predict object",
                value: <span className="mono" title={config.predictId}>{shortId(config.predictId)}</span>,
              },
              { label: "Quote asset", value: "DUSDC" },
            ]}
          />
          <label className="fieldLabel" htmlFor="move-quantity">
            Quantity
          </label>
          <input
            id="move-quantity"
            value={quantityInput}
            inputMode="numeric"
            aria-describedby="quantity-help"
            onChange={(event) => setQuantityInput(event.target.value)}
          />
          <small id="quantity-help" className="fieldHelp">
            Quantity is the binary leg quantity, not a DUSDC amount.
          </small>
        </section>
      </section>

      <section className="tradeActionColumn">
        <PredictManagerSetupCard
          managerId={predictManagerId}
          knownManagerId={manager.knownManagerId}
          manualManagerId={manualManagerInput}
          isConnected={wallet.isConnected}
          isTestnet={wallet.isTestnet}
          isLoading={manager.managerQuery.isLoading || manager.validatedHintQuery.isLoading}
          validationMessage={validationMessage}
          discoveryMessage={discoveryMessage}
          transactionStatus={manager.transactionStatus}
          onManualManagerIdChange={setManualManagerInput}
          onStoreManualManagerId={storeManualManagerId}
          onCreateManager={manager.createManager}
        />
        <ManagerFundingCard
          managerId={predictManagerId}
          balance={dusdcBalance.data}
          isLoading={dusdcBalance.isLoading}
          error={dusdcBalance.error}
          expectedPremiumAtomic={quote.expectedPremiumAtomic}
          createFeeAtomic={quote.createFeeAtomic}
          feeCoinReady={Boolean(quote.feeCoin)}
          onDeposited={() => void dusdcBalance.refetch()}
        />
        <MoveQuotePanel quote={quote} preflight={preflight} />
        <BuyMoveReceiptCard quote={{ ...quote, preflight: preflight.preflight, blockers: [...quote.blockers, ...preflight.blockers] }} predictManagerId={predictManagerId} walletDusdcChecked={Boolean(dusdcBalance.data)} />
      </section>
      <AdvancedDetails />
    </div>
  );
}

type BuildFlowStepsParams = {
  wallet: ReturnType<typeof useSuiWallet>;
  managerId: string | null;
  walletDusdcChecked: boolean;
  quote: ReturnType<typeof useDeepVolQuote>;
  preflightPassed: boolean;
};

function buildFlowSteps({ wallet, managerId, walletDusdcChecked, quote, preflightPassed }: BuildFlowStepsParams): DeepVolFlowStep[] {
  const quotesReady = Boolean(quote.upQuoteAtomic && quote.downQuoteAtomic);

  return [
    {
      label: "Connect wallet",
      state: wallet.isConnected ? "complete" : "current",
      detail: wallet.isConnected ? "Wallet account detected." : "Start by connecting a Sui wallet.",
    },
    {
      label: "Switch to Sui Testnet",
      state: wallet.isTestnet ? "complete" : wallet.isConnected ? "current" : "pending",
      detail: wallet.isTestnet ? "Testnet selected." : "DeepVol MVP actions are Testnet-only.",
    },
    {
      label: "Check or create PredictManager",
      state: managerId ? "complete" : wallet.isTestnet ? "current" : "pending",
      detail: managerId ? "PredictManager ID is available for this flow." : "Create one or store an existing object ID.",
    },
    {
      label: "Check or deposit DUSDC",
      state: walletDusdcChecked ? "complete" : managerId ? "current" : "pending",
      detail: walletDusdcChecked ? "Wallet DUSDC coins loaded." : "Load wallet DUSDC and deposit premium into PredictManager if needed.",
    },
    {
      label: "View BTC MOVE Series",
      state: quote.series ? "complete" : wallet.isTestnet ? "current" : "pending",
      detail: quote.series ? "Configured BTC MOVE VolSeries loaded." : "Load the configured Testnet VolSeries.",
    },
    {
      label: "Quote UP and DOWN legs",
      state: quotesReady ? "complete" : quote.status === "loading" ? "current" : "pending",
      detail: quotesReady ? "Fresh binary leg quote values are visible." : "Refresh quote after setup prerequisites are ready.",
    },
    {
      label: "Run preflight",
      state: preflightPassed ? "complete" : quotesReady ? "current" : "pending",
      detail: preflightPassed ? "buy_move_receipt<DUSDC> browser preflight passed." : "Run explicit receipt preflight and review blockers.",
    },
    {
      label: "Buy BTC MOVE Receipt",
      state: preflightPassed ? "current" : "blocked",
      detail: preflightPassed ? "Wallet review can be enabled." : "Buy stays disabled until receipt preflight passes.",
    },
    {
      label: "View transaction result",
      state: "pending",
      detail: "Successful wallet actions show digest and Explorer links.",
    },
    {
      label: "View receipt / portfolio",
      state: "pending",
      detail: "Successful buys are stored locally and shown on Portfolio.",
    },
  ];
}
