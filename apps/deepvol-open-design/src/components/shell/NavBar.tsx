import { useState } from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { Chip } from "@/components/atoms/Chip";
import { StatusDot } from "@/components/atoms/StatusDot";
import { useSuiWallet } from "@/hooks/useSuiWallet";

type NavBarProps = {
  currentPath: string;
  onNavigate: (path: string) => void;
};

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Markets", href: "/markets" },
  { label: "Trade", href: "/markets/btc" },
  { label: "Portfolio", href: "/portfolio" },
];

export function NavBar({ currentPath, onNavigate }: NavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isConnected, isTestnet } = useSuiWallet();

  function handleNav(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    onNavigate(href);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-abyss-900/60 border-b hairline">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <a
          href="/"
          className="flex items-center gap-3"
          onClick={(e) => handleNav(e, "/")}
        >
          <img
            src="/deepvol-wordmark.svg"
            alt="DeepVol"
            className="h-8 w-auto select-none"
            draggable={false}
          />
          <Chip className="hidden sm:inline-flex">Testnet</Chip>
        </a>

        {/* Desktop nav */}
        <ul className="hidden lg:flex items-center gap-9 text-sm text-ink-mid">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`nav-link hover:text-white transition ${
                  currentPath.startsWith(link.href) ? "text-white" : ""
                }`}
                onClick={(e) => handleNav(e, link.href)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isConnected && (
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-ink-hi/90">
              <StatusDot variant={isTestnet ? "live" : "warn"} />
              {isTestnet ? "Testnet" : "Wrong network"}
            </span>
          )}
          <ConnectButton />

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden text-ink-mid p-2 min-h-[44px] min-w-[44px] cursor-pointer"
            aria-label="Menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              {menuOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t hairline bg-abyss-900/95 backdrop-blur-xl px-6 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`block py-2 text-sm ${
                currentPath.startsWith(link.href) ? "text-white" : "text-ink-mid"
              } hover:text-white transition`}
              onClick={(e) => handleNav(e, link.href)}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
