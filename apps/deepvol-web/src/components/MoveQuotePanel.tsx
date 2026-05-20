import type { DeepVolQuoteState } from "../hooks/useDeepVolQuote";
import { formatAtomicAmount, formatTimestampMs, shortId } from "../lib/format";
import { DataGrid } from "./ui/DataGrid";
import { StateCallout } from "./ui/StateCallout";
import { StatusPill } from "./ui/StatusPill";

type MoveQuotePanelProps = {
  quote: DeepVolQuoteState;
};

export function MoveQuotePanel({ quote }: MoveQuotePanelProps) {
  return (
    <section className={`card quotePanel state-${quote.status}`}>
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Runtime quote and preflight</div>
          <h2>BTC MOVE preview</h2>
        </div>
        <StatusPill tone={statusTone(quote.status)}>{quote.status}</StatusPill>
      </div>

      {quote.error && (
        <StateCallout tone="danger" title="Quote error">
          {quote.error}
        </StateCallout>
      )}

      <div className="metricGrid primaryMetrics">
        <article className="metricCard metricCard-hero">
          <span>Expected premium</span>
          <strong>{formatAtomicAmount(quote.expectedPremiumAtomic)} DUSDC</strong>
          <small>UP quote + DOWN quote for the selected binary leg quantity.</small>
        </article>
        <article className="metricCard">
          <span>Create Fee</span>
          <strong>{formatAtomicAmount(quote.createFeeAtomic)} DUSDC</strong>
          <small>Protocol fee deposited during receipt creation.</small>
        </article>
        <article className="metricCard">
          <span>Max premium paid</span>
          <strong>{formatAtomicAmount(quote.maxPremiumPaidAtomic)} DUSDC</strong>
          <small>Wallet-side ceiling for stale quote protection.</small>
        </article>
      </div>

      <div className="legQuoteGrid">
        <article>
          <span className="legLabel">UP leg</span>
          <strong>{formatAtomicAmount(quote.upQuoteAtomic)} DUSDC</strong>
          <small>BTC above {quote.series?.upperStrike ?? "upper strike"}</small>
        </article>
        <article>
          <span className="legLabel">DOWN leg</span>
          <strong>{formatAtomicAmount(quote.downQuoteAtomic)} DUSDC</strong>
          <small>BTC below {quote.series?.lowerStrike ?? "lower strike"}</small>
        </article>
      </div>

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
          { label: "Quantity", value: quote.quantity },
          {
            label: "Fee coin",
            value: <span className="mono" title={quote.feeCoin?.coinObjectId}>{shortId(quote.feeCoin?.coinObjectId)}</span>,
          },
          { label: "Quoted at", value: formatTimestampMs(quote.quotedAtMs) },
          { label: "Preflight", value: quote.preflight.message },
        ]}
      />

      {quote.warnings.length > 0 && (
        <StateCallout tone="info" title="Quote warnings">
          <ul>
            {quote.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </StateCallout>
      )}

      {quote.blockers.length > 0 && (
        <StateCallout tone="warning" title="Preflight blockers">
          <ul>
            {quote.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </StateCallout>
      )}
    </section>
  );
}

function statusTone(status: DeepVolQuoteState["status"]) {
  if (status === "ready") {
    return "success";
  }

  if (status === "blocked" || status === "loading") {
    return "warning";
  }

  if (status === "error") {
    return "danger";
  }

  return "neutral";
}
