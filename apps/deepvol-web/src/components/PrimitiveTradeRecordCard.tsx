import type { StoredDeepVolPrimitiveTrade } from "../lib/deepVolPrimitiveStorage";
import { formatAtomicAmount, formatTimestampMs, shortId } from "../lib/format";
import { DataGrid } from "./ui/DataGrid";
import { StateCallout } from "./ui/StateCallout";
import { StatusPill } from "./ui/StatusPill";

type PrimitiveTradeRecordCardProps = {
  record: StoredDeepVolPrimitiveTrade;
};

export function PrimitiveTradeRecordCard({ record }: PrimitiveTradeRecordCardProps) {
  return (
    <article className="primitiveCard primitiveTradeRecordCard">
      <div className="cardHeader">
        <div>
          <div className="eyebrow">Primitive Position</div>
          <h3>{record.primitiveType} local trade record</h3>
        </div>
        <StatusPill tone={record.status === "success" ? "success" : record.status === "failed" ? "danger" : "warning"}>{record.status}</StatusPill>
      </div>

      <DataGrid
        variant="compact"
        items={[
          { label: "Digest", value: <span className="mono wrapText" title={record.digest}>{shortId(record.digest)}</span> },
          { label: "Executed", value: formatTimestampMs(record.executedAtMs) },
          { label: "PredictManager", value: <span className="mono" title={record.predictManagerId}>{shortId(record.predictManagerId)}</span> },
          { label: "Strike", value: record.strike ?? "Not applicable" },
          { label: "Range", value: record.lowerStrike && record.upperStrike ? `${record.lowerStrike} / ${record.upperStrike}` : "Not applicable" },
          { label: "Quantity", value: record.quantity },
          { label: "Mint cost", value: `${formatAtomicAmount(record.mintCost)} DUSDC` },
          { label: "Position key", value: <span className="mono wrapText">{record.positionKey}</span> },
        ]}
      />

      <StateCallout tone="info" title="Local browser record only">
        This primitive trade record is not a DeepVol MoveReceipt and is not wallet-wide indexer truth.
      </StateCallout>

      <p>
        <a href={record.explorerUrl} target="_blank" rel="noreferrer">Open in Sui Explorer</a>
      </p>
    </article>
  );
}
