type Props = {
  isLoading: boolean;
  statusLabel: string;
  dotClass: string;
  expiryDisplay: string | null;
};

function Skel({ className = "" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function MarketStatusCard({
  isLoading,
  statusLabel,
  dotClass,
  expiryDisplay,
}: Props) {
  return (
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
            {isLoading ? (
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
            {isLoading ? (
              <Skel className="mt-2 h-5 w-24" />
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                <span className="text-sm text-white">
                  {statusLabel}
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
  );
}
