import { verifiedTradingHref } from "@/lib/productRoute";

type Props = {
  navigate: (to: string) => void;
  statusLabel: string;
  dotClass: string;
};

export function FlagshipMarketCard({ navigate, statusLabel, dotClass }: Props) {
  return (
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
                  {statusLabel}
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
                products. Explore BTC MOVE for packaged volatility, or use UP,
                DOWN, RANGE for raw directional and interval exposure in the verified app.
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
                  href={verifiedTradingHref("MOVE")}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-white/90 hover:border-aqua-400/40 transition ring-aqua"
                >
                  Open verified DeepVol app to trade BTC MOVE
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
  );
}
