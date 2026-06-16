import { useEffect, useState } from "react";
import {
  usePortfolioRecords,
  type DeepVolPortfolioReceipt,
  type StoredDeepVolPrimitiveTrade,
} from "@rangepilot/deepvol-trading-react";
import { usePrimitiveRecordPositionReadback } from "../hooks/usePrimitiveRecordPositionReadback";
import { shortId, formatTimestampMs, formatAtomicAmount } from "../lib/format";
import { verifiedTradingHref } from "../lib/productRoute";

type Props = { navigate: (to: string) => void };

type PortfolioTab = "overview" | "move" | "prim" | "history";

/* ─── Skeleton placeholder ─── */
function Skel({ className = "" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

/* ─── Primitive Row with readback ─── */
function PrimitiveRow({
  record,
  navigate,
}: {
  record: StoredDeepVolPrimitiveTrade;
  navigate: (to: string) => void;
}) {
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

/* ─── Receipt Row ─── */
function ReceiptRow({
  receipt,
  navigate,
}: {
  receipt: DeepVolPortfolioReceipt;
  navigate: (to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const obj = receipt.object;
  const isRedeemed = receipt.storedRecord?.redeemValidation?.digest != null;

  const statusPill = isRedeemed ? "pill-redeemed" : "pill-open";
  const statusText = isRedeemed ? "Redeemed" : "Open";

  return (
    <details
      className="glass overflow-hidden"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="px-6 py-5 grid grid-cols-12 items-center gap-3 cursor-pointer">
        <div className="col-span-12 md:col-span-3 flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl border border-white/10 bg-abyss-700 text-amber-400">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M14.3 11.5c.9-.6 1.5-1.6 1.5-2.8 0-1.8-1.3-3.2-3-3.5V3h-2v2H9V3H7v2H5v2h2v10H5v2h2v2h2v-2h1.8v2h2v-2c2.6 0 4.7-1.8 4.7-4.2 0-1.4-.8-2.6-2.2-3.3zM9 7h3.5c.8 0 1.5.7 1.5 1.5S13.3 10 12.5 10H9V7zm4 10H9v-5h4c1.4 0 2.5 1.1 2.5 2.5S14.4 17 13 17z" />
            </svg>
          </span>
          <div>
            <div className="text-white font-medium">BTC MOVE</div>
            <div className="text-[11px] font-mono text-ink-low">
              Receipt &middot; {shortId(receipt.receiptId)}
            </div>
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">Receipt ID</div>
          <div className="text-sm font-mono text-white mt-1">
            {shortId(receipt.receiptId)}
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">Source</div>
          <div className="text-sm font-mono text-white mt-1">
            {receipt.source === "local" ? "Local wallet" : "Reference"}
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">On-chain</div>
          <div className="text-sm font-mono mt-1">
            {obj ? (
              <span style={{ color: "#6CF2C2" }}>Verified</span>
            ) : receipt.readbackError ? (
              <span style={{ color: "#F7B955" }}>Read error</span>
            ) : (
              <Skel className="h-4 w-16" />
            )}
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <div className="label">Digest</div>
          <div className="text-sm font-mono text-white mt-1">
            {receipt.digest ? shortId(receipt.digest) : "—"}
          </div>
        </div>
        <div className="col-span-12 md:col-span-1 flex items-center justify-between md:justify-end gap-3">
          <span className={`pill ${statusPill}`}>{statusText}</span>
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
            <div className="label">Receipt ID</div>
            <div className="text-[12px] font-mono text-white mt-1">
              {shortId(receipt.receiptId)}
            </div>
          </div>
          <div className="glass-inner p-3">
            <div className="label">Mint digest</div>
            <div className="text-[12px] font-mono text-white mt-1 truncate">
              {receipt.digest ? shortId(receipt.digest) : "—"}
            </div>
          </div>
          {receipt.storedRecord && (
            <>
              <div className="glass-inner p-3">
                <div className="label">Series</div>
                <div className="text-[12px] font-mono text-white mt-1 truncate">
                  {shortId(receipt.storedRecord.seriesId)}
                </div>
              </div>
              <div className="glass-inner p-3">
                <div className="label">Created</div>
                <div className="text-[12px] font-mono text-white mt-1">
                  {formatTimestampMs(receipt.storedRecord.createdAtMs)}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="col-span-12 md:col-span-4 flex flex-col gap-3">
          <div className="glass-inner p-4">
            <div className="label">Status</div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`pill ${statusPill}`}>{statusText}</span>
            </div>
            {receipt.readbackError && (
              <p className="mt-2 text-[11px] text-ink-mid">
                Readback error: {receipt.readbackError}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/markets/btc")}
            className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-center hover:border-aqua-400/40 ring-aqua"
          >
            View market
          </button>
        </div>
      </div>
    </details>
  );
}

export function PortfolioPage({ navigate }: Props) {
  const portfolio = usePortfolioRecords();
  const { records, hasLocalPrimitiveRecords } = portfolio.primitiveRecords;
  const [activeTab, setActiveTab] = useState<PortfolioTab>("overview");

  /* Scroll reveal */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        }),
      { threshold: 0.1 },
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const receiptCount = portfolio.receipts.length;
  const primitiveCount = records.length;
  const totalPositions = receiptCount + primitiveCount;

  const tabItems: { key: PortfolioTab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "move", label: "MOVE Receipts", count: receiptCount },
    { key: "prim", label: "Primitive Positions", count: primitiveCount },
    { key: "history", label: "History" },
  ];

  return (
    <>
      {/* ─── HEADER ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 wave-texture pointer-events-none" />
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 pt-12 pb-8 relative">
          <div className="reveal flex items-end justify-between flex-wrap gap-6">
            <div>
              <div
                className="chip"
                style={{
                  color: "#5EE8FF",
                  borderColor: "rgba(94,232,255,.25)",
                  background: "rgba(94,232,255,.06)",
                }}
              >
                <span className="pulse-dot" /> Portfolio
              </div>
              <h1
                className="font-display font-semibold mt-5 text-white"
                style={{
                  fontSize: "clamp(34px,4.8vw,56px)",
                  lineHeight: "1.04",
                }}
              >
                Portfolio
              </h1>
              <p className="mt-3 text-ink-mid max-w-xl">
                Track MOVE receipts and primitive positions across BTC volatility
                markets.
              </p>
            </div>

            {/* Wallet/network strip */}
            <div className="reveal glass px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full dot-live" />
                <span className="label">Wallet</span>
                <span className="text-sm text-white">Connected</span>
              </div>
              <div className="h-5 w-px hairline border-l" />
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full dot-live" />
                <span className="label">Network</span>
                <span className="text-sm text-white">Sui Testnet</span>
              </div>
              <div className="h-5 w-px hairline border-l" />
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full dot-live" />
                <span className="label">PredictManager</span>
                <span className="text-sm text-white">Detected</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SUMMARY CARDS ─── */}
      <section className="relative">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 reveal">
            {/* Total positions */}
            <div className="glass featured-accent p-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="label">Total positions</span>
              </div>
              <div className="mt-4 font-display text-3xl text-white tracking-tight">
                {portfolio.isLoading ? (
                  <Skel className="h-8 w-12" />
                ) : (
                  totalPositions
                )}
              </div>
              <div className="mt-1 text-[12px] text-ink-mid font-mono">
                {receiptCount} receipts &middot; {primitiveCount} primitives
              </div>
            </div>

            {/* MOVE Receipts */}
            <div className="glass p-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="label">MOVE Receipts</span>
                <span
                  className="chip"
                  style={{
                    color: "#6CF2C2",
                    borderColor: "rgba(108,242,194,.28)",
                    background: "rgba(108,242,194,.06)",
                  }}
                >
                  Flagship
                </span>
              </div>
              <div className="mt-4 font-display text-3xl text-white tracking-tight">
                {portfolio.isLoading ? (
                  <Skel className="h-8 w-8" />
                ) : (
                  receiptCount
                )}
              </div>
              <div className="mt-1 text-[12px] text-ink-mid font-mono">
                {portfolio.hasLocalReceipts
                  ? "Local wallet receipts"
                  : "Reference receipts"}
              </div>
            </div>

            {/* Primitive Positions */}
            <div className="glass p-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="label">Primitive positions</span>
                <span className="chip">Raw</span>
              </div>
              <div className="mt-4 font-display text-3xl text-white tracking-tight">
                {primitiveCount}
              </div>
              <div className="mt-1 text-[12px] text-ink-mid font-mono">
                {records.filter((r) => r.primitiveType === "UP").length} UP
                &middot;{" "}
                {records.filter((r) => r.primitiveType === "DOWN").length} DOWN
                &middot;{" "}
                {records.filter((r) => r.primitiveType === "RANGE").length}{" "}
                RANGE
              </div>
            </div>

            {/* Local records */}
            <div className="glass p-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="label">Local records</span>
              </div>
              <div className="mt-4 font-display text-3xl text-white tracking-tight">
                {hasLocalPrimitiveRecords ? primitiveCount : 0}
              </div>
              <div className="mt-1 text-[12px] text-ink-mid font-mono">
                Tracked in browser storage
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TABS ─── */}
      <section className="relative">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
          <div className="border-b hairline flex items-center gap-8 overflow-x-auto">
            {tabItems.map((t) => (
              <button
                key={t.key}
                className={`tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className="ml-1 chip">{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TAB PANELS ─── */}
      <section className="relative">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-8">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div style={{ animation: "fade .3s ease" }}>
              {/* Callout */}
              <div
                className="glass-inner p-4 mb-6 flex items-start gap-3"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(94,232,255,.05), rgba(110,91,255,.04))",
                }}
              >
                <span
                  className="grid place-items-center w-8 h-8 rounded-full shrink-0"
                  style={{
                    background: "rgba(94,232,255,.10)",
                    color: "#5EE8FF",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </span>
                <p className="text-[13px] text-ink-mid leading-relaxed">
                  MOVE creates DeepVol receipts.{" "}
                  <span className="text-white">UP, DOWN, and RANGE</span> are
                  raw Predict positions and do not create receipts. Both appear
                  below but are tracked separately.
                </p>
              </div>

              <div className="grid grid-cols-12 gap-5">
                {/* MOVE summary */}
                <div className="col-span-12 lg:col-span-6 glass p-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="chip"
                          style={{
                            color: "#6CF2C2",
                            borderColor: "rgba(108,242,194,.3)",
                            background: "rgba(108,242,194,.07)",
                          }}
                        >
                          Flagship
                        </span>
                        <span className="label">MOVE Receipts</span>
                      </div>
                      <h3 className="font-display text-xl text-white mt-2">
                        Structured volatility
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="label">Receipts</div>
                      <div className="font-display text-2xl text-white">
                        {receiptCount}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("move")}
                    className="mt-5 w-full bg-cta rounded-xl py-3 text-sm font-medium text-white shadow-cta ring-aqua"
                  >
                    View all receipts
                  </button>
                </div>

                {/* Primitive summary */}
                <div className="col-span-12 lg:col-span-6 glass p-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="chip">Raw</span>
                        <span className="label">Primitive Positions</span>
                      </div>
                      <h3 className="font-display text-xl text-white mt-2">
                        Predict primitives
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="label">Positions</div>
                      <div className="font-display text-2xl text-white">
                        {primitiveCount}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-6">
                    <div className="glass-inner p-3 text-center">
                      <div className="label">UP</div>
                      <div
                        className="font-display text-xl mt-1"
                        style={{ color: "#6CF2C2" }}
                      >
                        {records.filter((r) => r.primitiveType === "UP").length}
                      </div>
                    </div>
                    <div className="glass-inner p-3 text-center">
                      <div className="label">DOWN</div>
                      <div
                        className="font-display text-xl mt-1"
                        style={{ color: "#5EE8FF" }}
                      >
                        {
                          records.filter((r) => r.primitiveType === "DOWN")
                            .length
                        }
                      </div>
                    </div>
                    <div className="glass-inner p-3 text-center">
                      <div className="label">RANGE</div>
                      <div
                        className="font-display text-xl mt-1"
                        style={{ color: "#9F95FF" }}
                      >
                        {
                          records.filter((r) => r.primitiveType === "RANGE")
                            .length
                        }
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-[12px] text-ink-low">
                    General primitive indexing is future work. DeepVol currently
                    tracks known local primitive records and selected market
                    keys.
                  </p>

                  <button
                    onClick={() => setActiveTab("prim")}
                    className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm hover:border-aqua-400/40 ring-aqua"
                  >
                    View primitives
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MOVE RECEIPTS */}
          {activeTab === "move" && (
            <div style={{ animation: "fade .3s ease" }}>
              <div className="glass-inner p-4 mb-5 text-[13px] text-ink-mid leading-relaxed">
                MOVE Receipt tracks a structured BTC volatility position
                composed from UP + DOWN.
              </div>

              {portfolio.isLoading ? (
                <div className="space-y-3">
                  <Skel className="h-20 w-full rounded-2xl" />
                  <Skel className="h-20 w-full rounded-2xl" />
                </div>
              ) : portfolio.receipts.length === 0 ? (
                /* Empty state */
                <div className="glass p-8 text-center max-w-md mx-auto">
                  <span
                    className="grid place-items-center w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.04] mx-auto"
                    style={{ color: "#6CF2C2" }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M4 5h12l4 4v10a2 2 0 01-2 2H4z" />
                      <path d="M4 9h16" />
                    </svg>
                  </span>
                  <h4 className="font-display text-lg text-white mt-4">
                    No MOVE receipts yet
                  </h4>
                  <p className="text-[13px] text-ink-mid mt-1.5 max-w-xs mx-auto">
                    Open the verified DeepVol app to create positions; this page
                    displays positions visible to this app and browser.
                  </p>
                  <a
                    href={verifiedTradingHref("MOVE")}
                    className="inline-block mt-5 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm hover:border-aqua-400/40 ring-aqua"
                  >
                    Open verified DeepVol app to trade BTC MOVE
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {portfolio.receipts.map((receipt) => (
                    <ReceiptRow
                      key={receipt.receiptId}
                      receipt={receipt}
                      navigate={navigate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PRIMITIVE POSITIONS */}
          {activeTab === "prim" && (
            <div style={{ animation: "fade .3s ease" }}>
              <div className="glass-inner p-4 mb-5 text-[13px] text-ink-mid leading-relaxed">
                Primitive positions are raw DeepBook Predict positions and do
                not create DeepVol MoveReceipts.
              </div>

              {records.length === 0 ? (
                /* Empty state */
                <div className="glass p-8 text-center max-w-md mx-auto">
                  <span className="grid place-items-center w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.04] mx-auto text-aqua-400">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M3 12h4l3-7 4 14 3-7h4" />
                    </svg>
                  </span>
                  <h4 className="font-display text-lg text-white mt-4">
                    No primitive positions yet
                  </h4>
                  <p className="text-[13px] text-ink-mid mt-1.5 max-w-xs mx-auto">
                    Open the verified DeepVol app to create primitive positions;
                    this page displays positions visible to this app and browser.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {(["UP", "DOWN", "RANGE"] as const).map((product) => (
                      <a
                        key={product}
                        href={verifiedTradingHref(product)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm hover:border-aqua-400/40 ring-aqua"
                      >
                        Trade {product} in verified app
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <PrimitiveRow
                      key={record.digest}
                      record={record}
                      navigate={navigate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORY */}
          {activeTab === "history" && (
            <div style={{ animation: "fade .3s ease" }}>
              <div className="glass overflow-hidden">
                <div className="grid grid-cols-12 px-6 py-3.5 border-b hairline text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
                  <div className="col-span-3">Action</div>
                  <div className="col-span-2">Product</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-2">Cost</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Time</div>
                  <div className="col-span-1 text-right">Digest</div>
                </div>

                {/* Receipt history rows */}
                {portfolio.receipts.map((receipt) => (
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
                ))}

                {/* Primitive history rows */}
                {records.map((record) => (
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
                ))}

                {portfolio.receipts.length === 0 && records.length === 0 && (
                  <div className="px-6 py-8 text-center text-ink-mid text-sm">
                    No history yet. Open the verified DeepVol app to create
                    positions, then return here to review records visible to this browser.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── EMPTY STATE SECTION (when no positions at all) ─── */}
      {totalPositions === 0 &&
        !portfolio.isLoading &&
        activeTab === "overview" && (
          <section className="relative">
            <div className="mx-auto max-w-[1280px] px-6 lg:px-8 pb-16">
              <div className="glass p-8 text-center max-w-md mx-auto">
                <span className="grid place-items-center w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.04] mx-auto">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5EE8FF"
                    strokeWidth="1.8"
                  >
                    <rect x="3" y="7" width="18" height="12" rx="3" />
                    <path d="M16 11h.01" />
                  </svg>
                </span>
                <h4 className="font-display text-lg text-white mt-4">
                  No positions yet
                </h4>
                <p className="text-[13px] text-ink-mid mt-1.5 max-w-xs mx-auto">
                  Open the verified DeepVol app to create positions; this page
                  displays positions visible to this app and browser.
                </p>
                <a
                  href={verifiedTradingHref("MOVE")}
                  className="inline-block mt-5 bg-cta rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-cta ring-aqua"
                >
                  Open verified DeepVol app to trade BTC MOVE
                </a>
              </div>
            </div>
          </section>
        )}

      {/* ─── FOOTER ─── */}
      <footer className="border-t hairline">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-ink-low">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04]">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="#5EE8FF"
                strokeWidth="1.6"
              >
                <path d="M2 14c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4 2.5 4 5 4" />
              </svg>
            </span>
            <span>DeepVol &middot; Sui Testnet</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white">
              Docs
            </a>
            <a href="#" className="hover:text-white">
              Status
            </a>
            <a href="#" className="hover:text-white">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
