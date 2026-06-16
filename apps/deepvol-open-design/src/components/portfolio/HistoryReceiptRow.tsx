import type { DeepVolPortfolioReceipt } from "@rangepilot/deepvol-trading-react";
import { shortId, formatTimestampMs } from "../../lib/format";

type Props = {
  receipt: DeepVolPortfolioReceipt;
};

export function HistoryReceiptRow({ receipt }: Props) {
  return (
    <div
      key={`hist-r-${receipt.receiptId}`}
      className="row-hover grid grid-cols-12 items-center px-6 py-4 border-b hairline"
    >
      <div className="col-span-3 flex items-center gap-3">
        <span
          className="grid place-items-center w-8 h-8 rounded-lg"
          style={{
            background: "rgba(94,232,255,.08)",
            color: "#5EE8FF",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="text-sm text-white">
          Buy BTC MOVE &middot; {shortId(receipt.receiptId)}
        </span>
      </div>
      <div className="col-span-2">
        <span
          className="chip"
          style={{
            color: "#6CF2C2",
            borderColor: "rgba(108,242,194,.3)",
            background: "rgba(108,242,194,.07)",
          }}
        >
          MOVE
        </span>
      </div>
      <div className="col-span-2 text-sm font-mono text-white">
        1 receipt
      </div>
      <div className="col-span-2 text-sm font-mono text-white">
        {receipt.storedRecord
          ? shortId(receipt.storedRecord.seriesId)
          : "—"}
      </div>
      <div className="col-span-1">
        <span className="pill pill-open">Success</span>
      </div>
      <div className="col-span-1 text-[11px] font-mono text-ink-mid">
        {receipt.storedRecord
          ? formatTimestampMs(
              receipt.storedRecord.createdAtMs ?? null,
            )
          : "—"}
      </div>
      <div
        className="col-span-1 text-right text-[11px] font-mono"
        style={{ color: "#5EE8FF" }}
      >
        {receipt.digest ? shortId(receipt.digest) : "—"}
      </div>
    </div>
  );
}
