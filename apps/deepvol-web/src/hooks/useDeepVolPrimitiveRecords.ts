import { usePortfolioRecords } from "@deepvol/trading-react";

export function useDeepVolPrimitiveRecords(predictManagerId?: string | null) {
  return usePortfolioRecords(predictManagerId).primitiveRecords;
}
