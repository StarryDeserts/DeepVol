import type { ReactNode } from "react";
import { StateCallout } from "./ui/StateCallout";
import { WalletStatus } from "./WalletStatus";
import { useSuiWallet } from "../hooks/useSuiWallet";

type AppShellProps = {
  children: ReactNode;
  currentPath: string;
};

const navItems = [
  { href: "/markets", label: "Markets" },
  { href: "/buy/btc-move", label: "BTC MOVE" },
  { href: "/portfolio", label: "Portfolio" },
] as const;

export function AppShell({ children, currentPath }: AppShellProps) {
  const wallet = useSuiWallet();

  return (
    <div className="appShell">
      <header className="topNav">
        <a className="brand" href="/markets" aria-label="DeepVol markets">
          <span className="brandMark">DV</span>
          <span className="brandCopy">
            <strong>DeepVol</strong>
            <small>Predict-native structured products</small>
          </span>
        </a>
        <nav className="navLinks" aria-label="DeepVol navigation">
          {navItems.map((item) => {
            const isActive = item.href === "/markets"
              ? currentPath === "/" || currentPath === "/markets"
              : currentPath === item.href;

            return (
              <a key={item.href} href={item.href} aria-current={isActive ? "page" : undefined}>
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="shellActions">
          <span className="productBadge">DeepVol Testnet</span>
          <WalletStatus />
        </div>
      </header>

      <main className="shellMain">
        {!wallet.isConnected && (
          <StateCallout tone="info" title="Wallet required">
            Connect wallet to unlock live quote and fee coin checks.
          </StateCallout>
        )}
        {wallet.isConnected && !wallet.isTestnet && (
          <StateCallout tone="warning" title="Switch network">
            Switch to Sui Testnet before DeepVol can prepare a BTC MOVE wallet transaction.
          </StateCallout>
        )}
        {children}
      </main>
    </div>
  );
}
