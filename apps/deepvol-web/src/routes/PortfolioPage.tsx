import { useState } from "react";
import { PrimitiveTradeRecordCard } from "../components/PrimitiveTradeRecordCard";
import { ReceiptSummaryCard } from "../components/ReceiptSummaryCard";
import { PageHero } from "../components/ui/PageHero";
import { StateCallout } from "../components/ui/StateCallout";
import { StatusPill } from "../components/ui/StatusPill";
import { useDeepVolPortfolio } from "../hooks/useDeepVolPortfolio";
import { useDeepVolPrimitiveRecords } from "../hooks/useDeepVolPrimitiveRecords";
import { usePrimitivePositionReadback } from "../hooks/usePrimitivePositionReadback";

export function PortfolioPage() {
  const portfolio = useDeepVolPortfolio();
  const [predictManagerInput, setPredictManagerInput] = useState("");
  const predictManagerId = predictManagerInput.trim() || null;
  const primitiveReadback = usePrimitivePositionReadback({
    predictManagerId,
    series: null,
    oracleObjectId: null,
  });
  const primitiveRecords = useDeepVolPrimitiveRecords(predictManagerId);
  const receiptCount = portfolio.receipts.length;

  return (
    <div className="pageGrid portfolioPage">
      <PageHero
        eyebrow="DeepVol receipts"
        title="Track BTC MOVE receipts."
        meta={(
          <div className="heroMetaPills">
            <StatusPill tone={portfolio.hasLocalReceipts ? "success" : "warning"}>
              {portfolio.hasLocalReceipts ? "Local records" : "Reference artifact"}
            </StatusPill>
            <StatusPill tone="neutral">Indexer future work</StatusPill>
          </div>
        )}
      >
        <p>
          DeepVol receipts summarize the MOVE package while the underlying UP and DOWN Predict positions remain in the user's
          PredictManager. This MVP reads known local receipts and a validation reference only.
        </p>
      </PageHero>

      <section className="portfolioSummaryBand">
        <article>
          <span>Receipt records</span>
          <strong>{receiptCount}</strong>
        </article>
        <article>
          <span>Source</span>
          <strong>{portfolio.hasLocalReceipts ? "Local browser records" : "Validation reference"}</strong>
        </article>
        <article>
          <span>Readback mode</span>
          <strong>Known/local receipt only</strong>
        </article>
        <article>
          <span>Indexer</span>
          <strong>Future work</strong>
        </article>
      </section>

      {!portfolio.hasLocalReceipts && (
        <StateCallout tone="info" title="Create your first local receipt">
          No local receipt history was found for this browser. Start on <a href="/buy/btc-move">BTC MOVE</a> to connect a Testnet wallet,
          prepare a PredictManager, fund DUSDC, quote, run preflight, and only then review a buy transaction. The validation receipt below is
          reference evidence only, not connected-wallet inventory.
        </StateCallout>
      )}

      <section className="portfolioSection">
        <div className="cardHeader portfolioSectionHeader">
          <div>
            <div className="eyebrow">MOVE Receipts</div>
            <h2>Receipt-linked BTC MOVE positions</h2>
          </div>
          <StatusPill tone="success">Enabled receipt route</StatusPill>
        </div>
        {portfolio.isLoading && <section className="card">Loading receipt readback...</section>}
        {portfolio.error && (
          <StateCallout tone="danger" title="Portfolio readback error">
            {portfolio.error}
          </StateCallout>
        )}
        <div className="receiptList">
          {portfolio.receipts.map((receipt) => (
            <ReceiptSummaryCard key={`${receipt.source}:${receipt.receiptId}`} receipt={receipt} />
          ))}
        </div>
      </section>

      <section className="card primitiveSection">
        <div className="cardHeader">
          <div>
            <div className="eyebrow">Primitive Positions</div>
            <h2>Local primitive trade records</h2>
          </div>
          <StatusPill tone={primitiveRecords.hasLocalPrimitiveRecords ? "success" : "neutral"}>{primitiveRecords.records.length} records</StatusPill>
        </div>
        <StateCallout tone="warning" title="Primitive trades do not create DeepVol MoveReceipt">
          Primitive trade records are local browser hints, not MoveReceipt objects and not indexer truth. Only BTC MOVE creates a receipt in this app.
        </StateCallout>
        {primitiveRecords.records.length > 0 ? (
          <div className="primitiveGrid primitiveRecordGrid">
            {primitiveRecords.records.map((record) => (
              <PrimitiveTradeRecordCard key={record.digest} record={record} />
            ))}
          </div>
        ) : (
          <StateCallout tone="info" title="No primitive positions yet">
            No primitive positions yet. Trade UP / DOWN / RANGE from the Predict Primitives page.
          </StateCallout>
        )}
      </section>

      <section className="card primitiveSection">
        <div className="cardHeader">
          <div>
            <div className="eyebrow">Primitive Positions</div>
            <h2>Known-key readback groundwork</h2>
          </div>
          <StatusPill tone={primitiveReadback.status === "ready" ? "success" : primitiveReadback.status === "error" ? "danger" : "neutral"}>{primitiveReadback.status}</StatusPill>
        </div>
        <StateCallout tone="warning" title="Known selected key readback is supported first">
          General primitive position indexing is future work. Enter a PredictManager ID to read configured or selected primitive keys directly.
        </StateCallout>
        <label className="fieldLabel" htmlFor="portfolio-predict-manager">
          PredictManager ID for primitive readback
        </label>
        <input
          id="portfolio-predict-manager"
          value={predictManagerInput}
          placeholder="0x..."
          onChange={(event) => setPredictManagerInput(event.target.value)}
        />
        <small className="fieldHelp">Read-only known-key checks only; Portfolio does not create managers or deposit DUSDC.</small>
        {primitiveReadback.entries.length > 0 && (
          <div className="primitiveGrid">
            {primitiveReadback.entries.map((entry) => (
              <article className="primitiveCard primitivePositionCard" key={entry.label}>
                <span>{entry.label}</span>
                <strong>{entry.quantity ?? "Not available"}</strong>
                <small>{entry.key}</small>
              </article>
            ))}
          </div>
        )}
        {primitiveReadback.blockers.length > 0 && (
          <StateCallout tone="warning" title="Primitive readback blockers">
            <ul>
              {primitiveReadback.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          </StateCallout>
        )}
        {primitiveReadback.error && (
          <StateCallout tone="danger" title="Primitive readback error">
            {primitiveReadback.error}
          </StateCallout>
        )}
      </section>
    </div>
  );
}
