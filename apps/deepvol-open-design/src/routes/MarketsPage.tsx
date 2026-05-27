import { useEffect } from "react";
import { useActiveBtcPredictMarket } from "../hooks/useActiveBtcPredictMarket";
import { formatTimestampMs } from "../lib/format";

type Props = { navigate: (to: string) => void };

/* ─── Skeleton placeholder ─── */
function Skel({ className = "" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function MarketsPage({ navigate }: Props) {
  const market = useActiveBtcPredictMarket();

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

  const dotClass =
    market.status === "live"
      ? "dot-live"
      : market.status === "stale"
        ? "dot-stale"
        : market.status === "expired"
          ? "dot-expired"
          : "dot-unknown";

  const statusTextClass =
    market.status === "live"
      ? "status-live"
      : market.status === "stale"
        ? "status-stale"
        : market.status === "expired"
          ? "status-expired"
          : "status-unknown";

  const expiryDisplay = market.market?.expiry
    ? formatTimestampMs(market.market.expiry)
    : null;

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 wave-texture pointer-events-none" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-10 relative">
          <div className="reveal flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-low">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
              }}
              className="hover:text-aqua-400"
            >
              Home
            </a>
            <span className="text-ink-low/40">/</span>
            <span className="text-white">Markets</span>
          </div>
          <div className="mt-6 flex items-end justify-between flex-wrap gap-6">
            <div className="reveal max-w-2xl">
              <div
                className="chip"
                style={{
                  color: "#5EE8FF",
                  borderColor: "rgba(94,232,255,.25)",
                  background: "rgba(94,232,255,.06)",
                }}
              >
                <span className="pulse-dot" /> Sui Testnet &middot; DeepBook
                Predict &middot; Active BTC market
              </div>
              <h1
                className="font-display font-semibold mt-5 text-white"
                style={{
                  fontSize: "clamp(36px,5.4vw,64px)",
                  lineHeight: "1.04",
                }}
              >
                BTC volatility markets
              </h1>
              <p className="mt-5 text-lg text-ink-mid max-w-xl leading-relaxed">
                Trade movement, direction, or range outcomes through DeepBook
                Predict primitives. Markets settle on oracle-anchored expiries.
              </p>
            </div>

            <div className="reveal flex items-center gap-3">
              <button
                onClick={() => market.refresh()}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm hover:border-aqua-400/40 transition ring-aqua inline-flex items-center gap-2"
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
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPACT STATS ROW ─── */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 reveal">
            <div className="glass p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Active market
              </div>
              <div className="mt-2 font-display text-xl text-white">
                BTC / DUSDC
              </div>
            </div>
            <div className="glass p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Current expiry
              </div>
              {market.isLoading ? (
                <Skel className="mt-2 h-5 w-40" />
              ) : (
                <>
                  <div className="mt-2 font-mono text-sm text-white">
                    {expiryDisplay ?? "TBD"}
                  </div>
                </>
              )}
            </div>
            <div className="glass p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Products
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className="chip"
                  style={{
                    color: "#6CF2C2",
                    borderColor: "rgba(108,242,194,.28)",
                    background: "rgba(108,242,194,.06)",
                  }}
                >
                  MOVE
                </span>
                <span className="chip">UP</span>
                <span className="chip">DOWN</span>
                <span className="chip">RANGE</span>
              </div>
            </div>
            <div className="glass p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Oracle status
              </div>
              {market.isLoading ? (
                <Skel className="mt-2 h-5 w-24" />
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                  <span className="text-sm text-white">
                    {market.statusLabel}
                  </span>
                </div>
              )}
            </div>
            <div className="glass p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Testnet status
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full dot-live" />
                <span className="text-sm" style={{ color: "#6CF2C2" }}>
                  Validated
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRIMARY MARKET CARD ─── */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-12">
          <div className="reveal glass featured-accent relative overflow-hidden p-8 lg:p-10">
            <div className="grid grid-cols-12 gap-10 items-center">
              <div className="col-span-12 lg:col-span-7">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="chip"
                    style={{
                      color: "#6CF2C2",
                      borderColor: "rgba(108,242,194,.3)",
                      background: "rgba(108,242,194,.07)",
                    }}
                  >
                    Flagship market
                  </span>
                  <span
                    className="inline-flex items-center gap-2 chip"
                    style={{
                      color: "#6CF2C2",
                      borderColor: "rgba(108,242,194,.3)",
                      background: "rgba(108,242,194,.07)",
                    }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                    {market.statusLabel}
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <div className="flex -space-x-2">
                    <span className="grid place-items-center w-12 h-12 rounded-full border border-white/10 bg-abyss-700 text-amber-400 font-mono text-sm">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M14.3 11.5c.9-.6 1.5-1.6 1.5-2.8 0-1.8-1.3-3.2-3-3.5V3h-2v2H9V3H7v2H5v2h2v10H5v2h2v2h2v-2h1.8v2h2v-2c2.6 0 4.7-1.8 4.7-4.2 0-1.4-.8-2.6-2.2-3.3zM9 7h3.5c.8 0 1.5.7 1.5 1.5S13.3 10 12.5 10H9V7zm4 10H9v-5h4c1.4 0 2.5 1.1 2.5 2.5S14.4 17 13 17z" />
                      </svg>
                    </span>
                    <span className="grid place-items-center w-12 h-12 rounded-full border border-white/10 bg-abyss-700 text-aqua-400 font-mono text-xs">
                      $
                    </span>
                  </div>
                  <div>
                    <h2 className="font-display text-3xl lg:text-4xl text-white tracking-tight">
                      BTC / DUSDC
                    </h2>
                    <div className="text-[12px] text-ink-mid font-mono mt-1">
                      Spot ref &middot; Pyth oracle
                    </div>
                  </div>
                </div>

                <p className="mt-6 text-ink-mid max-w-lg leading-relaxed">
                  One BTC volatility market exposing four Predict-native
                  products. Trade BTC MOVE for packaged volatility, or use UP,
                  DOWN, RANGE for raw directional and interval exposure.
                </p>

                <div className="mt-7 flex items-center gap-3 flex-wrap">
                  <a
                    href="/markets/btc"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/markets/btc");
                    }}
                    className="bg-cta rounded-full px-6 py-3 font-medium text-white shadow-cta ring-aqua"
                  >
                    View BTC market &rarr;
                  </a>
                  <a
                    href="/markets/btc?product=MOVE"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/markets/btc?product=MOVE");
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-white/90 hover:border-aqua-400/40 transition ring-aqua"
                  >
                    Trade BTC MOVE
                  </a>
                </div>
              </div>

              {/* Mini visual */}
              <div className="col-span-12 lg:col-span-5">
                <div
                  className="relative aspect-[5/4] rounded-2xl overflow-hidden border border-white/10"
                  style={{
                    background:
                      "radial-gradient(120% 60% at 50% 110%, rgba(46,107,255,.3), transparent 60%), linear-gradient(180deg, rgba(15,26,56,0), rgba(15,26,56,.5))",
                  }}
                >
                  <svg
                    viewBox="0 0 500 400"
                    className="absolute inset-0 w-full h-full"
                  >
                    <defs>
                      <linearGradient id="bf" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0"
                          stopColor="#5EE8FF"
                          stopOpacity=".14"
                        />
                        <stop
                          offset="1"
                          stopColor="#5EE8FF"
                          stopOpacity=".02"
                        />
                      </linearGradient>
                      <linearGradient id="pl" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#6CF2C2" />
                        <stop offset=".6" stopColor="#5EE8FF" />
                        <stop offset="1" stopColor="#6E5BFF" />
                      </linearGradient>
                    </defs>
                    <g stroke="rgba(255,255,255,0.05)">
                      <path d="M0 100 H500" />
                      <path d="M0 200 H500" />
                      <path d="M0 300 H500" />
                    </g>
                    <rect
                      x="0"
                      y="160"
                      width="500"
                      height="100"
                      fill="url(#bf)"
                    />
                    <line
                      x1="0"
                      y1="160"
                      x2="500"
                      y2="160"
                      stroke="#5EE8FF"
                      strokeOpacity=".5"
                      strokeDasharray="4 6"
                    />
                    <line
                      x1="0"
                      y1="260"
                      x2="500"
                      y2="260"
                      stroke="#5EE8FF"
                      strokeOpacity=".5"
                      strokeDasharray="4 6"
                    />
                    <path
                      d="M0,230 C60,220 110,215 160,210 S240,200 280,170 S360,110 420,80 S470,60 500,55"
                      fill="none"
                      stroke="url(#pl)"
                      strokeWidth="2.5"
                    />
                    <text
                      x="14"
                      y="154"
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
                    <circle
                      cx="250"
                      cy="160"
                      r="14"
                      fill="#5EE8FF"
                      fillOpacity=".25"
                    />
                    <circle cx="250" cy="160" r="3" fill="#5EE8FF" />
                  </svg>
                  <div className="absolute bottom-3 left-3 chip">
                    RANGE &middot; 61,600 &#8212; 66,400
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MARKET TABLE ─── */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
          <div className="reveal flex items-end justify-between flex-wrap gap-4 mb-5">
            <div>
              <div
                className="chip"
                style={{
                  color: "#5EE8FF",
                  borderColor: "rgba(94,232,255,.25)",
                  background: "rgba(94,232,255,.06)",
                }}
              >
                All markets
              </div>
              <h2 className="font-display font-semibold mt-4 text-white text-2xl lg:text-3xl">
                Available on Testnet
              </h2>
            </div>
          </div>

          <div className="reveal glass overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-3.5 border-b hairline text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
              <div className="col-span-4">Market</div>
              <div className="col-span-3">Products</div>
              <div className="col-span-2">Expiry</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {/* Row: BTC */}
            <a
              href="/markets/btc"
              onClick={(e) => {
                e.preventDefault();
                navigate("/markets/btc");
              }}
              className="row-hover grid grid-cols-12 items-center px-6 py-5 border-b hairline transition cursor-pointer"
            >
              <div className="col-span-4 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-abyss-700 text-amber-400">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M14.3 11.5c.9-.6 1.5-1.6 1.5-2.8 0-1.8-1.3-3.2-3-3.5V3h-2v2H9V3H7v2H5v2h2v10H5v2h2v2h2v-2h1.8v2h2v-2c2.6 0 4.7-1.8 4.7-4.2 0-1.4-.8-2.6-2.2-3.3zM9 7h3.5c.8 0 1.5.7 1.5 1.5S13.3 10 12.5 10H9V7zm4 10H9v-5h4c1.4 0 2.5 1.1 2.5 2.5S14.4 17 13 17z" />
                    </svg>
                  </span>
                  <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-abyss-700 text-aqua-400 font-mono text-[11px]">
                    $
                  </span>
                </div>
                <div>
                  <div className="text-white font-medium">BTC / DUSDC</div>
                  <div className="text-[11px] font-mono text-ink-low">
                    Pyth oracle
                  </div>
                </div>
              </div>
              <div className="col-span-3 flex flex-wrap gap-1.5">
                <span
                  className="chip"
                  style={{
                    color: "#6CF2C2",
                    borderColor: "rgba(108,242,194,.28)",
                    background: "rgba(108,242,194,.06)",
                  }}
                >
                  MOVE
                </span>
                <span className="chip">UP</span>
                <span className="chip">DOWN</span>
                <span className="chip">RANGE</span>
              </div>
              <div className="col-span-2">
                {market.isLoading ? (
                  <Skel className="h-4 w-28" />
                ) : (
                  <div className="font-mono text-[13px] text-white">
                    {expiryDisplay ?? "TBD"}
                  </div>
                )}
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                <span className={`text-sm ${statusTextClass}`}>
                  {market.statusLabel}
                </span>
              </div>
              <div className="col-span-1 flex justify-end">
                <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] hover:border-aqua-400/40">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </a>

            {/* Row: ETH (coming soon) */}
            <div className="grid grid-cols-12 items-center px-6 py-5 border-b hairline opacity-60">
              <div className="col-span-4 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-abyss-700 text-iris-500">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2L4 12l8 5 8-5L12 2zm0 14l-8-5 8 11 8-11-8 5z" />
                    </svg>
                  </span>
                  <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-abyss-700 text-aqua-400 font-mono text-[11px]">
                    $
                  </span>
                </div>
                <div>
                  <div className="text-white font-medium">ETH / DUSDC</div>
                  <div className="text-[11px] font-mono text-ink-low">
                    Pending oracle
                  </div>
                </div>
              </div>
              <div className="col-span-3 text-ink-low text-sm">&mdash;</div>
              <div className="col-span-2 text-ink-low text-sm">&mdash;</div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full dot-unknown" />
                <span className="text-sm status-unknown">Coming soon</span>
              </div>
              <div className="col-span-1 flex justify-end">
                <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.04]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="4" y="11" width="16" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Row: SUI (coming soon) */}
            <div className="grid grid-cols-12 items-center px-6 py-5 opacity-60">
              <div className="col-span-4 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-abyss-700 text-aqua-400">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  </span>
                  <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-abyss-700 text-aqua-400 font-mono text-[11px]">
                    $
                  </span>
                </div>
                <div>
                  <div className="text-white font-medium">SUI / DUSDC</div>
                  <div className="text-[11px] font-mono text-ink-low">
                    Pending oracle
                  </div>
                </div>
              </div>
              <div className="col-span-3 text-ink-low text-sm">&mdash;</div>
              <div className="col-span-2 text-ink-low text-sm">&mdash;</div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full dot-unknown" />
                <span className="text-sm status-unknown">Coming soon</span>
              </div>
              <div className="col-span-1 flex justify-end">
                <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.04]">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="4" y="11" width="16" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <p className="mt-5 text-[12px] text-ink-low font-mono">
            Markets are oracle-anchored. Stale or expired markets are blocked
            from new minting until refresh.
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t hairline">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-ink-low">
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
