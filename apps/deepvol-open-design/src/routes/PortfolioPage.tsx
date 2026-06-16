import { useEffect, useState } from "react";
import { usePortfolioRecords } from "@rangepilot/deepvol-trading-react";
import { verifiedTradingHref } from "@/lib/productRoute";
import { PrimitiveRow } from "@/components/portfolio/PrimitiveRow";
import { ReceiptRow } from "@/components/portfolio/ReceiptRow";
import { HistoryReceiptRow } from "@/components/portfolio/HistoryReceiptRow";
import { HistoryPrimitiveRow } from "@/components/portfolio/HistoryPrimitiveRow";
import { PortfolioSummaryCards } from "@/components/portfolio/PortfolioSummaryCards";
import { PortfolioOverviewPanel } from "@/components/portfolio/PortfolioOverviewPanel";

type Props = { navigate: (to: string) => void };

type PortfolioTab = "overview" | "move" | "prim" | "history";

/* ─── Skeleton placeholder ─── */
function Skel({ className = "" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
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
      <PortfolioSummaryCards
        isLoading={portfolio.isLoading}
        totalPositions={totalPositions}
        receiptCount={receiptCount}
        primitiveCount={primitiveCount}
        hasLocalReceipts={portfolio.hasLocalReceipts}
        hasLocalPrimitiveRecords={hasLocalPrimitiveRecords}
        records={records}
      />

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
            <PortfolioOverviewPanel
              receiptCount={receiptCount}
              primitiveCount={primitiveCount}
              records={records}
              onShowMove={() => setActiveTab("move")}
              onShowPrim={() => setActiveTab("prim")}
            />
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
                  <HistoryReceiptRow
                    key={`hist-r-${receipt.receiptId}`}
                    receipt={receipt}
                  />
                ))}

                {/* Primitive history rows */}
                {records.map((record) => (
                  <HistoryPrimitiveRow
                    key={`hist-p-${record.digest}`}
                    record={record}
                  />
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
