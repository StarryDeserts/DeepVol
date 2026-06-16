import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { isValidSuiObjectId } from "@mysten/sui/utils";
import { DEEPBOOK_PREDICT_TESTNET } from "@deepvol/config/deepbookPredictTestnet";
import { discoverActiveBtcPrimitiveMarket } from "@deepvol/sdk/deepbookPredict";
import type {
  PrimitiveActiveMarketContext,
  PrimitiveMarketStatus,
} from "@deepvol/types/deepbookPredict";
import { useSuiWallet } from "../core/useSuiWallet";

export type ManualMarketInput = {
  oracleId: string;
  expiry: string;
  upStrike: string;
  downStrike: string;
  lowerStrike: string;
  upperStrike: string;
};

export type DiscoveryPhase =
  | "idle"
  | "refreshing"
  | "found"
  | "not_found"
  | "server_error"
  | "quote_failed"
  | "preflight_failed";

export type ActiveBtcPredictMarketController = {
  market: PrimitiveActiveMarketContext | null;
  status: PrimitiveMarketStatus;
  discoveryPhase: DiscoveryPhase;
  statusLabel: string;
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

  const discoveryPhase = deriveDiscoveryPhase({
    canDiscover,
    isLoading: discoveryQuery.isLoading,
    isFetching: discoveryQuery.isFetching,
    queryError: discoveryQuery.error,
    data: canDiscover && manualOverride === null ? discoveryQuery.data ?? null : null,
    hasManualOverride: manualOverride !== null || manualOverrideDiagnostics.length > 0,
  });

  return {
    market,
    status,
    discoveryPhase,
    statusLabel: statusLabelForDiscovery(status, discoveryPhase),
    statusMessage: statusMessageForDiscovery(status, discoveryPhase),
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

function deriveDiscoveryPhase(input: {
  canDiscover: boolean;
  isLoading: boolean;
  isFetching: boolean;
  queryError: unknown;
  data: import("@deepvol/types/deepbookPredict").PrimitiveActiveMarketDiscoveryResult | null;
  hasManualOverride: boolean;
}): DiscoveryPhase {
  if (!input.canDiscover) {
    return "idle";
  }

  if (input.hasManualOverride) {
    return "found";
  }

  if (input.isLoading || input.isFetching) {
    return "refreshing";
  }

  if (input.queryError) {
    return "server_error";
  }

  if (!input.data) {
    return "idle";
  }

  if (input.data.status === "found") {
    return "found";
  }

  if (input.data.status === "error") {
    return "server_error";
  }

  const hasQuoteFailure = input.data.diagnostics.some(
    (d) => d.includes("did not produce a positive UP/DOWN quote") || d.includes("quote validation failed"),
  );

  if (hasQuoteFailure) {
    return "quote_failed";
  }

  return "not_found";
}

function statusLabelForDiscovery(status: PrimitiveMarketStatus, phase: DiscoveryPhase): string {
  switch (status) {
    case "live":
      return "Live";
    case "stale":
      return "Stale";
    case "expired":
      return "Expired";
    case "unknown":
      break;
  }

  switch (phase) {
    case "idle":
      return "Connect wallet";
    case "refreshing":
      return "Refreshing";
    case "not_found":
      return "Not found";
    case "server_error":
      return "Server error";
    case "quote_failed":
      return "Quote failed";
    case "preflight_failed":
      return "Preflight failed";
    case "found":
      return "Unknown";
  }
}

function statusMessageForDiscovery(status: PrimitiveMarketStatus, phase: DiscoveryPhase): string {
  switch (status) {
    case "live":
      return "Active BTC market is live for primitive quote and mint preflight.";
    case "stale":
      return "This BTC market is no longer live for minting. Refresh or select a new active market.";
    case "expired":
      return "The selected BTC market has expired. Refresh or select a new active BTC market before trading primitives.";
    case "unknown":
      break;
  }

  switch (phase) {
    case "idle":
      return "Connect a Sui Testnet wallet to discover active BTC markets.";
    case "refreshing":
      return "Discovering active BTC markets on Predict server...";
    case "not_found":
      return "No active BTC Predict market found. Testnet may not currently expose a mintable BTC market.";
    case "server_error":
      return "Could not reach the Predict server. Check connectivity and try refreshing.";
    case "quote_failed":
      return "A BTC oracle was found, but quote validation failed. The oracle may not support the scanned strike range.";
    case "preflight_failed":
      return "A BTC oracle was found, but mint preflight validation failed.";
    case "found":
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
