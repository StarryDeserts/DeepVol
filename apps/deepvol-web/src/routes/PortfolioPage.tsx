import { PrimitiveTradeRecordCard } from "../components/PrimitiveTradeRecordCard";
import { ReceiptSummaryCard } from "../components/ReceiptSummaryCard";
import { PageHero } from "../components/ui/PageHero";
import { StateCallout } from "../components/ui/StateCallout";
import { StatusPill } from "../components/ui/StatusPill";
import { useDeepVolPortfolio } from "../hooks/useDeepVolPortfolio";
import { useDeepVolPrimitiveRecords } from "../hooks/useDeepVolPrimitiveRecords";

export function PortfolioPage() {
  const portfolio = useDeepVolPortfolio();
  const primitiveRecords = useDeepVolPrimitiveRecords();
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
        <StateCallout tone="warning" title="Primitive positions are raw Predict positions and do not create MoveReceipt">
          Primitive trade records are local browser hints plus known-key readback where possible, not wallet-wide indexer truth. MOVE Receipts remain separate.
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
    </div>
  );
}
