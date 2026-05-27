import { useState } from "react";
import { useActiveBtcPredictMarket } from "../hooks/useActiveBtcPredictMarket";
import { usePredictManagerSession } from "../hooks/usePredictManagerSession";
import { formatTimestampMs } from "../lib/format";
import { MoveExecutionPanel } from "../components/trade/MoveExecutionPanel";
import { BinaryPrimitiveExecutionPanel } from "../components/trade/BinaryPrimitiveExecutionPanel";
import { RangeExecutionPanel } from "../components/trade/RangeExecutionPanel";

type Product = "MOVE" | "UP" | "DOWN" | "RANGE";

type Props = {
  navigate: (to: string) => void;
  defaultProduct?: Product;
};

/* ─── Skeleton placeholder ─── */
function Skel({ className = "" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function BtcMarketPage({ navigate, defaultProduct = "MOVE" }: Props) {
  const market = useActiveBtcPredictMarket();
  const manager = usePredictManagerSession();
  const [activeTab, setActiveTab] = useState<Product>(defaultProduct);

  const dotClass =
    market.status === "live"
      ? "dot-live"
      : market.status === "stale"
        ? "dot-stale"
        : market.status === "expired"
          ? "dot-expired"
          : "dot-unknown";

  const expiryDisplay = market.market?.expiry
    ? formatTimestampMs(market.market.expiry)
    : null;

  const tabs: { key: Product; label: string; featured?: boolean }[] = [
    { key: "MOVE", label: "MOVE", featured: true },
    { key: "UP", label: "UP" },
    { key: "DOWN", label: "DOWN" },
    { key: "RANGE", label: "RANGE" },
  ];

  return (
    <>
      {/* ─── BREADCRUMB + IDENTITY ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 wave-texture pointer-events-none" />
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 pt-10 pb-8 relative">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-low">
            <a
              href="/markets"
              onClick={(e) => {
                e.preventDefault();
                navigate("/markets");
              }}
              className="hover:text-aqua-400"
            >
              Markets
            </a>
            <span className="text-ink-low/40">/</span>
            <span className="text-white">BTC</span>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                <span className="grid place-items-center w-14 h-14 rounded-full border border-white/10 bg-abyss-700 text-amber-400">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M14.3 11.5c.9-.6 1.5-1.6 1.5-2.8 0-1.8-1.3-3.2-3-3.5V3h-2v2H9V3H7v2H5v2h2v10H5v2h2v2h2v-2h1.8v2h2v-2c2.6 0 4.7-1.8 4.7-4.2 0-1.4-.8-2.6-2.2-3.3zM9 7h3.5c.8 0 1.5.7 1.5 1.5S13.3 10 12.5 10H9V7zm4 10H9v-5h4c1.4 0 2.5 1.1 2.5 2.5S14.4 17 13 17z" />
                  </svg>
                </span>
                <span className="grid place-items-center w-14 h-14 rounded-full border border-white/10 bg-abyss-700 text-aqua-400 font-mono">
                  $
                </span>
              </div>
              <div>
                <h1 className="font-display text-3xl lg:text-4xl text-white tracking-tight">
                  BTC / DUSDC
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className="chip"
                    style={{
                      color: "#6CF2C2",
                      borderColor: "rgba(108,242,194,.3)",
                      background: "rgba(108,242,194,.07)",
                    }}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${dotClass}`}
                    />{" "}
                    {market.statusLabel}
                  </span>
                  {expiryDisplay && (
                    <span className="chip">
                      EXPIRY &middot; {expiryDisplay}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => market.refresh()}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm hover:border-aqua-400/40 ring-aqua inline-flex items-center gap-2"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M21 12a9 9 0 11-3-6.7M21 3v6h-6" />
                </svg>
                Refresh market
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN DASHBOARD: 3 columns ─── */}
      <section className="relative">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 pb-10">
          <div className="grid grid-cols-12 gap-5">
            {/* LEFT: Market stats */}
            <aside className="col-span-12 lg:col-span-3 glass p-6 self-start">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-white">
                  Market stats
                </h3>
                <span className="chip">
                  <span className="pulse-dot" /> {market.statusLabel}
                </span>
              </div>

              <dl className="mt-6 space-y-5">
                <div>
                  <dt className="label">Active oracle</dt>
                  <dd className="mt-1.5 flex items-center justify-between">
                    {market.isLoading ? (
                      <Skel className="h-4 w-32" />
                    ) : (
                      <>
                        <span className="text-white text-sm">
                          Pyth &middot; BTC/USD
                        </span>
                        <span
                          className="chip"
                          style={{
                            color: "#6CF2C2",
                            borderColor: "rgba(108,242,194,.3)",
                            background: "rgba(108,242,194,.07)",
                          }}
                        >
                          {market.statusLabel}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
                <div className="h-px hairline border-t" />
                <div>
                  <dt className="label">Expiry</dt>
                  {market.isLoading ? (
                    <Skel className="mt-1.5 h-4 w-36" />
                  ) : (
                    <dd className="mt-1.5 font-mono text-sm text-white">
                      {expiryDisplay ?? "TBD"}
                    </dd>
                  )}
                </div>
                <div className="h-px hairline border-t" />
                <div>
                  <dt className="label">Status</dt>
                  <dd className="mt-1.5 flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${dotClass}`}
                    />
                    <span className="text-sm" style={{ color: "#6CF2C2" }}>
                      {market.statusMessage}
                    </span>
                  </dd>
                </div>
                <div className="h-px hairline border-t" />
                <div>
                  <dt className="label">Available products</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
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
                    <span className="chip">UP</span>
                    <span className="chip">DOWN</span>
                    <span className="chip">RANGE</span>
                  </dd>
                </div>
                <div className="h-px hairline border-t" />
                <div>
                  <dt className="label">Range band</dt>
                  {market.isLoading ? (
                    <Skel className="mt-1.5 h-4 w-36" />
                  ) : (
                    <>
                      <dd className="mt-1.5 font-mono text-sm text-white">
                        {market.market?.suggestedDownStrike ?? "TBD"} &#8212;{" "}
                        {market.market?.suggestedUpStrike ?? "TBD"}
                      </dd>
                    </>
                  )}
                </div>
              </dl>

              <button className="mt-7 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm hover:border-aqua-400/40 ring-aqua">
                View contract details
              </button>
            </aside>

            {/* CENTER: Volatility visual */}
            <div className="col-span-12 lg:col-span-5 glass p-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="label">BTC volatility</div>
                  <h3 className="font-display text-lg text-white mt-1">
                    Range band &middot; expiry path
                  </h3>
                </div>
              </div>

              <div
                className="mt-5 relative aspect-[16/10] rounded-2xl overflow-hidden border border-white/10"
                style={{
                  background:
                    "radial-gradient(120% 60% at 50% 110%, rgba(46,107,255,.3), transparent 60%), linear-gradient(180deg, rgba(15,26,56,0), rgba(15,26,56,.55))",
                }}
              >
                <svg
                  viewBox="0 0 600 380"
                  className="absolute inset-0 w-full h-full"
                >
                  <defs>
                    <linearGradient id="bf2" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0"
                        stopColor="#5EE8FF"
                        stopOpacity=".16"
                      />
                      <stop
                        offset="1"
                        stopColor="#5EE8FF"
                        stopOpacity=".02"
                      />
                    </linearGradient>
                    <linearGradient id="pl2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#6CF2C2" />
                      <stop offset=".6" stopColor="#5EE8FF" />
                      <stop offset="1" stopColor="#6E5BFF" />
                    </linearGradient>
                  </defs>
                  <g stroke="rgba(255,255,255,0.05)">
                    <path d="M0 60 H600" />
                    <path d="M0 130 H600" />
                    <path d="M0 200 H600" />
                    <path d="M0 270 H600" />
                    <path d="M0 340 H600" />
                    <path d="M120 0 V380" />
                    <path d="M240 0 V380" />
                    <path d="M360 0 V380" />
                    <path d="M480 0 V380" />
                  </g>
                  {/* range band */}
                  <rect
                    x="0"
                    y="140"
                    width="600"
                    height="120"
                    fill="url(#bf2)"
                  />
                  <line
                    x1="0"
                    y1="140"
                    x2="600"
                    y2="140"
                    stroke="#5EE8FF"
                    strokeOpacity=".5"
                    strokeDasharray="4 6"
                  />
                  <line
                    x1="0"
                    y1="260"
                    x2="600"
                    y2="260"
                    stroke="#5EE8FF"
                    strokeOpacity=".5"
                    strokeDasharray="4 6"
                  />
                  <text
                    x="14"
                    y="134"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    fill="#9FB1CC"
                  >
                    UPPER &middot; 66,400
                  </text>
                  <text
                    x="14"
                    y="276"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    fill="#9FB1CC"
                  >
                    LOWER &middot; 61,600
                  </text>
                  <text
                    x="14"
                    y="200"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    fill="#5EE8FF"
                  >
                    REF &middot; 64,000
                  </text>

                  {/* price path */}
                  <path
                    d="M0,230 C60,225 100,220 140,215 S220,200 260,180 S330,150 360,140 S420,100 470,80 S540,50 600,40"
                    fill="none"
                    stroke="url(#pl2)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0,230 C60,225 100,220 140,215 S220,200 260,180 S330,150 360,140 S420,100 470,80 S540,50 600,40"
                    fill="none"
                    stroke="#5EE8FF"
                    strokeOpacity=".22"
                    strokeWidth="6"
                  />

                  {/* breach marker */}
                  <circle
                    cx="335"
                    cy="140"
                    r="16"
                    fill="#5EE8FF"
                    fillOpacity=".25"
                  />
                  <circle cx="335" cy="140" r="3.5" fill="#5EE8FF" />
                  <text
                    x="345"
                    y="128"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    fill="#5EE8FF"
                  >
                    BREACH &uarr;
                  </text>

                  {/* now marker */}
                  <line
                    x1="540"
                    y1="0"
                    x2="540"
                    y2="380"
                    stroke="#fff"
                    strokeOpacity=".15"
                    strokeDasharray="2 4"
                  />
                  <text
                    x="546"
                    y="20"
                    fontFamily="JetBrains Mono"
                    fontSize="10"
                    fill="#9FB1CC"
                  >
                    NOW
                  </text>
                </svg>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="glass-inner p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: "#6CF2C2" }}
                    />
                    <span className="label">MOVE wins</span>
                  </div>
                  <p className="mt-2 text-[13px] text-ink-mid leading-relaxed">
                    When BTC expires{" "}
                    <span className="text-white">outside</span> the band (above
                    66,400 or below 61,600).
                  </p>
                </div>
                <div className="glass-inner p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: "#6E5BFF" }}
                    />
                    <span className="label">RANGE wins</span>
                  </div>
                  <p className="mt-2 text-[13px] text-ink-mid leading-relaxed">
                    When BTC expires{" "}
                    <span className="text-white">inside</span> the band — the
                    inverse thesis to MOVE.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: Trade panel */}
            <div className="col-span-12 lg:col-span-4 glass p-0 overflow-hidden self-start">
              {/* Tabs */}
              <div className="px-6 pt-5 border-b hairline">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-lg text-white">Trade</h3>
                  <span className="chip">SLIPPAGE &middot; 0.5%</span>
                </div>
                {manager.status !== "ready" && manager.blockers.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {manager.blockers.map((b) => (
                      <span key={b} className="pill pill-warn text-[10px]">&bull; {b}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-6">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      className={`tab ${t.featured ? "featured" : ""} ${activeTab === t.key ? "active" : ""}`}
                      onClick={() => setActiveTab(t.key)}
                    >
                      {t.label}
                      {t.featured && activeTab === t.key && (
                        <span
                          className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full"
                          style={{
                            background: "#6CF2C2",
                            boxShadow: "0 0 8px #6CF2C2",
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* MOVE PANEL */}
              {activeTab === "MOVE" && (
                <MoveExecutionPanel
                  predictManagerId={manager.predictManagerId}
                  activeMarket={market.market}
                  navigate={navigate}
                />
              )}

              {activeTab === "UP" && (
                <BinaryPrimitiveExecutionPanel
                  kind="UP"
                  predictManagerId={manager.predictManagerId}
                  activeMarket={market.market}
                  navigate={navigate}
                />
              )}

              {activeTab === "DOWN" && (
                <BinaryPrimitiveExecutionPanel
                  kind="DOWN"
                  predictManagerId={manager.predictManagerId}
                  activeMarket={market.market}
                  navigate={navigate}
                />
              )}

              {activeTab === "RANGE" && (
                <RangeExecutionPanel
                  predictManagerId={manager.predictManagerId}
                  activeMarket={market.market}
                  navigate={navigate}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─── */}
      <section className="relative">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 pb-12">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
            <div>
              <div
                className="chip"
                style={{
                  color: "#5EE8FF",
                  borderColor: "rgba(94,232,255,.25)",
                  background: "rgba(94,232,255,.06)",
                }}
              >
                Product comparison
              </div>
              <h2 className="font-display font-semibold mt-4 text-white text-2xl">
                Choose your exposure
              </h2>
            </div>
          </div>
          <div className="glass overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3.5 label border-b-0">
                    Product
                  </th>
                  <th className="text-left px-4 py-3.5 label border-b-0">
                    Win condition
                  </th>
                  <th className="text-left px-4 py-3.5 label border-b-0">
                    Receipt
                  </th>
                  <th className="text-left px-4 py-3.5 label border-b-0">
                    Fee
                  </th>
                  <th className="text-left px-4 py-3.5 label border-b-0">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  style={{ background: "rgba(108,242,194,.04)" }}
                  className="border-t hairline"
                >
                  <td className="px-4 py-3.5 text-[13px]">
                    <div className="flex items-center gap-2">
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
                      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
                        Flagship
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-white">
                    BTC expires{" "}
                    <span className="text-aqua-400">outside</span> the range
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-white font-mono">
                    MoveReceipt
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-mono">
                    Premium + 0.40 create fee
                  </td>
                  <td className="px-4 py-3.5 text-[13px]">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full dot-live" />
                      <span style={{ color: "#6CF2C2" }}>Live</span>
                    </span>
                  </td>
                </tr>
                <tr className="border-t hairline">
                  <td className="px-4 py-3.5 text-[13px]">
                    <span className="chip">UP</span>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-white">
                    BTC expires{" "}
                    <span className="text-seafoam-400">above</span> strike
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-ink-mid">
                    None &middot; raw primitive
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-mono">
                    Premium
                  </td>
                  <td className="px-4 py-3.5 text-[13px]">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full dot-live" />
                      <span style={{ color: "#6CF2C2" }}>Live</span>
                    </span>
                  </td>
                </tr>
                <tr className="border-t hairline">
                  <td className="px-4 py-3.5 text-[13px]">
                    <span className="chip">DOWN</span>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-white">
                    BTC expires{" "}
                    <span className="text-aqua-400">below</span> strike
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-ink-mid">
                    None &middot; raw primitive
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-mono">
                    Premium
                  </td>
                  <td className="px-4 py-3.5 text-[13px]">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full dot-live" />
                      <span style={{ color: "#6CF2C2" }}>Live</span>
                    </span>
                  </td>
                </tr>
                <tr className="border-t hairline">
                  <td className="px-4 py-3.5 text-[13px]">
                    <span className="chip">RANGE</span>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-white">
                    BTC expires{" "}
                    <span style={{ color: "#9F95FF" }}>inside</span> the
                    interval
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-ink-mid">
                    None &middot; raw primitive
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-mono">
                    Premium
                  </td>
                  <td className="px-4 py-3.5 text-[13px]">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full dot-live" />
                      <span style={{ color: "#6CF2C2" }}>Live</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

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
