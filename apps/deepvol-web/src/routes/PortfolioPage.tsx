import { ReceiptSummaryCard } from "../components/ReceiptSummaryCard";
import { PageHero } from "../components/ui/PageHero";
import { StateCallout } from "../components/ui/StateCallout";
import { StatusPill } from "../components/ui/StatusPill";
import { useDeepVolPortfolio } from "../hooks/useDeepVolPortfolio";

export function PortfolioPage() {
  const portfolio = useDeepVolPortfolio();
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
        <StateCallout tone="info" title="Reference artifact">
          No local receipt history was found for this browser, so the validation receipt is shown as reference evidence only.
        </StateCallout>
      )}

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
    </div>
  );
}
