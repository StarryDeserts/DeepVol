export function Footer() {
  return (
    <footer className="border-t hairline mt-auto">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-cyanx-500/30 to-iris-500/30 border border-white/10">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="#5EE8FF"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 14c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4 2.5 4 5 4" />
              </svg>
            </span>
            <span className="font-display text-sm font-semibold tracking-tight text-ink-mid">
              DeepVol
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-ink-low">
            <a
              href="https://deepbook.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink-mid transition"
            >
              DeepBook
            </a>
            <a
              href="https://sui.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink-mid transition"
            >
              Sui
            </a>
            <span className="text-ink-low">Testnet only</span>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-ink-low font-mono">
            Built on DeepBook Predict
          </p>
        </div>
      </div>
    </footer>
  );
}
