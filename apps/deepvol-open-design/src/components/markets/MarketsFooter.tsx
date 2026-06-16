export function MarketsFooter() {
  return (
    <footer className="border-t hairline">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-ink-low">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04]">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="#5EE8FF"
              strokeWidth="1.6"
            >
              <path d="M2 14c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4 2.5 4 5 4" />
            </svg>
          </span>
          <span>DeepVol &middot; Sui Testnet</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-white">
            Docs
          </a>
          <a href="#" className="hover:text-white">
            Status
          </a>
          <a href="#" className="hover:text-white">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
