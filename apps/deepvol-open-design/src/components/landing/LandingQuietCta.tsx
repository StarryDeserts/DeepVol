import { verifiedTradingHref } from "../../lib/productRoute";

export function LandingQuietCta() {
  return (
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
              Trading execution is handled by the verified DeepVol app.
              Open it to trade BTC MOVE on testnet.
            </p>
          </div>
          <div className="relative flex flex-wrap items-center gap-3">
            <a
              href={verifiedTradingHref("MOVE")}
              className="bg-cta block w-full min-w-0 max-w-full rounded-full px-5 py-3.5 text-center text-sm font-medium leading-snug text-white shadow-cta ring-aqua sm:inline-block sm:w-auto sm:px-7 sm:text-base"
            >
              Open verified trading app
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
  );
}
