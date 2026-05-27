import { useCallback, useMemo, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import type { VolSeries } from "@rangepilot/types/deepVol";
import type { PrimitiveActiveMarketContext } from "@rangepilot/types/deepbookPredict";
import { readVolSeries } from "../lib/deepVolSeries";
import { DEEPVOL_STORAGE_KEYS } from "../lib/constants";
import { classifyMoveSeriesMintability } from "../lib/moveSeriesMintability";

export type MoveSeriesStatus = "ready" | "stale" | "missing" | "loading" | "idle" | "validationRequired" | "nonMintable";

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
  mintabilityInput: { quantity: string; predictManagerId: string | null } | null = null,
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

    if (activeMarket.status !== "live") {
      return {
        status: "stale" as MoveSeriesStatus,
        blockers: ["Active BTC market must be live before this VolSeries can be used for a new buy."],
      };
    }

    if (!series.active) {
      return {
        status: "stale" as MoveSeriesStatus,
        blockers: ["Selected VolSeries has been deactivated."],
      };
    }

    if (BigInt(series.expiry) <= BigInt(Date.now())) {
      return {
        status: "stale" as MoveSeriesStatus,
        blockers: ["Selected VolSeries has expired."],
      };
    }

    if (BigInt(series.lowerStrike) >= BigInt(series.upperStrike)) {
      return {
        status: "stale" as MoveSeriesStatus,
        blockers: ["Selected VolSeries has invalid strike ordering (lower >= upper)."],
      };
    }

    const mintabilityStatus = classifyMoveSeriesMintability({
      seriesId: selectedSeriesId,
      oracleId: series.oracleId,
      expiry: series.expiry,
      lowerStrike: series.lowerStrike,
      upperStrike: series.upperStrike,
      quantity: mintabilityInput?.quantity,
      predictManagerId: mintabilityInput?.predictManagerId,
    });

    if (mintabilityStatus.status === "passedRecent") {
      return { status: "ready" as MoveSeriesStatus, blockers: [] };
    }

    if (mintabilityStatus.status === "nonMintable") {
      return {
        status: "nonMintable" as MoveSeriesStatus,
        blockers: [mintabilityStatus.record.message ?? "Selected BTC MOVE series is not mintable for the current market."],
      };
    }

    return {
      status: "validationRequired" as MoveSeriesStatus,
      blockers: ["Series found, validation required. Validate a mintable BTC MOVE range before buying."],
    };
  }, [activeMarket, selectedSeriesId, seriesQuery.isLoading, seriesQuery.data, mintabilityInput?.quantity, mintabilityInput?.predictManagerId]);

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
    case "validationRequired":
      return "Validation required";
    case "nonMintable":
      return "Non-mintable";
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
    case "validationRequired":
      return "Series found, validation required.";
    case "nonMintable":
      return "Selected BTC MOVE series is not mintable for the current market.";
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
