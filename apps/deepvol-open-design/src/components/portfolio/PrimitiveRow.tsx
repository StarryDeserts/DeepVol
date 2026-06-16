import { useState } from "react";
import type { StoredDeepVolPrimitiveTrade } from "@deepvol/trading-react";
import { usePrimitiveRecordPositionReadback } from "@/hooks/usePrimitiveRecordPositionReadback";
import { shortId, formatTimestampMs, formatAtomicAmount } from "@/lib/format";

type Props = {
  record: StoredDeepVolPrimitiveTrade;
  navigate: (to: string) => void;
};

function Skel({ className = "" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function PrimitiveRow({ record, navigate }: Props) {
  const readback = usePrimitiveRecordPositionReadback(record);
  const [open, setOpen] = useState(false);

  const iconColor =
    record.primitiveType === "UP"
      ? "#6CF2C2"
      : record.primitiveType === "DOWN"
        ? "#5EE8FF"
        : "#9F95FF";

  const iconPath =
    record.primitiveType === "UP"
      ? "M6 14l6-6 6 6"
      : record.primitiveType === "DOWN"
        ? "M6 10l6 6 6-6"
        : "M4 12h16";

  const isLocal = readback.status === "pending" || readback.status === "error";

  return (
    <details
      className="glass overflow-hidden"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="px-6 py-5 grid grid-cols-12 items-center gap-3 cursor-pointer">
        <div className="col-span-12 md:col-span-3 flex items-center gap-3">
          <span
            className="grid place-items-center w-10 h-10 rounded-xl border border-white/10 bg-abyss-700"
            style={{ color: iconColor }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d={iconPath} />
            </svg>
          </span>
          <div>
            <div className="text-white font-medium">
              {record.primitiveType} &middot; BTC
            </div>
            <div className="text-[11px] font-mono text-ink-low">
              Primitive &middot;{" "}
              {isLocal ? "local record" : `key ${shortId(record.positionKey)}`}
            </div>
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">
            {record.primitiveType === "RANGE" ? "Interval" : "Strike"}
          </div>
          <div className="text-sm font-mono text-white mt-1">
            {record.primitiveType === "RANGE"
              ? `${record.lowerStrike ?? "?"} - ${record.upperStrike ?? "?"}`
              : (record.strike ?? "TBD")}
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">Expiry</div>
          <div className="text-sm font-mono text-white mt-1">
            {formatTimestampMs(record.expiry)}
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">Qty &middot; cost</div>
          <div className="text-sm font-mono text-white mt-1">
            {record.quantity} &middot; {formatAtomicAmount(record.mintCost)}
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">Readback</div>
          <div className="text-sm font-mono mt-1">
            {readback.status === "ready" && readback.quantity ? (
              <span style={{ color: "#6CF2C2" }}>qty {readback.quantity}</span>
            ) : readback.status === "loading" ? (
              <Skel className="h-4 w-16" />
            ) : (
              <span className="text-ink-mid">&mdash;</span>
            )}
          </div>
        </div>
        <div className="col-span-12 md:col-span-1 flex items-center justify-between md:justify-end gap-3">
          <span className={isLocal ? "pill pill-local" : "pill pill-open"}>
            {isLocal ? "Local" : "Open"}
          </span>
          <svg
            className="chev text-ink-mid"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </summary>

      <div className="border-t hairline px-6 py-5 grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-8 grid grid-cols-2 gap-3">
          <div className="glass-inner p-3">
            <div className="label">
              {isLocal ? "Local record ID" : "Market key"}
            </div>
            <div className="text-[12px] font-mono text-white mt-1">
              {shortId(record.positionKey)}
            </div>
          </div>
          <div className="glass-inner p-3">
            <div className="label">Oracle</div>
            <div className="text-[12px] font-mono text-white mt-1">
              {shortId(record.oracleId)}
            </div>
          </div>
          {record.primitiveType === "RANGE" ? (
            <>
              <div className="glass-inner p-3">
                <div className="label">Lower strike</div>
                <div className="text-[12px] font-mono text-white mt-1">
                  {record.lowerStrike ?? "TBD"}
                </div>
              </div>
              <div className="glass-inner p-3">
                <div className="label">Upper strike</div>
                <div className="text-[12px] font-mono text-white mt-1">
                  {record.upperStrike ?? "TBD"}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-inner p-3">
              <div className="label">Strike</div>
              <div className="text-[12px] font-mono text-white mt-1">
                {record.strike ?? "TBD"}
              </div>
            </div>
          )}
          <div className="glass-inner p-3">
            <div className="label">Mint cost</div>
            <div className="text-[12px] font-mono text-white mt-1">
              {formatAtomicAmount(record.mintCost)} DUSDC
            </div>
          </div>
          <div className="glass-inner p-3 col-span-2">
            <div className="label">Mint digest</div>
            <div className="text-[12px] font-mono text-white mt-1 truncate">
              {shortId(record.digest)}
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-4 flex flex-col gap-3">
          <div
            className="glass-inner p-4"
            style={
              isLocal
                ? {
                    background: "rgba(247,185,85,.05)",
                    borderColor: "rgba(247,185,85,.22)",
                  }
                : undefined
            }
          >
            <div className="label">Readback</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${isLocal ? "dot-stale" : "dot-live"}`}
              />
              <span
                className="text-sm"
                style={{ color: isLocal ? "#F7B955" : "#6CF2C2" }}
              >
                {isLocal ? "Local-only" : "Indexed"}
              </span>
            </div>
            {readback.message && (
              <p className="mt-2 text-[11px] text-ink-mid">
                {readback.message}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/markets/btc")}
            className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm hover:border-aqua-400/40 ring-aqua"
          >
            View market
          </button>
        </div>
      </div>
    </details>
  );
}
