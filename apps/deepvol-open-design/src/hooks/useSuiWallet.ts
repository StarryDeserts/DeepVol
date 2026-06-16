// Local-only: thin dapp-kit wrapper used exclusively by NavBar.
// Not promoted to @deepvol/trading-react because it is shell-specific.
import {
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useSuiClientContext,
} from "@mysten/dapp-kit";
import { TESTNET_CHAIN } from "@/lib/constants";

export function useSuiWallet() {
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const disconnectWallet = useDisconnectWallet();
  const { network } = useSuiClientContext();
  const walletSupportsTestnet = account?.chains.includes(TESTNET_CHAIN) ?? false;
  const isTestnet = network === "testnet" && walletSupportsTestnet;

  return {
    account,
    address: account?.address ?? null,
    activeNetwork: network,
    walletName: wallet.currentWallet?.name ?? null,
    connectionStatus: wallet.connectionStatus,
    isConnected: wallet.isConnected,
    isConnecting: wallet.isConnecting,
    isTestnet,
    walletSupportsTestnet,
    disconnect: () => disconnectWallet.mutate(),
  };
}
