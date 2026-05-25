import { useCallback, useMemo, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import type { VolSeries } from "@rangepilot/types/deepVol";
import type { PrimitiveActiveMarketContext } from "@rangepilot/types/deepbookPredict";
import { readVolSeries } from "../lib/deepVolSeries";
import { DEEPVOL_STORAGE_KEYS } from "../lib/constants";

export type MoveSeriesStatus = "ready" | "stale" | "missing" | "loading" | "idle";

export type ActiveBtcMoveSeriesController = {
  series: VolSeries | null;
  seriesId: string | null;
  status: MoveSeriesStatus;
  statusLabel: string;
  statusMessage: string;
  blockers: string[];
  isLoading: boolean;
  setSeriesId: (id: string | null) => void;
};

export function useActiveBtcMoveSeries(
  activeMarket: PrimitiveActiveMarketContext | null,
): ActiveBtcMoveSeriesController {
  const client = useSuiClient();
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(() => loadStoredSeriesId());

  const seriesQuery = useQuery({
    queryKey: ["vol-series", selectedSeriesId],
    enabled: Boolean(selectedSeriesId),
    queryFn: () => readVolSeries(client, selectedSeriesId!),
    retry: 1,
  });

  const setSeriesId = useCallback((id: string | null) => {
    setSelectedSeriesId(id);
    storeSeriesId(id);
  }, []);

  const { status, blockers } = useMemo(() => {
    if (!activeMarket) {
      return { status: "idle" as MoveSeriesStatus, blockers: ["Discover an active BTC market first."] };
    }

    if (!selectedSeriesId) {
      return {
        status: "missing" as MoveSeriesStatus,
        blockers: ["No BTC MOVE series selected. Create or select a series for the active BTC market."],
      };
    }

    if (seriesQuery.isLoading) {
      return { status: "loading" as MoveSeriesStatus, blockers: [] };
    }

    const series = seriesQuery.data;

    if (!series) {
      return {
        status: "missing" as MoveSeriesStatus,
        blockers: ["Selected VolSeries could not be loaded from Sui Testnet."],
      };
    }

    if (series.oracleId !== activeMarket.oracleId || series.expiry !== activeMarket.expiry) {
      return {
        status: "stale" as MoveSeriesStatus,
        blockers: [
          `Selected VolSeries (oracle ${series.oracleId.slice(0, 10)}…, expiry ${series.expiry}) does not match the active BTC market (oracle ${activeMarket.oracleId.slice(0, 10)}…, expiry ${activeMarket.expiry}). Create a fresh series.`,
        ],
      };
    }

    if (!series.active) {
      return {
        status: "stale" as MoveSeriesStatus,
        blockers: ["Selected VolSeries has been deactivated."],
      };
    }

    if (BigInt(series.lowerStrike) >= BigInt(series.upperStrike)) {
      return {
        status: "stale" as MoveSeriesStatus,
        blockers: ["Selected VolSeries has invalid strike ordering (lower >= upper)."],
      };
    }

    return { status: "ready" as MoveSeriesStatus, blockers: [] };
  }, [activeMarket, selectedSeriesId, seriesQuery.isLoading, seriesQuery.data]);

  return {
    series: seriesQuery.data ?? null,
    seriesId: selectedSeriesId,
    status,
    statusLabel: moveSeriesStatusLabel(status),
    statusMessage: moveSeriesStatusMessage(status, blockers),
    blockers,
    isLoading: seriesQuery.isLoading,
    setSeriesId,
  };
}

function moveSeriesStatusLabel(status: MoveSeriesStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "stale":
      return "Stale";
    case "missing":
      return "Missing";
    case "loading":
      return "Loading";
    case "idle":
      return "Idle";
  }
}

function moveSeriesStatusMessage(status: MoveSeriesStatus, blockers: string[]): string {
  if (blockers.length > 0) return blockers[0];

  switch (status) {
    case "ready":
      return "BTC MOVE series matches the active BTC market.";
    case "stale":
      return "Selected series does not match the active market.";
    case "missing":
      return "No BTC MOVE series selected.";
    case "loading":
      return "Loading VolSeries from Sui Testnet...";
    case "idle":
      return "Discover an active BTC market first.";
  }
}

function loadStoredSeriesId(): string | null {
  try {
    const raw = localStorage.getItem(DEEPVOL_STORAGE_KEYS.createdSeries);

    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return typeof parsed.seriesId === "string" ? parsed.seriesId : null;
  } catch {
    return null;
  }
}

function storeSeriesId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(DEEPVOL_STORAGE_KEYS.createdSeries, JSON.stringify({ seriesId: id }));
    } else {
      localStorage.removeItem(DEEPVOL_STORAGE_KEYS.createdSeries);
    }
  } catch {
    // localStorage may be unavailable
  }
}
