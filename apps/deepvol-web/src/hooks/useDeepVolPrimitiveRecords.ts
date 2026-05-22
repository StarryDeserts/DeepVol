import { useMemo, useSyncExternalStore } from "react";
import { DEEPVOL_STORAGE_KEYS } from "../lib/constants";
import {
  readStoredPrimitiveTrades,
  subscribePrimitiveTradeStorage,
} from "../lib/deepVolPrimitiveStorage";
import { useSuiWallet } from "./useSuiWallet";

export function useDeepVolPrimitiveRecords(predictManagerId?: string | null) {
  const wallet = useSuiWallet();
  const records = useSyncExternalStore(
    subscribePrimitiveTradeStorage,
    () => readStoredPrimitiveTrades(DEEPVOL_STORAGE_KEYS),
    () => [],
  );

  return useMemo(() => {
    const filtered = records.filter((record) => {
      if (wallet.address && record.wallet !== wallet.address) {
        return false;
      }

      if (predictManagerId && record.predictManagerId !== predictManagerId) {
        return false;
      }

      return true;
    });

    return {
      records: filtered,
      hasLocalPrimitiveRecords: filtered.length > 0,
    };
  }, [predictManagerId, records, wallet.address]);
}
