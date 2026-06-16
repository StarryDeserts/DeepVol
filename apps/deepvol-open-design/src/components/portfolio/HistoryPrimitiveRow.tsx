import type { StoredDeepVolPrimitiveTrade } from "@deepvol/trading-react";
import { shortId, formatTimestampMs, formatAtomicAmount } from "@/lib/format";

type Props = {
  record: StoredDeepVolPrimitiveTrade;
};

export function HistoryPrimitiveRow({ record }: Props) {
  return (
    <div
      key={`hist-p-${record.digest}`}
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
            {record.primitiveType === "UP" ? (
              <path d="M6 14l6-6 6 6" />
            ) : record.primitiveType === "DOWN" ? (
              <path d="M6 10l6 6 6-6" />
            ) : (
              <path d="M4 12h16" />
            )}
          </svg>
        </span>
        <span className="text-sm text-white">
          Buy {record.primitiveType} &middot;{" "}
          {record.strike ?? "interval"}
        </span>
      </div>
      <div className="col-span-2">
        <span className="chip">{record.primitiveType}</span>
      </div>
      <div className="col-span-2 text-sm font-mono text-white">
        qty {record.quantity}
      </div>
      <div className="col-span-2 text-sm font-mono text-white">
        {formatAtomicAmount(record.mintCost)}
      </div>
      <div className="col-span-1">
        <span
          className={`pill ${record.status === "success" ? "pill-open" : record.status === "failed" ? "pill-failed" : "pill-local"}`}
        >
          {record.status === "success"
            ? "Success"
            : record.status === "failed"
              ? "Failed"
              : "Local"}
        </span>
      </div>
      <div className="col-span-1 text-[11px] font-mono text-ink-mid">
        {formatTimestampMs(record.executedAtMs)}
      </div>
      <div
        className="col-span-1 text-right text-[11px] font-mono"
        style={{ color: "#5EE8FF" }}
      >
        {shortId(record.digest)}
      </div>
    </div>
  );
}
