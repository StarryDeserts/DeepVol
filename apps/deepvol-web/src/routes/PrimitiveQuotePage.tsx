import { useEffect, useMemo, useState } from "react";
import { PrimitiveQuotePanel } from "../components/PrimitiveQuotePanel";
import { DataGrid } from "../components/ui/DataGrid";
import { PageHero } from "../components/ui/PageHero";
import { StateCallout } from "../components/ui/StateCallout";
import { StatusPill } from "../components/ui/StatusPill";
import { usePrimitivePositionReadback } from "../hooks/usePrimitivePositionReadback";
import { usePrimitivePreflight } from "../hooks/usePrimitivePreflight";
import { usePrimitiveQuote } from "../hooks/usePrimitiveQuote";
import { usePrimitiveWalletExecution } from "../hooks/usePrimitiveWalletExecution";
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
  const quote = usePrimitiveQuote({
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
  const execution = usePrimitiveWalletExecution({
    quote,
    preflight,
    predictManagerId,
  });
  const readback = usePrimitivePositionReadback({
    predictManagerId,
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

  const primitiveCopy = useMemo(() => getPrimitiveCopy(primitiveKind), [primitiveKind]);

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

        <section className="card tradeSetupCard">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">Primitive selector</div>
              <h2>{primitiveKind} preview inputs</h2>
            </div>
            <StatusPill tone={primitiveKind === "RANGE" ? "warning" : "success"}>{primitiveKind === "RANGE" ? "Execution disabled" : "Wallet gated"}</StatusPill>
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
                    onChange={(event) => setLowerStrikeInput(event.target.value)}
                  />
                </label>
                <label>
                  <span className="fieldLabel">Upper strike</span>
                  <input
                    value={upperStrikeInput}
                    inputMode="numeric"
                    onChange={(event) => setUpperStrikeInput(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <label>
                <span className="fieldLabel">Strike</span>
                <input
                  value={strikeInput}
                  inputMode="numeric"
                  onChange={(event) => setStrikeInput(event.target.value)}
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

        <section className="card primitiveSection">
          <div className="cardHeader">
            <div>
              <div className="eyebrow">Known-key readback</div>
              <h2>Primitive Positions</h2>
            </div>
            <StatusPill tone={readback.status === "ready" ? "success" : readback.status === "error" ? "danger" : "warning"}>{readback.status}</StatusPill>
          </div>
          <StateCallout tone="info" title="Known selected key readback is supported first">
            General primitive position indexing is future work. This readback checks configured BTC MOVE keys or the selected preview key only.
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
    body: "RANGE is complementary to MOVE: it wins if BTC expires inside the lower / upper range. RANGE execution requires stricter mintability gates and remains disabled until dedicated validation.",
  };
}
