export function LandingHowItWorks() {
  return (
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
  );
}
