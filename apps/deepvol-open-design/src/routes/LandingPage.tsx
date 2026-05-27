import { useEffect } from "react";

type Props = { navigate: (to: string) => void };

export function LandingPage({ navigate }: Props) {
  /* ─── Scroll reveal ─── */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        }),
      { threshold: 0.15 },
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 wave-texture pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-20 lg:pt-28 pb-24 lg:pb-32 grid grid-cols-12 gap-10 items-center relative">
          {/* Copy */}
          <div className="col-span-12 lg:col-span-7">
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
              trading terminal. Buy{" "}
              <span className="text-white">BTC MOVE</span> to trade whether
              Bitcoin exits a range, or use{" "}
              <span className="text-white">UP</span>,{" "}
              <span className="text-white">DOWN</span>, and{" "}
              <span className="text-white">RANGE</span> primitives directly.
            </p>

            <div className="reveal mt-10 flex flex-wrap items-center gap-4">
              <a
                href="/markets/btc"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/markets/btc");
                }}
                className="bg-cta rounded-full px-7 py-3.5 font-medium text-white shadow-cta ring-aqua"
              >
                Start Trading
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
          <div className="col-span-12 lg:col-span-5 relative">
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

      {/* ───────────────────── STATUS STRIP ───────────────────── */}
      <section className="strip">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-y-4">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5EE8FF"
                strokeWidth="1.8"
              >
                <path d="M3 12c4 0 4-6 9-6s5 12 9 12" />
              </svg>
            </span>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Network
              </div>
              <div className="text-sm text-white">Built on Sui</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6CF2C2"
                strokeWidth="1.8"
              >
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
            </span>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Engine
              </div>
              <div className="text-sm text-white">DeepBook Predict</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5EE8FF"
                strokeWidth="1.8"
              >
                <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />
              </svg>
            </span>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Custody
              </div>
              <div className="text-sm text-white">Non-custodial</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6CF2C2"
                strokeWidth="1.8"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-low">
                Status
              </div>
              <div className="text-sm" style={{ color: "#6CF2C2" }}>
                Testnet validated
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── PRODUCT CARDS ─────────────────── */}
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
                  href="/markets/btc?product=MOVE"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/markets/btc?product=MOVE");
                  }}
                  className="bg-cta rounded-full px-5 py-3 text-sm font-medium text-white shadow-cta ring-aqua"
                >
                  Trade BTC MOVE
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

      {/* ──────────────────── HOW IT WORKS ──────────────────── */}
      <section id="how" className="relative">
        <div className="absolute inset-x-0 top-0 h-px hairline border-t" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32">
          <div className="reveal max-w-2xl">
            <div
              className="chip"
              style={{
                color: "#5EE8FF",
                borderColor: "rgba(94,232,255,.25)",
                background: "rgba(94,232,255,.06)",
              }}
            >
              How it works
            </div>
            <h2
              className="font-display font-semibold mt-5 text-white"
              style={{
                fontSize: "clamp(30px, 4.2vw, 48px)",
                lineHeight: "1.08",
              }}
            >
              From thesis to receipt
              <br />
              in three steps.
            </h2>
          </div>

          <ol className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {/* connector */}
            <div
              className="hidden md:block absolute left-0 right-0 top-12 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(94,232,255,.35), rgba(110,91,255,.35), transparent)",
              }}
            />

            <li className="reveal glass p-7 relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-ink-low">
                  STEP &middot; 01
                </span>
                <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-abyss-900 text-white font-mono">
                  &#9312;
                </span>
              </div>
              <h3 className="font-display text-xl text-white mt-6">
                Choose a market
              </h3>
              <p className="mt-2 text-sm text-ink-mid leading-relaxed">
                Select BTC MOVE for packaged volatility, or pick a raw UP, DOWN,
                or RANGE primitive.
              </p>
            </li>

            <li className="reveal glass p-7 relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-ink-low">
                  STEP &middot; 02
                </span>
                <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-abyss-900 text-white font-mono">
                  &#9313;
                </span>
              </div>
              <h3 className="font-display text-xl text-white mt-6">
                Quote and preflight
              </h3>
              <p className="mt-2 text-sm text-ink-mid leading-relaxed">
                DeepVol checks live market state, slippage, and depth before any
                wallet approval.
              </p>
            </li>

            <li className="reveal glass p-7 relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-ink-low">
                  STEP &middot; 03
                </span>
                <span className="grid place-items-center w-9 h-9 rounded-full border border-white/10 bg-abyss-900 text-white font-mono">
                  &#9314;
                </span>
              </div>
              <h3 className="font-display text-xl text-white mt-6">
                Trade and track
              </h3>
              <p className="mt-2 text-sm text-ink-mid leading-relaxed">
                Positions appear in Portfolio with receipt or primitive records,
                plus live expiry timers.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* ──────────────────── QUIET CTA BAND ──────────────────── */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24 lg:pb-32">
          <div className="reveal glass relative overflow-hidden p-10 lg:p-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(600px 220px at 0% 0%, rgba(94,232,255,.18), transparent 60%), radial-gradient(600px 220px at 100% 100%, rgba(110,91,255,.22), transparent 60%)",
              }}
            />
            <div className="relative">
              <div
                className="chip"
                style={{
                  color: "#6CF2C2",
                  borderColor: "rgba(108,242,194,.3)",
                  background: "rgba(108,242,194,.07)",
                }}
              >
                Open terminal
              </div>
              <h3
                className="font-display font-semibold mt-4 text-white"
                style={{
                  fontSize: "clamp(26px, 3.4vw, 40px)",
                  lineHeight: "1.1",
                }}
              >
                Volatility, packaged into one receipt.
              </h3>
              <p className="mt-3 text-ink-mid max-w-xl">
                Connect a Sui wallet and start trading BTC MOVE on testnet
                today.
              </p>
            </div>
            <div className="relative flex flex-wrap items-center gap-3">
              <a
                href="/markets/btc"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/markets/btc");
                }}
                className="bg-cta rounded-full px-7 py-3.5 font-medium text-white shadow-cta ring-aqua"
              >
                Launch app
              </a>
              <a
                href="#"
                className="rounded-full border border-white/10 bg-white/[0.04] px-7 py-3.5 text-white/90 hover:border-aqua-400/40 transition ring-aqua"
              >
                Read the docs
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── FOOTER ───────────────────────── */}
      <footer className="border-t hairline">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-14 grid grid-cols-2 lg:grid-cols-12 gap-10">
          <div className="col-span-2 lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyanx-500/30 to-iris-500/30 border border-white/10">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="#5EE8FF"
                  strokeWidth="1.6"
                >
                  <path d="M2 14c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4 2.5 4 5 4" />
                </svg>
              </span>
              <span className="font-display text-[19px] font-semibold tracking-tight">
                DeepVol
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-ink-mid leading-relaxed">
              A Sui-native volatility trading terminal. Trade market movement,
              not just direction.
            </p>
            <div className="mt-5 flex items-center gap-3 text-ink-mid">
              <a
                href="#"
                className="grid place-items-center w-9 h-9 rounded-full border border-white/10 hover:border-aqua-400/40 hover:text-white transition"
                aria-label="X"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 3h3l-7 8 8 10h-6l-5-6-5 6H3l8-9L3 3h6l4 5z" />
                </svg>
              </a>
              <a
                href="#"
                className="grid place-items-center w-9 h-9 rounded-full border border-white/10 hover:border-aqua-400/40 hover:text-white transition"
                aria-label="GitHub"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 00-3.16 19.5c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.15-1.1-1.46-1.1-1.46-.9-.6.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.5 2.34 1.07 2.9.82.1-.65.35-1.07.64-1.32-2.22-.25-4.55-1.1-4.55-4.92 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 015 0c1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.83-2.34 4.67-4.57 4.92.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0012 2z" />
                </svg>
              </a>
              <a
                href="#"
                className="grid place-items-center w-9 h-9 rounded-full border border-white/10 hover:border-aqua-400/40 hover:text-white transition"
                aria-label="Discord"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4.5A18 18 0 0015.5 3l-.2.4a14 14 0 00-6.6 0L8.5 3A18 18 0 004 4.5C1.5 8.5 1 12.4 1.2 16.2A18 18 0 006.7 19l1-1.5a11 11 0 01-1.8-.9l.4-.3a13 13 0 0011.4 0l.4.3-1.8.9 1 1.5a18 18 0 005.5-2.8c.3-4.5-.5-8.4-3-11.7zM9 14.5A2 2 0 117 12.5a2 2 0 012 2zm8 0a2 2 0 11-2-2 2 2 0 012 2z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-low">
              Product
            </div>
            <ul className="mt-4 space-y-3 text-sm text-ink-mid">
              <li>
                <a
                  href="/markets/btc?product=MOVE"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/markets/btc?product=MOVE");
                  }}
                  className="hover:text-white"
                >
                  BTC MOVE
                </a>
              </li>
              <li>
                <a
                  href="/markets/btc?product=UP"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/markets/btc?product=UP");
                  }}
                  className="hover:text-white"
                >
                  UP / DOWN
                </a>
              </li>
              <li>
                <a
                  href="/markets/btc?product=RANGE"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/markets/btc?product=RANGE");
                  }}
                  className="hover:text-white"
                >
                  RANGE
                </a>
              </li>
              <li>
                <a
                  href="/portfolio"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/portfolio");
                  }}
                  className="hover:text-white"
                >
                  Portfolio
                </a>
              </li>
            </ul>
          </div>
          <div className="lg:col-span-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-low">
              Build
            </div>
            <ul className="mt-4 space-y-3 text-sm text-ink-mid">
              <li>
                <a href="#" className="hover:text-white">
                  Docs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  SDK
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Contracts
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  Status
                </a>
              </li>
            </ul>
          </div>
          <div className="lg:col-span-3">
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-low">
              Network
            </div>
            <ul className="mt-4 space-y-3 text-sm text-ink-mid">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-seafoam-400" />{" "}
                Sui Testnet &middot; operational
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-aqua-400" />{" "}
                DeepBook Predict &middot; live
              </li>
              <li className="text-ink-low">
                &copy; DeepVol Labs &middot; 2025
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
