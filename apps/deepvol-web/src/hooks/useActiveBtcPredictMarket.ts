import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { DEEPBOOK_PREDICT_TESTNET } from "@rangepilot/config/deepbookPredictTestnet";
import { discoverActiveBtcPrimitiveMarket } from "@rangepilot/sdk/deepbookPredict";
import type {
  PrimitiveActiveMarketContext,
  PrimitiveMarketStatus,
} from "@rangepilot/types/deepbookPredict";
import { useSuiWallet } from "./useSuiWallet";

export type ManualMarketInput = {
  oracleId: string;
  expiry: string;
  upStrike: string;
  downStrike: string;
  lowerStrike: string;
  upperStrike: string;
};

export type ActiveBtcPredictMarketController = {
  market: PrimitiveActiveMarketContext | null;
  status: PrimitiveMarketStatus;
  statusLabel: "Live" | "Stale" | "Expired" | "Unknown";
  statusMessage: string;
  diagnostics: string[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  manualInput: ManualMarketInput;
  setManualInput: Dispatch<SetStateAction<ManualMarketInput>>;
  refresh: () => void;
  applyManualOverride: () => void;
};

const EMPTY_MANUAL_INPUT: ManualMarketInput = {
  oracleId: "",
  expiry: "",
  upStrike: "",
  downStrike: "",
  lowerStrike: "",
  upperStrike: "",
};

const MANUAL_OVERRIDE_DIAGNOSTIC =
  "Manual BTC market override still needs quote/preflight confirmation before trading primitives.";
const MANUAL_OVERRIDE_INVALID_DIAGNOSTIC =
  "Manual active market override requires an oracle object and unsigned-integer expiry/strike values.";

export function useActiveBtcPredictMarket(): ActiveBtcPredictMarketController {
  const client = useSuiClient();
  const wallet = useSuiWallet();
  const [manualInput, setManualInput] = useState<ManualMarketInput>(EMPTY_MANUAL_INPUT);
  const [manualOverride, setManualOverride] = useState<PrimitiveActiveMarketContext | null>(null);
  const [manualOverrideDiagnostics, setManualOverrideDiagnostics] = useState<string[]>([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const canDiscover = Boolean(wallet.address && wallet.isTestnet);

  const discoveryQuery = useQuery({
    queryKey: ["active-btc-predict-market", wallet.address, refreshNonce],
    enabled: canDiscover && manualOverride === null,
    queryFn: () =>
      discoverActiveBtcPrimitiveMarket({
        client,
        sender: wallet.address ?? "",
        config: DEEPBOOK_PREDICT_TESTNET,
      }),
  });

  useEffect(() => {
    if (!canDiscover) {
      setManualOverride(null);
      setManualOverrideDiagnostics([]);
    }
  }, [canDiscover]);

  const refresh = useCallback(() => {
    setManualOverride(null);
    setManualOverrideDiagnostics([]);
    setRefreshNonce((nonce) => nonce + 1);
  }, []);

  const applyManualOverride = useCallback(() => {
    if (!canDiscover) {
      setManualOverride(null);
      setManualOverrideDiagnostics([]);
      return;
    }

    const manualResult = buildManualMarketContext(manualInput);
    setManualOverride(manualResult.market);
    setManualOverrideDiagnostics(manualResult.diagnostics);
  }, [canDiscover, manualInput]);

  const discoveredMarket = canDiscover ? discoveryQuery.data?.market ?? null : null;
  const discoveredDiagnostics = canDiscover ? discoveryQuery.data?.diagnostics ?? [] : [];
  const discoveryError = canDiscover
    ? discoveryQuery.error
      ? discoveryQuery.error instanceof Error
        ? discoveryQuery.error.message
        : String(discoveryQuery.error)
      : discoveryQuery.data?.status === "error"
        ? discoveryQuery.data.error
        : null
    : null;
  const market = canDiscover
    ? manualOverrideDiagnostics.includes(MANUAL_OVERRIDE_INVALID_DIAGNOSTIC)
      ? null
      : manualOverride ?? discoveredMarket
    : null;
  const status = market?.status ?? "unknown";
  const diagnostics = useMemo(() => {
    if (!canDiscover) {
      return [];
    }

    if (manualOverride || manualOverrideDiagnostics.length > 0) {
      return manualOverrideDiagnostics;
    }

    return discoveredDiagnostics;
  }, [canDiscover, discoveredDiagnostics, manualOverride, manualOverrideDiagnostics]);
  const error = canDiscover && manualOverride === null && manualOverrideDiagnostics.includes(MANUAL_OVERRIDE_INVALID_DIAGNOSTIC)
    ? MANUAL_OVERRIDE_INVALID_DIAGNOSTIC
    : discoveryError;

  return {
    market,
    status,
    statusLabel: statusLabelForStatus(status),
    statusMessage: statusMessageForStatus(status),
    diagnostics,
    isLoading: discoveryQuery.isLoading,
    isRefreshing: discoveryQuery.isFetching && !discoveryQuery.isLoading,
    error,
    manualInput,
    setManualInput,
    refresh,
    applyManualOverride,
  };
}

function buildManualMarketContext(input: ManualMarketInput): {
  market: PrimitiveActiveMarketContext | null;
  diagnostics: string[];
} {
  const oracleId = input.oracleId.trim();
  const expiry = unsignedIntegerStringOrNull(input.expiry);
  const upStrike = optionalUnsignedIntegerStringOrNull(input.upStrike);
  const downStrike = optionalUnsignedIntegerStringOrNull(input.downStrike);
  const lowerStrike = optionalUnsignedIntegerStringOrNull(input.lowerStrike);
  const upperStrike = optionalUnsignedIntegerStringOrNull(input.upperStrike);

  if (
    !isValidSuiObjectId(oracleId) ||
    expiry === null ||
    upStrike === undefined ||
    downStrike === undefined ||
    lowerStrike === undefined ||
    upperStrike === undefined
  ) {
    return {
      market: null,
      diagnostics: [MANUAL_OVERRIDE_INVALID_DIAGNOSTIC],
    };
  }

  const diagnostics = [MANUAL_OVERRIDE_DIAGNOSTIC];

  return {
    market: {
      oracleId,
      oracleObjectId: oracleId,
      underlyingAsset: "BTC",
      expiry,
      minStrike: null,
      tickSize: null,
      spot: null,
      forward: null,
      status: "unknown",
      source: "manual_override",
      suggestedUpStrike: upStrike,
      suggestedDownStrike: downStrike,
      suggestedLowerStrike: lowerStrike,
      suggestedUpperStrike: upperStrike,
      diagnostics,
    },
    diagnostics,
  };
}

function statusLabelForStatus(status: PrimitiveMarketStatus): ActiveBtcPredictMarketController["statusLabel"] {
  switch (status) {
    case "live":
      return "Live";
    case "stale":
      return "Stale";
    case "expired":
      return "Expired";
    case "unknown":
      return "Unknown";
  }
}

function statusMessageForStatus(status: PrimitiveMarketStatus): string {
  switch (status) {
    case "live":
      return "Active BTC market is live for primitive quote and mint preflight.";
    case "expired":
      return "The selected BTC market has expired. Refresh or select a new active BTC market before trading primitives.";
    case "stale":
      return "This BTC market is no longer live for minting. Refresh or select a new active market.";
    case "unknown":
      return "Refresh the active BTC market before trading primitives.";
  }
}

function unsignedIntegerStringOrNull(value: string): string | null {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

function optionalUnsignedIntegerStringOrNull(value: string): string | null | undefined {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return /^\d+$/.test(trimmed) ? trimmed : undefined;
}
