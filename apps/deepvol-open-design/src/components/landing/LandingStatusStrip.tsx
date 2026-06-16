export function LandingStatusStrip() {
  return (
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
  );
}
