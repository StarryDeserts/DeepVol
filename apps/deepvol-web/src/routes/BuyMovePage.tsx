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
import { StatusPill } from "../components/ui/StatusPill";
import { useActiveBtcPredictMarket } from "../hooks/useActiveBtcPredictMarket";
import { useActiveBtcMoveSeries } from "../hooks/useActiveBtcMoveSeries";
import { useCreateVolSeries } from "../hooks/useCreateVolSeries";
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
  const activeMarket = useActiveBtcPredictMarket();
  const moveSeries = useActiveBtcMoveSeries(activeMarket.market);
  const createSeries = useCreateVolSeries(activeMarket.market);
  const manager = useDeepVolPredictManager();
  const dusdcBalance = useDeepVolDusdcBalance();
  const [quantityInput, setQuantityInput] = useState(DEFAULT_MOVE_QUANTITY);
  const [manualManagerInput, setManualManagerInput] = useState("");
  const [manualSeriesInput, setManualSeriesInput] = useState("");
  const [createLowerInput, setCreateLowerInput] = useState("");
  const [createUpperInput, setCreateUpperInput] = useState("");
  const normalizedQuantity = normalizePositiveIntegerInput(quantityInput) ?? quantityInput;
  const predictManagerId = manager.managerId;
  const quote = useDeepVolQuote({
    quantityInput: normalizedQuantity,
    predictManagerId,
    seriesId: moveSeries.seriesId,
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
    moveSeries,
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
              <div className="eyebrow">Active BTC market</div>
              <h2>
                Market discovery{" "}
                <StatusPill tone={activeMarket.status === "live" ? "success" : activeMarket.discoveryPhase === "refreshing" ? "info" : "neutral"}>
                  {activeMarket.statusLabel}
                </StatusPill>
              </h2>
            </div>
          </div>
          {activeMarket.market && (
            <DataGrid
              variant="compact"
              items={[
                {
                  label: "Oracle",
                  value: <span className="mono" title={activeMarket.market.oracleId}>{shortId(activeMarket.market.oracleId)}</span>,
                },
                { label: "Expiry", value: activeMarket.market.expiry ? new Date(Number(activeMarket.market.expiry)).toISOString().replace("T", " ").slice(0, 16) : "—" },
                { label: "Status", value: activeMarket.status },
              ]}
            />
          )}
          {activeMarket.status !== "live" && (
            <StateCallout tone="warning" title="Active BTC market">
              {activeMarket.statusMessage}
            </StateCallout>
          )}
        </section>

        <section className="card tradeSetupCard">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">BTC MOVE series</div>
              <h2>
                VolSeries{" "}
                <StatusPill tone={moveSeriesStatusTone(moveSeries.status)}>
                  {moveSeries.statusLabel}
                </StatusPill>
              </h2>
            </div>
          </div>
          {moveSeries.series && moveSeries.status === "ready" && (
            <DataGrid
              variant="compact"
              items={[
                {
                  label: "VolSeries",
                  value: <span className="mono" title={moveSeries.seriesId ?? undefined}>{shortId(moveSeries.seriesId)}</span>,
                },
                {
                  label: "Oracle",
                  value: <span className="mono" title={moveSeries.series.oracleId}>{shortId(moveSeries.series.oracleId)}</span>,
                },
                { label: "Expiry", value: moveSeries.series.expiry ? new Date(Number(moveSeries.series.expiry)).toISOString().replace("T", " ").slice(0, 16) : "—" },
                { label: "Range", value: `${moveSeries.series.lowerStrike} – ${moveSeries.series.upperStrike}` },
              ]}
            />
          )}
          {moveSeries.status !== "ready" && moveSeries.status !== "loading" && moveSeries.status !== "idle" && (
            <StateCallout tone={moveSeries.status === "stale" ? "warning" : "info"} title="BTC MOVE series">
              {moveSeries.statusMessage}
            </StateCallout>
          )}
          {(moveSeries.status === "missing" || moveSeries.status === "stale") && activeMarket.status === "live" && (
            <div className="createSeriesSection">
              <h3>Create BTC MOVE Series</h3>
              <label className="fieldLabel" htmlFor="create-lower-strike">Lower strike</label>
              <input
                id="create-lower-strike"
                value={createLowerInput || activeMarket.market?.suggestedLowerStrike || ""}
                inputMode="numeric"
                onChange={(event) => setCreateLowerInput(event.target.value)}
              />
              <label className="fieldLabel" htmlFor="create-upper-strike">Upper strike</label>
              <input
                id="create-upper-strike"
                value={createUpperInput || activeMarket.market?.suggestedUpperStrike || ""}
                inputMode="numeric"
                onChange={(event) => setCreateUpperInput(event.target.value)}
              />
              <button
                type="button"
                disabled={!createSeries.canCreate || !isValidCreateRange(createLowerInput || activeMarket.market?.suggestedLowerStrike, createUpperInput || activeMarket.market?.suggestedUpperStrike)}
                onClick={() => {
                  const lower = createLowerInput || activeMarket.market?.suggestedLowerStrike || "";
                  const upper = createUpperInput || activeMarket.market?.suggestedUpperStrike || "";
                  createSeries.create({ lowerStrike: lower, upperStrike: upper });
                }}
              >
                Create BTC MOVE Series
              </button>
              {createSeries.status === "confirmed" && createSeries.digest && (
                <StateCallout tone="success" title="Series created">
                  Digest: <span className="mono">{createSeries.digest}</span>
                  {createSeries.explorerUrl && (
                    <>{" "}<a href={createSeries.explorerUrl} target="_blank" rel="noopener noreferrer">Explorer</a></>
                  )}
                  {createSeries.createdSeriesId && (
                    <div>
                      Created VolSeries: <span className="mono">{shortId(createSeries.createdSeriesId)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (createSeries.createdSeriesId) {
                            moveSeries.setSeriesId(createSeries.createdSeriesId);
                          }
                        }}
                      >
                        Use this series
                      </button>
                    </div>
                  )}
                </StateCallout>
              )}
              {createSeries.status === "error" && createSeries.error && (
                <StateCallout tone="danger" title="Create series error">
                  {createSeries.error}
                </StateCallout>
              )}
              {createSeries.blockers.length > 0 && createSeries.status !== "error" && (
                <small className="fieldHelp">{createSeries.blockers.join(" ")}</small>
              )}
            </div>
          )}
          <details className="advancedDetails">
            <summary>Advanced: manual series selection</summary>
            <div className="advancedContent">
              <label className="fieldLabel" htmlFor="manual-series-id">VolSeries object ID</label>
              <input
                id="manual-series-id"
                value={manualSeriesInput}
                placeholder="0x..."
                onChange={(event) => setManualSeriesInput(event.target.value)}
              />
              <button
                type="button"
                disabled={!manualSeriesInput.trim()}
                onClick={() => moveSeries.setSeriesId(manualSeriesInput.trim())}
              >
                Apply manual series
              </button>
            </div>
          </details>
        </section>

        <section className="card tradeSetupCard">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">Step 5</div>
              <h2>Quantity and config</h2>
            </div>
          </div>
          <DataGrid
            variant="compact"
            items={[
              {
                label: "Active VolSeries",
                value: (
                  <span className="mono" title={moveSeries.seriesId ?? config.configuredSeriesId}>
                    {shortId(moveSeries.seriesId ?? config.configuredSeriesId)}
                  </span>
                ),
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
          {moveSeries.status !== "ready" && moveSeries.status !== "idle" && moveSeries.status !== "loading" && (
            <StateCallout tone="warning" title="Series gate">
              Create or select a fresh BTC MOVE series for the active BTC market before buying.
            </StateCallout>
          )}
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
  moveSeries: ReturnType<typeof useActiveBtcMoveSeries>;
  preflightPassed: boolean;
};

function buildFlowSteps({ wallet, managerId, walletDusdcChecked, quote, moveSeries, preflightPassed }: BuildFlowStepsParams): DeepVolFlowStep[] {
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
      state: quote.series && moveSeries.status === "ready" ? "complete" : moveSeries.status === "stale" || moveSeries.status === "missing" ? "current" : wallet.isTestnet ? "current" : "pending",
      detail: moveSeries.status === "ready" ? "BTC MOVE VolSeries matches the active BTC market." : moveSeries.status === "stale" ? "Selected series is stale. Create or select a fresh series." : moveSeries.status === "missing" ? "No series selected. Create or select a BTC MOVE series." : "Discover an active BTC market and select a matching VolSeries.",
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

function moveSeriesStatusTone(status: string): "success" | "warning" | "neutral" | "info" {
  switch (status) {
    case "ready":
      return "success";
    case "stale":
      return "warning";
    case "missing":
      return "neutral";
    case "loading":
      return "info";
    default:
      return "neutral";
  }
}

function isValidCreateRange(lower: string | null | undefined, upper: string | null | undefined): boolean {
  if (!lower || !upper) return false;

  try {
    return BigInt(lower) < BigInt(upper);
  } catch {
    return false;
  }
}
