import { verifiedTradingHref } from "../../lib/productRoute";

type Props = { navigate: (to: string) => void };

export function LandingProductGrid({ navigate }: Props) {
  return (
    <section id="products" className="relative">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32">
        <div className="flex items-end justify-between flex-wrap gap-6 reveal">
          <div>
            <div
              className="chip"
              style={{
                color: "#5EE8FF",
                borderColor: "rgba(94,232,255,.25)",
                background: "rgba(94,232,255,.06)",
              }}
            >
              The volatility stack
            </div>
            <h2
              className="font-display font-semibold mt-5 text-white"
              style={{
                fontSize: "clamp(30px, 4.2vw, 48px)",
                lineHeight: "1.08",
              }}
            >
              One flagship.
              <br className="hidden sm:block" /> Three primitives.
            </h2>
          </div>
          <p className="max-w-md text-ink-mid">
            BTC MOVE wraps two Predict legs into a single receipt. Or compose
            your own thesis with raw UP, DOWN, and RANGE primitives.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-5 mt-12">
          {/* Featured: BTC MOVE */}
          <article className="reveal col-span-12 lg:col-span-6 lg:row-span-2 glass relative overflow-hidden p-8 lg:p-10 featured-accent cursor-pointer">
            <div className="flex items-center justify-between">
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
              <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-low">
                DEEPVOL &middot; MOVE
              </span>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <span className="grid place-items-center w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.04] relative">
                <span className="absolute inset-0 rounded-2xl icon-ring" />
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5EE8FF"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M3 12h4l3-7 4 14 3-7h4" />
                </svg>
              </span>
              <h3 className="font-display text-3xl lg:text-4xl text-white tracking-tight">
                BTC MOVE
              </h3>
            </div>

            <p className="mt-6 text-ink-mid max-w-lg text-[15px] leading-relaxed">
              Win if BTC expires{" "}
              <span className="text-white">outside the range</span>. Composed
              from UP + DOWN Predict legs and minted as a{" "}
              <span className="text-white">DeepVol MoveReceipt</span> — your
              single, tradable proof of volatility exposure.
            </p>

            {/* Mini schematic */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="glass p-4">
                <div
                  className="text-[10px] font-mono uppercase tracking-[0.18em]"
                  style={{ color: "#5EE8FF" }}
                >
                  UP leg
                </div>
                <div className="mt-2 text-white font-mono text-sm">
                  &uarr; above 66,400
                </div>
              </div>
              <div className="grid place-items-center text-2xl text-ink-low">
                +
              </div>
              <div className="glass p-4">
                <div
                  className="text-[10px] font-mono uppercase tracking-[0.18em]"
                  style={{ color: "#5EE8FF" }}
                >
                  DOWN leg
                </div>
                <div className="mt-2 text-white font-mono text-sm">
                  &darr; below 61,600
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={verifiedTradingHref("MOVE")}
                className="bg-cta rounded-full px-5 py-3 text-sm font-medium text-white shadow-cta ring-aqua"
              >
                Open verified DeepVol app to trade BTC MOVE
              </a>
              <a
                href="/markets/btc"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/markets/btc");
                }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/90 hover:border-aqua-400/40 transition ring-aqua"
              >
                View market
              </a>
            </div>

            {/* decorative wave */}
            <svg
              className="absolute -bottom-4 -right-6 opacity-40"
              width="280"
              height="160"
              viewBox="0 0 280 160"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 120 C60 80 90 140 140 100 S220 60 280 100"
                stroke="#5EE8FF"
                strokeOpacity=".45"
                strokeWidth="1.2"
              />
              <path
                d="M0 140 C60 100 90 160 140 120 S220 80 280 120"
                stroke="#6E5BFF"
                strokeOpacity=".4"
                strokeWidth="1.2"
              />
            </svg>
          </article>

          {/* UP */}
          <article
            className="reveal col-span-12 sm:col-span-6 lg:col-span-3 glass p-6 group cursor-pointer"
            onClick={() => navigate("/markets/btc?product=UP")}
          >
            <div className="flex items-center justify-between">
              <span className="grid place-items-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] relative">
                <span className="absolute inset-0 rounded-xl icon-ring" />
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6CF2C2"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 14l6-6 6 6" />
                </svg>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Primitive
              </span>
            </div>
            <h3 className="font-display text-2xl text-white mt-5">UP</h3>
            <p className="mt-2 text-sm text-ink-mid leading-relaxed">
              Win if BTC expires <span className="text-white">above</span> the
              strike. Raw Predict primitive.
            </p>
            <div className="mt-6 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-low">PAYOFF</span>
              <span style={{ color: "#6CF2C2" }}>1 &uarr; binary</span>
            </div>
          </article>

          {/* DOWN */}
          <article
            className="reveal col-span-12 sm:col-span-6 lg:col-span-3 glass p-6 group cursor-pointer"
            onClick={() => navigate("/markets/btc?product=DOWN")}
          >
            <div className="flex items-center justify-between">
              <span className="grid place-items-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] relative">
                <span className="absolute inset-0 rounded-xl icon-ring" />
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5EE8FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 10l6 6 6-6" />
                </svg>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Primitive
              </span>
            </div>
            <h3 className="font-display text-2xl text-white mt-5">DOWN</h3>
            <p className="mt-2 text-sm text-ink-mid leading-relaxed">
              Win if BTC expires <span className="text-white">below</span> the
              strike. Raw Predict primitive.
            </p>
            <div className="mt-6 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-low">PAYOFF</span>
              <span style={{ color: "#5EE8FF" }}>1 &darr; binary</span>
            </div>
          </article>

          {/* RANGE */}
          <article
            className="reveal col-span-12 sm:col-span-12 lg:col-span-6 glass p-6 group cursor-pointer"
            onClick={() => navigate("/markets/btc?product=RANGE")}
          >
            <div className="flex items-center justify-between">
              <span className="grid place-items-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] relative">
                <span className="absolute inset-0 rounded-xl icon-ring" />
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6E5BFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 12h16" />
                  <path d="M7 9l-3 3 3 3" />
                  <path d="M17 9l3 3-3 3" />
                </svg>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Primitive
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="font-display text-2xl text-white mt-5">
                  RANGE
                </h3>
                <p className="mt-2 text-sm text-ink-mid leading-relaxed max-w-sm">
                  Win if BTC expires{" "}
                  <span className="text-white">inside</span> the interval. The
                  inverse thesis to MOVE.
                </p>
              </div>
              <div className="hidden sm:block w-40 h-14 relative">
                <svg viewBox="0 0 160 56" className="w-full h-full">
                  <rect
                    x="0"
                    y="18"
                    width="160"
                    height="20"
                    fill="rgba(110,91,255,.18)"
                  />
                  <line
                    x1="0"
                    y1="18"
                    x2="160"
                    y2="18"
                    stroke="#6E5BFF"
                    strokeOpacity=".6"
                    strokeDasharray="3 4"
                  />
                  <line
                    x1="0"
                    y1="38"
                    x2="160"
                    y2="38"
                    stroke="#6E5BFF"
                    strokeOpacity=".6"
                    strokeDasharray="3 4"
                  />
                  <path
                    d="M0 30 Q40 22 80 30 T160 28"
                    fill="none"
                    stroke="#5EE8FF"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
