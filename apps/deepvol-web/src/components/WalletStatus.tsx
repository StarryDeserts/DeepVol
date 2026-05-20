import { ConnectButton } from "@mysten/dapp-kit";
import { StatusPill } from "./ui/StatusPill";
import { useSuiWallet } from "../hooks/useSuiWallet";
import { shortId } from "../lib/format";

export function WalletStatus() {
  const wallet = useSuiWallet();

  return (
    <section className="walletPanel" aria-label="Wallet status">
      <div className="walletConnect">
        <ConnectButton connectText="Connect wallet" />
      </div>
      <div className="walletPills">
        <StatusPill tone={wallet.isConnected ? "success" : "warning"}>
          {wallet.isConnected ? wallet.connectionStatus : "Disconnected"}
        </StatusPill>
        <StatusPill tone={wallet.isTestnet ? "success" : "warning"}>
          {wallet.isTestnet ? "Sui Testnet" : wallet.activeNetwork}
        </StatusPill>
        <StatusPill tone={wallet.walletSupportsTestnet ? "info" : "neutral"}>
          {wallet.walletName ?? "No wallet"}
        </StatusPill>
        <StatusPill tone="neutral">
          <span className="mono" title={wallet.address ?? undefined}>{shortId(wallet.address)}</span>
        </StatusPill>
      </div>
      <span className="walletSupportText">
        Testnet support: {wallet.walletSupportsTestnet ? "available" : "unavailable until wallet connects"}
      </span>
    </section>
  );
}
