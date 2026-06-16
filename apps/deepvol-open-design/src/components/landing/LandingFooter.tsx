type Props = { navigate: (to: string) => void };

export function LandingFooter({ navigate }: Props) {
  return (
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
  );
}
