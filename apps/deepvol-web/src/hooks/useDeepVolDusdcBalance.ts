import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { getDusdcBalance } from "@deepvol/sdk/deepbookPredict";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import { useSuiWallet } from "./useSuiWallet";

export function useDeepVolDusdcBalance() {
  const client = useSuiClient();
  const wallet = useSuiWallet();

  return useQuery({
    queryKey: ["deepvol-dusdc-balance", wallet.address, wallet.isTestnet],
    queryFn: () => getDusdcBalance(client, wallet.address!, DEEPBOOK_PREDICT_TESTNET),
    enabled: Boolean(wallet.address && wallet.isTestnet),
    staleTime: 10_000,
  });
}
