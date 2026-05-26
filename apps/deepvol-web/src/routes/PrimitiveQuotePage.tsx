import { useEffect, useMemo, useState } from "react";
import { PrimitiveQuotePanel } from "../components/PrimitiveQuotePanel";
import { DataGrid } from "../components/ui/DataGrid";
import { PageHero } from "../components/ui/PageHero";
import { StateCallout } from "../components/ui/StateCallout";
import { StatusPill } from "../components/ui/StatusPill";
import { usePrimitivePositionReadback } from "../hooks/usePrimitivePositionReadback";
import { usePrimitivePreflight } from "../hooks/usePrimitivePreflight";
import { usePrimitiveQuote } from "../hooks/usePrimitiveQuote";
import { useActiveBtcPredictMarket } from "../hooks/useActiveBtcPredictMarket";
import type { DiscoveryPhase } from "../hooks/useActiveBtcPredictMarket";
import { usePrimitiveMintableStrike } from "../hooks/usePrimitiveMintableStrike";
import { usePrimitiveMintableRange } from "../hooks/usePrimitiveMintableRange";
import { usePrimitiveWalletExecution } from "../hooks/usePrimitiveWalletExecution";
import type { PrimitiveMarketStatus } from "@rangepilot/types/deepbookPredict";
import type { PrimitiveKind } from "../hooks/primitiveQuoteGate";
import { DEFAULT_MOVE_QUANTITY } from "../lib/constants";
import { formatTimestampMs, shortId } from "../lib/format";

const PRIMITIVE_OPTIONS: PrimitiveKind[] = ["UP", "DOWN", "RANGE"];

export function PrimitiveQuotePage() {
  const [primitiveKind, setPrimitiveKind] = useState<PrimitiveKind>(() => parsePrimitiveKind(window.location.search));
  const [quantityInput, setQuantityInput] = useState(DEFAULT_MOVE_QUANTITY);
  const [strikeInput, setStrikeInput] = useState("");
  const [lowerStrikeInput, setLowerStrikeInput] = useState("");
  const [upperStrikeInput, setUpperStrikeInput] = useState("");
  const [predictManagerInput, setPredictManagerInput] = useState("");
  const activeMarket = useActiveBtcPredictMarket();
  const quote = usePrimitiveQuote({
    activeMarket: activeMarket.market,
    primitiveKind,
    quantityInput,
    strikeInput,
    lowerStrikeInput,
    upperStrikeInput,
  });
  const predictManagerId = predictManagerInput.trim() || null;
  const preflight = usePrimitivePreflight({
    quote,
    predictManagerId,
  });
  const mintableStrike = usePrimitiveMintableStrike({
    activeMarket: activeMarket.market,
    predictManagerId,
    quantity: quantityInput,
    primitiveKind,
  });
  const mintableRange = usePrimitiveMintableRange({
    activeMarket: activeMarket.market,
    predictManagerId,
    quantity: quantityInput,
  });
  const execution = usePrimitiveWalletExecution({
    quote,
    preflight,
    predictManagerId,
    primitiveMintabilityStatus: mintableStrike.status,
    rangeMintabilityStatus: mintableRange.status,
  });
  const readback = usePrimitivePositionReadback({
    predictManagerId,
    series: quote.series,
    oracleObjectId: quote.oracleObjectId,
    primitiveKind,
    strikeInput,
    lowerStrikeInput,
    upperStrikeInput,
  });

  useEffect(() => {
    if (!quote.series) {
      return;
    }

    if (!strikeInput) {
      setStrikeInput(primitiveKind === "DOWN" ? quote.series.lowerStrike : quote.series.upperStrike);
    }

    if (!lowerStrikeInput) {
      setLowerStrikeInput(quote.series.lowerStrike);
    }

    if (!upperStrikeInput) {
      setUpperStrikeInput(quote.series.upperStrike);
    }
  }, [lowerStrikeInput, primitiveKind, quote.series, strikeInput, upperStrikeInput]);

  useEffect(() => {
    if (mintableStrike.status === "passed" && mintableStrike.candidate && (primitiveKind === "UP" || primitiveKind === "DOWN")) {
      setStrikeInput(mintableStrike.candidate.strike);
    }
  }, [mintableStrike.status, mintableStrike.candidate, primitiveKind]);

  useEffect(() => {
    if (mintableRange.status === "passed" && mintableRange.candidate && primitiveKind === "RANGE") {
      setLowerStrikeInput(mintableRange.candidate.lowerStrike);
      setUpperStrikeInput(mintableRange.candidate.higherStrike);
    }
  }, [mintableRange.status, mintableRange.candidate, primitiveKind]);

  const primitiveCopy = useMemo(() => getPrimitiveCopy(primitiveKind), [primitiveKind]);
  const displayedMarketStatus = quote.marketStatus;
  const displayedMarketStatusLabel = activeMarket.statusLabel;
  const displayedMarketStatusMessage = quote.marketStatusMessage ?? activeMarket.statusMessage;
  const activeMarketBlocked = displayedMarketStatus !== "live";

  function selectPrimitive(kind: PrimitiveKind) {
    setPrimitiveKind(kind);
    window.history.replaceState(null, "", `/primitives?type=${kind}`);

    if (quote.series) {
      if (kind === "UP") {
        setStrikeInput(quote.series.upperStrike);
      } else if (kind === "DOWN") {
        setStrikeInput(quote.series.lowerStrike);
      } else {
        setLowerStrikeInput(quote.series.lowerStrike);
        setUpperStrikeInput(quote.series.upperStrike);
      }
    }
  }

  return (
    <div className="primitiveTradeWorkspace">
      <section className="tradeContextColumn">
        <PageHero eyebrow="Predict primitives" title="Predict-native primitive terminal">
          <p>
            UP and DOWN are raw DeepBook Predict primitives with wallet execution gated by fresh quote, manager balance, and mint preflight.
            BTC MOVE remains the flagship DeepVol receipt product, while RANGE stays quote/preflight-only until dedicated validation.
          </p>
        </PageHero>

        <section className="card primitiveSection">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">Active BTC market</div>
              <h2>Market status: {displayedMarketStatusLabel}</h2>
            </div>
            <div className="cardActions">
              <StatusPill tone={activeMarketStatusTone(displayedMarketStatus, activeMarket.discoveryPhase)}>{displayedMarketStatusLabel}</StatusPill>
              <button
                className="secondaryButton"
                type="button"
                disabled={activeMarket.isLoading || activeMarket.isRefreshing}
                onClick={activeMarket.refresh}
              >
                {activeMarket.isLoading ? "Loading active BTC market" : activeMarket.isRefreshing ? "Refreshing active BTC market" : "Refresh active BTC market"}
              </button>
            </div>
          </div>

          <StateCallout tone={!activeMarketBlocked ? "success" : activeMarketStatusCalloutTone(activeMarket.discoveryPhase)} title={displayedMarketStatusMessage}>
            {activeMarketBlocked
              ? displayedMarketStatusMessage
              : "Quote and preflight gates can use this live BTC market."}
          </StateCallout>

          {activeMarket.error && (
            <StateCallout tone="danger" title="Active market discovery error">
              {activeMarket.error}
            </StateCallout>
          )}

          <DataGrid
            variant="compact"
            items={[
              {
                label: "Oracle object",
                value: <span className="mono" title={activeMarket.market?.oracleObjectId}>{shortId(activeMarket.market?.oracleObjectId)}</span>,
              },
              { label: "Expiry", value: formatTimestampMs(activeMarket.market?.expiry) },
              { label: "Source", value: activeMarket.market?.source ?? "Not selected" },
              { label: "Underlying", value: activeMarket.market?.underlyingAsset ?? "BTC" },
              { label: "Spot / forward", value: activeMarket.market ? `${activeMarket.market.spot ?? "n/a"} / ${activeMarket.market.forward ?? "n/a"}` : "Not available" },
              { label: "Suggested UP / DOWN", value: activeMarket.market ? `${activeMarket.market.suggestedUpStrike ?? "n/a"} / ${activeMarket.market.suggestedDownStrike ?? "n/a"}` : "Not available" },
              { label: "Suggested lower / upper", value: activeMarket.market ? `${activeMarket.market.suggestedLowerStrike ?? "n/a"} / ${activeMarket.market.suggestedUpperStrike ?? "n/a"}` : "Not available" },
              { label: "Min strike / tick", value: activeMarket.market ? `${activeMarket.market.minStrike ?? "n/a"} / ${activeMarket.market.tickSize ?? "n/a"}` : "Not available" },
            ]}
          />

          {activeMarket.diagnostics.length > 0 && (
            <StateCallout tone="info" title="Diagnostics">
              <ul>
                {activeMarket.diagnostics.map((diagnostic) => <li key={diagnostic}>{diagnostic}</li>)}
              </ul>
            </StateCallout>
          )}

          <details className="advancedDetails">
            <summary>Advanced: manual market override</summary>
            <div className="advancedContent">
              <StateCallout tone="warning" title="Developer fallback only">
                Most users should use Refresh active BTC market. Manual overrides remain Unknown and cannot bypass quote, preflight, or wallet execution gates.
              </StateCallout>

              <div className="primitiveFormGrid">
                <label>
                  <span className="fieldLabel">Oracle object</span>
                  <input
                    value={activeMarket.manualInput.oracleId}
                    placeholder="0x..."
                    onChange={(event) => activeMarket.setManualInput((input) => ({ ...input, oracleId: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="fieldLabel">Expiry</span>
                  <input
                    value={activeMarket.manualInput.expiry}
                    inputMode="numeric"
                    onChange={(event) => activeMarket.setManualInput((input) => ({ ...input, expiry: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="fieldLabel">UP strike</span>
                  <input
                    value={activeMarket.manualInput.upStrike}
                    inputMode="numeric"
                    onChange={(event) => activeMarket.setManualInput((input) => ({ ...input, upStrike: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="fieldLabel">DOWN strike</span>
                  <input
                    value={activeMarket.manualInput.downStrike}
                    inputMode="numeric"
                    onChange={(event) => activeMarket.setManualInput((input) => ({ ...input, downStrike: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="fieldLabel">Lower strike</span>
                  <input
                    value={activeMarket.manualInput.lowerStrike}
                    inputMode="numeric"
                    onChange={(event) => activeMarket.setManualInput((input) => ({ ...input, lowerStrike: event.target.value }))}
                  />
                </label>
                <label>
                  <span className="fieldLabel">Upper strike</span>
                  <input
                    value={activeMarket.manualInput.upperStrike}
                    inputMode="numeric"
                    onChange={(event) => activeMarket.setManualInput((input) => ({ ...input, upperStrike: event.target.value }))}
                  />
                </label>
              </div>
              <div className="actionRow">
                <button className="secondaryButton" type="button" onClick={activeMarket.applyManualOverride}>
                  Apply manual market
                </button>
                <small className="fieldHelp">Manual market status stays Unknown by design; it cannot bypass quote, preflight, or wallet execution gates.</small>
              </div>
            </div>
          </details>
        </section>

        <section className="card tradeSetupCard">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">Primitive selector</div>
              <h2>{primitiveKind} preview inputs</h2>
            </div>
            <StatusPill tone={
              primitiveKind === "RANGE"
                ? mintableRange.status === "passed" ? "success" : "warning"
                : "success"
            }>
              {primitiveKind === "RANGE"
                ? mintableRange.status === "passed" ? "Wallet gated" : "Awaiting mintability"
                : "Wallet gated"}
            </StatusPill>
          </div>

          <div className="primitiveSelector" role="group" aria-label="Primitive type">
            {PRIMITIVE_OPTIONS.map((kind) => (
              <button
                key={kind}
                className={kind === primitiveKind ? "primaryButton" : "secondaryButton"}
                type="button"
                aria-pressed={kind === primitiveKind}
                onClick={() => selectPrimitive(kind)}
              >
                {kind}
              </button>
            ))}
          </div>

          <StateCallout tone="info" title={primitiveCopy.title}>
            {primitiveCopy.body}
          </StateCallout>

          <DataGrid
            variant="compact"
            items={[
              {
                label: "VolSeries",
                value: <span className="mono" title={quote.series?.seriesId}>{shortId(quote.series?.seriesId)}</span>,
              },
              {
                label: "Oracle",
                value: <span className="mono" title={quote.series?.oracleId}>{shortId(quote.series?.oracleId)}</span>,
              },
              { label: "Expiry", value: formatTimestampMs(quote.series?.expiry) },
            ]}
          />

          <div className="primitiveFormGrid">
            <label>
              <span className="fieldLabel">Quantity</span>
              <input
                value={quantityInput}
                inputMode="numeric"
                onChange={(event) => setQuantityInput(event.target.value)}
              />
            </label>

            {primitiveKind === "RANGE" ? (
              <>
                <label>
                  <span className="fieldLabel">Lower strike</span>
                  <input
                    value={lowerStrikeInput}
                    inputMode="numeric"
                    onChange={(event) => {
                      setLowerStrikeInput(event.target.value);
                      mintableRange.invalidate();
                    }}
                  />
                </label>
                <label>
                  <span className="fieldLabel">Upper strike</span>
                  <input
                    value={upperStrikeInput}
                    inputMode="numeric"
                    onChange={(event) => {
                      setUpperStrikeInput(event.target.value);
                      mintableRange.invalidate();
                    }}
                  />
                </label>
              </>
            ) : (
              <label>
                <span className="fieldLabel">Strike</span>
                <input
                  value={strikeInput}
                  inputMode="numeric"
                  onChange={(event) => {
                    setStrikeInput(event.target.value);
                    mintableStrike.invalidate();
                  }}
                />
              </label>
            )}

            <label>
              <span className="fieldLabel">PredictManager ID</span>
              <input
                value={predictManagerInput}
                placeholder="0x..."
                onChange={(event) => setPredictManagerInput(event.target.value)}
              />
              <small className="fieldHelp">Required for preflight and known-key position readback; no create/deposit action is triggered here.</small>
            </label>
          </div>
        </section>

        {primitiveKind === "RANGE" ? (
          <section className="card primitiveSection">
            <div className="cardHeader">
              <div>
                <div className="eyebrow">Mintable interval validation</div>
                <h2>Mintable RANGE interval</h2>
              </div>
              <StatusPill tone={mintableRange.status === "passed" ? "success" : mintableRange.status === "failed" ? "danger" : mintableRange.status === "running" ? "info" : "warning"}>
                {mintableRange.status}
              </StatusPill>
            </div>

            {mintableRange.status === "passed" && mintableRange.candidate && (
              <StateCallout tone="success" title="Mintable RANGE interval found.">
                Quote and mint preflight passed for this BTC market. Lower: {mintableRange.candidate.lowerStrike} / Upper: {mintableRange.candidate.higherStrike}
              </StateCallout>
            )}

            {mintableRange.status === "failed" && (
              <StateCallout tone="danger" title="No mintable RANGE interval was found for the current market.">
                Try refreshing the active BTC market or adjusting the interval.
              </StateCallout>
            )}

            <div className="actionRow">
              <button
                className="secondaryButton"
                type="button"
                disabled={mintableRange.status === "running"}
                onClick={mintableRange.regenerate}
              >
                {mintableRange.status === "running" ? "Searching mintable RANGE interval..." : "Regenerate mintable RANGE interval"}
              </button>
            </div>

            {mintableRange.blockers.length > 0 && (
              <StateCallout tone="warning" title="Mintability blockers">
                <ul>
                  {mintableRange.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                </ul>
              </StateCallout>
            )}

            {mintableRange.advancedDiagnostics.length > 0 && (
              <details className="advancedDetails">
                <summary>Advanced: RANGE mintability diagnostics</summary>
                <div className="advancedContent">
                  <ul>
                    {mintableRange.advancedDiagnostics.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                </div>
              </details>
            )}
          </section>
        ) : (
          <section className="card primitiveSection">
            <div className="cardHeader">
              <div>
                <div className="eyebrow">Mintable strike validation</div>
                <h2>Mintable {primitiveKind} strike</h2>
              </div>
              <StatusPill tone={mintableStrike.status === "passed" ? "success" : mintableStrike.status === "failed" ? "danger" : mintableStrike.status === "running" ? "info" : "warning"}>
                {mintableStrike.status}
              </StatusPill>
            </div>

            {mintableStrike.status === "passed" && mintableStrike.candidate && (
              <StateCallout tone="success" title={`Mintable ${primitiveKind} strike found.`}>
                Quote and mint preflight passed for this BTC market. Strike: {mintableStrike.candidate.strike}
              </StateCallout>
            )}

            {mintableStrike.status === "failed" && (
              <StateCallout tone="danger" title={`No mintable ${primitiveKind} strike was found for the current market.`}>
                Try refreshing the active BTC market.
              </StateCallout>
            )}

            <div className="actionRow">
              <button
                className="secondaryButton"
                type="button"
                disabled={mintableStrike.status === "running"}
                onClick={mintableStrike.regenerate}
              >
                {mintableStrike.status === "running" ? `Searching mintable ${primitiveKind} strike...` : `Regenerate mintable ${primitiveKind} strike`}
              </button>
            </div>

            {mintableStrike.blockers.length > 0 && (
              <StateCallout tone="warning" title="Mintability blockers">
                <ul>
                  {mintableStrike.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                </ul>
              </StateCallout>
            )}

            {mintableStrike.advancedDiagnostics.length > 0 && (
              <details className="advancedDetails">
                <summary>Advanced: mintability diagnostics</summary>
                <div className="advancedContent">
                  <ul>
                    {mintableStrike.advancedDiagnostics.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                </div>
              </details>
            )}
          </section>
        )}

        <section className="card primitiveSection">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">Known-key readback</div>
              <h2>Primitive Positions</h2>
            </div>
            <StatusPill tone={readback.status === "ready" ? "success" : readback.status === "error" ? "danger" : "warning"}>{readback.status}</StatusPill>
          </div>
          <StateCallout tone="info" title="Known selected key readback is supported first">
            General primitive position indexing is future work. This readback checks the selected active BTC market keys only.
          </StateCallout>
          {readback.entries.length > 0 && (
            <div className="primitiveGrid">
              {readback.entries.map((entry) => (
                <article className="primitiveCard primitivePositionCard" key={entry.label}>
                  <span>{entry.label}</span>
                  <strong>{entry.quantity ?? "Not available"}</strong>
                  <small>{entry.key}</small>
                </article>
              ))}
            </div>
          )}
          {readback.blockers.length > 0 && (
            <StateCallout tone="warning" title="Readback blockers">
              <ul>
                {readback.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            </StateCallout>
          )}
          {readback.error && (
            <StateCallout tone="danger" title="Readback error">
              {readback.error}
            </StateCallout>
          )}
        </section>
      </section>

      <section className="tradeActionColumn">
        <PrimitiveQuotePanel quote={quote} preflight={preflight} execution={execution} predictManagerId={predictManagerId} />
      </section>
    </div>
  );
}

function parsePrimitiveKind(search: string): PrimitiveKind {
  const value = new URLSearchParams(search).get("type")?.toUpperCase();
  return value === "DOWN" || value === "RANGE" ? value : "UP";
}

function activeMarketStatusTone(status: PrimitiveMarketStatus, discoveryPhase: DiscoveryPhase) {
  if (status === "live") {
    return "success" as const;
  }

  if (status === "stale" || status === "expired") {
    return "warning" as const;
  }

  if (discoveryPhase === "refreshing") {
    return "info" as const;
  }

  if (discoveryPhase === "server_error" || discoveryPhase === "quote_failed" || discoveryPhase === "preflight_failed") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function activeMarketStatusCalloutTone(discoveryPhase: DiscoveryPhase) {
  if (discoveryPhase === "server_error" || discoveryPhase === "quote_failed" || discoveryPhase === "preflight_failed") {
    return "danger" as const;
  }

  return "warning" as const;
}

function getPrimitiveCopy(kind: PrimitiveKind) {
  if (kind === "UP") {
    return {
      title: "UP wins above the selected strike",
      body: "UP is a direct Predict primitive for directional upside exposure. It can unlock wallet execution after fresh quote, manager balance, and preflight gates pass; it does not create a DeepVol MoveReceipt.",
    };
  }

  if (kind === "DOWN") {
    return {
      title: "DOWN wins below the selected strike",
      body: "DOWN is a direct Predict primitive for directional downside exposure. It can unlock wallet execution after fresh quote, manager balance, and preflight gates pass; it does not create a DeepVol MoveReceipt.",
    };
  }

  return {
    title: "RANGE wins inside the selected interval",
    body: "RANGE is a raw Predict primitive. It wins if BTC expires inside the selected interval and does not create a DeepVol MoveReceipt. RANGE wallet execution is gated by mintable interval validation, fresh quote, manager balance, and mint preflight.",
  };
}
