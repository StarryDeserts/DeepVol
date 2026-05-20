import type { DeepVolPortfolioReceipt } from "../hooks/useDeepVolPortfolio";
import { formatAtomicAmount, formatTimestampMs, shortId } from "../lib/format";
import { DataGrid } from "./ui/DataGrid";
import { StateCallout } from "./ui/StateCallout";
import { StatusPill } from "./ui/StatusPill";

type ReceiptSummaryCardProps = {
  receipt: DeepVolPortfolioReceipt;
};

export function ReceiptSummaryCard({ receipt }: ReceiptSummaryCardProps) {
  const object = receipt.object;
  const sourceLabel = receipt.source === "local" ? "Local browser record" : "Reference artifact";

  return (
    <section className="card receiptCard">
      <div className="receiptTopRow">
        <div>
          <div className="eyebrow">{sourceLabel}</div>
          <h2>BTC MOVE Receipt</h2>
        </div>
        <div className="receiptStatusStack">
          <StatusPill tone={object ? "success" : "warning"}>{object ? statusLabel(object.status) : "Readback pending"}</StatusPill>
          <StatusPill tone={receipt.source === "local" ? "info" : "neutral"}>{sourceLabel}</StatusPill>
        </div>
      </div>

      <div className="receiptMetricRow">
        <article>
          <span>Quantity</span>
          <strong>{object?.quantity ?? "Not available"}</strong>
        </article>
        <article>
          <span>Premium paid</span>
          <strong>{formatAtomicAmount(object?.premiumPaid)} DUSDC</strong>
        </article>
        <article>
          <span>Expiry</span>
          <strong>{formatTimestampMs(object?.expiry)}</strong>
        </article>
      </div>

      <div className="receiptLegRow">
        <article>
          <span>DOWN leg</span>
          <strong>Below {object?.lowerStrike ?? "lower strike"}</strong>
        </article>
        <article>
          <span>UP leg</span>
          <strong>Above {object?.upperStrike ?? "upper strike"}</strong>
        </article>
      </div>

      <DataGrid
        variant="compact"
        items={[
          {
            label: "Receipt ID",
            value: <span className="mono" title={receipt.receiptId}>{shortId(receipt.receiptId)}</span>,
          },
          {
            label: "Digest",
            value: <span className="mono" title={receipt.digest ?? undefined}>{shortId(receipt.digest)}</span>,
          },
          {
            label: "Owner",
            value: <span className="mono" title={object?.owner}>{shortId(object?.owner)}</span>,
          },
          {
            label: "VolSeries",
            value: <span className="mono" title={object?.seriesId}>{shortId(object?.seriesId)}</span>,
          },
          {
            label: "PredictManager",
            value: <span className="mono" title={object?.predictManagerId}>{shortId(object?.predictManagerId)}</span>,
          },
          { label: "Create Fee", value: `${formatAtomicAmount(object?.createFeePaid)} DUSDC` },
        ]}
      />

      {receipt.readbackError && (
        <StateCallout tone="warning" title="Receipt readback limitation">
          {receipt.readbackError}
        </StateCallout>
      )}
      <StateCallout tone="info" title="Position boundary">
        Underlying positions stay in PredictManager. This MVP reads known/local receipts; general receipt indexing is future work.
      </StateCallout>
    </section>
  );
}

function statusLabel(status: number): string {
  switch (status) {
    case 0:
      return "Open";
    case 1:
      return "Settled marker";
    case 2:
      return "Cancelled";
    default:
      return `Unknown ${status}`;
  }
}
