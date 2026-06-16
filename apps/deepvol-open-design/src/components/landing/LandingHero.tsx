import { verifiedTradingHref } from "@/lib/productRoute";

type Props = { navigate: (to: string) => void };

export function LandingHero({ navigate }: Props) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 wave-texture pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-20 lg:pt-28 pb-24 lg:pb-32 grid grid-cols-1 gap-10 lg:grid-cols-12 items-center relative">
        {/* Copy */}
        <div className="lg:col-span-7">
          <div
            className="reveal inline-flex items-center gap-2 chip"
            style={{
              color: "#5EE8FF",
              borderColor: "rgba(94,232,255,.25)",
              background: "rgba(94,232,255,.06)",
            }}
          >
            <span className="pulse-dot" />
            Sui Predict · Volatility Terminal
          </div>

          <h1
            className="reveal font-display font-semibold mt-6 text-white leading-[1.02]"
            style={{ fontSize: "clamp(44px, 7.4vw, 92px)" }}
          >
            Trade movement,
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(120deg,#E9F2FF 0%,#5EE8FF 45%,#6E5BFF 100%)",
              }}
            >
              not direction.
            </span>
          </h1>

          <p className="reveal mt-7 max-w-xl text-lg text-ink-mid leading-relaxed">
            DeepVol turns DeepBook Predict primitives into a clean volatility
            trading terminal. Use{" "}
            <span className="text-white">BTC MOVE</span> to express whether
            Bitcoin exits a range, or use{" "}
            <span className="text-white">UP</span>,{" "}
            <span className="text-white">DOWN</span>, and{" "}
            <span className="text-white">RANGE</span> primitives through the verified app.
          </p>

          <div className="reveal mt-10 flex flex-wrap items-center gap-4">
            <a
              href={verifiedTradingHref("MOVE")}
              className="bg-cta block w-full min-w-0 max-w-full rounded-full px-5 py-3.5 text-center text-sm font-medium leading-snug text-white shadow-cta ring-aqua sm:inline-block sm:w-auto sm:px-7 sm:text-base"
            >
              Open verified DeepVol app to trade BTC MOVE
            </a>
            <a
              href="/markets"
              onClick={(e) => {
                e.preventDefault();
                navigate("/markets");
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-7 py-3.5 text-white/90 backdrop-blur hover:border-aqua-400/40 transition ring-aqua"
            >
              Explore Markets
            </a>
            <a
              href="#how"
              className="group inline-flex items-center gap-2 text-sm text-ink-mid hover:text-aqua-400 transition ml-1"
            >
              <span className="grid place-items-center w-8 h-8 rounded-full border border-white/10 group-hover:border-aqua-400/40">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
              Learn how MOVE works
            </a>
          </div>

          <div className="reveal mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs text-ink-low font-mono uppercase tracking-[0.18em]">
            <span>Built on Sui</span>
            <span className="text-ink-low/40">&bull;</span>
            <span>DeepBook Predict</span>
            <span className="text-ink-low/40">&bull;</span>
            <span>Non-custodial</span>
            <span className="text-ink-low/40">&bull;</span>
            <span style={{ color: "#6CF2C2" }}>Testnet validated</span>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="lg:col-span-5 relative">
          <div className="relative aspect-[5/5] max-w-[560px] mx-auto reveal">
            {/* Outer glow */}
            <div
              className="absolute -inset-8 rounded-[36px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(94,232,255,.20), transparent 70%)",
              }}
            />

            {/* Scene */}
            <div className="relative h-full w-full glass overflow-hidden">
              {/* Horizon gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 60% at 50% 110%, rgba(46,107,255,.35), transparent 60%), linear-gradient(180deg, rgba(15,26,56,0) 0%, rgba(15,26,56,.6) 100%)",
                }}
              />

              {/* Grid + Chart SVG */}
              <svg
                viewBox="0 0 500 500"
                className="absolute inset-0 w-full h-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#5EE8FF" stopOpacity=".12" />
                    <stop offset="1" stopColor="#5EE8FF" stopOpacity=".02" />
                  </linearGradient>
                  <linearGradient id="priceLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#6CF2C2" />
                    <stop offset=".6" stopColor="#5EE8FF" />
                    <stop offset="1" stopColor="#6E5BFF" />
                  </linearGradient>
                  <radialGradient id="dotGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0" stopColor="#5EE8FF" />
                    <stop offset="1" stopColor="#5EE8FF" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* subtle grid */}
                <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
                  <path d="M0 100 H500" />
                  <path d="M0 200 H500" />
                  <path d="M0 250 H500" />
                  <path d="M0 300 H500" />
                  <path d="M0 400 H500" />
                  <path d="M100 0 V500" />
                  <path d="M200 0 V500" />
                  <path d="M300 0 V500" />
                  <path d="M400 0 V500" />
                </g>

                {/* range band */}
                <g className="shimmer">
                  <rect
                    x="0"
                    y="200"
                    width="500"
                    height="100"
                    fill="url(#bandFill)"
                  />
                  <line
                    x1="0"
                    y1="200"
                    x2="500"
                    y2="200"
                    stroke="#5EE8FF"
                    strokeOpacity=".55"
                    strokeDasharray="4 6"
                  />
                  <line
                    x1="0"
                    y1="300"
                    x2="500"
                    y2="300"
                    stroke="#5EE8FF"
                    strokeOpacity=".55"
                    strokeDasharray="4 6"
                  />
                </g>

                {/* strike labels */}
                <g
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="10"
                  fill="#9FB1CC"
                >
                  <text x="14" y="194">
                    UPPER &middot; 66,400
                  </text>
                  <text x="14" y="316">
                    LOWER &middot; 61,600
                  </text>
                </g>

                {/* price path */}
                <path
                  className="price-path"
                  d="M0,270 C60,260 90,255 130,250 S210,235 250,210 S320,150 360,120 S440,90 500,70"
                  fill="none"
                  stroke="url(#priceLine)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* shadow path */}
                <path
                  d="M0,270 C60,260 90,255 130,250 S210,235 250,210 S320,150 360,120 S440,90 500,70"
                  fill="none"
                  stroke="#5EE8FF"
                  strokeOpacity=".25"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* breach point */}
                <circle cx="265" cy="200" r="18" fill="url(#dotGrad)" />
                <circle cx="265" cy="200" r="3.5" fill="#5EE8FF" />

                {/* end node */}
                <circle cx="500" cy="70" r="22" fill="url(#dotGrad)" />
                <circle cx="500" cy="70" r="4" fill="#6CF2C2" />

                {/* particles */}
                <g fill="#5EE8FF">
                  <circle cx="60" cy="430" r="1.2" opacity=".6" />
                  <circle cx="140" cy="380" r="1" opacity=".4" />
                  <circle cx="380" cy="430" r="1.4" opacity=".7" />
                  <circle cx="450" cy="380" r="1" opacity=".5" />
                  <circle cx="80" cy="150" r="1" opacity=".5" />
                  <circle cx="220" cy="90" r="1.4" opacity=".6" />
                  <circle cx="330" cy="60" r="1" opacity=".4" />
                </g>
              </svg>

              {/* Floating MoveReceipt */}
              <div
                className="float absolute top-6 right-6 w-[230px] glass p-4"
                style={{
                  borderColor: "rgba(94,232,255,.25)",
                  boxShadow:
                    "0 30px 80px -30px rgba(0,0,0,.8), 0 0 40px -10px rgba(94,232,255,.25)",
                }}
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-ink-mid">
                  <span style={{ color: "#5EE8FF" }}>MoveReceipt</span>
                  <span>#A1F0</span>
                </div>
                <div className="mt-3 font-display text-[22px] text-white leading-tight">
                  BTC MOVE
                </div>
                <div className="mt-1 text-[11px] font-mono text-ink-mid">
                  Strike &middot; 64,000 &middot; Band &plusmn;3.75%
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  <span
                    className="chip"
                    style={{
                      color: "#6CF2C2",
                      borderColor: "rgba(108,242,194,.3)",
                      background: "rgba(108,242,194,.07)",
                    }}
                  >
                    UP
                  </span>
                  <span className="text-ink-low text-[11px]">+</span>
                  <span
                    className="chip"
                    style={{
                      color: "#6CF2C2",
                      borderColor: "rgba(108,242,194,.3)",
                      background: "rgba(108,242,194,.07)",
                    }}
                  >
                    DOWN
                  </span>
                </div>
                <div className="mt-4 h-px hairline border-t" />
                <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-ink-mid">Expiry</span>
                  <span className="text-white">24h</span>
                </div>
              </div>

              {/* corner satellite */}
              <div
                className="absolute bottom-6 left-6 glass px-3.5 py-2.5"
                style={{ borderColor: "rgba(110,91,255,.25)" }}
              >
                <div
                  className="text-[10px] font-mono uppercase tracking-[0.18em]"
                  style={{ color: "#9FB1CC" }}
                >
                  Composition
                </div>
                <div className="mt-1 text-[13px] font-mono text-white">
                  MOVE = UP + DOWN
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
