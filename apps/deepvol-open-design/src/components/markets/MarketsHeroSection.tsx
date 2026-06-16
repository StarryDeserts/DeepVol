type Props = {
  navigate: (to: string) => void;
  onRefresh: () => void;
};

export function MarketsHeroSection({ navigate, onRefresh }: Props) {
  return (
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
              onClick={onRefresh}
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
  );
}
