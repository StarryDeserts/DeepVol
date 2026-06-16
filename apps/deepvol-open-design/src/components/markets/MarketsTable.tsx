type Props = {
  navigate: (to: string) => void;
  isLoading: boolean;
  statusLabel: string;
  dotClass: string;
  statusTextClass: string;
  expiryDisplay: string | null;
};

function Skel({ className = "" }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function MarketsTable({
  navigate,
  isLoading,
  statusLabel,
  dotClass,
  statusTextClass,
  expiryDisplay,
}: Props) {
  return (
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
              {isLoading ? (
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
                {statusLabel}
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
  );
}
