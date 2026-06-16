import { useEffect } from "react";
import { useActiveBtcPredictMarket } from "@rangepilot/deepvol-trading-react";
import { formatTimestampMs } from "../lib/format";
import { FlagshipMarketCard } from "../components/markets/FlagshipMarketCard";
import { MarketStatusCard } from "../components/markets/MarketStatusCard";
import { MarketsFooter } from "../components/markets/MarketsFooter";
import { MarketsHeroSection } from "../components/markets/MarketsHeroSection";
import { MarketsTable } from "../components/markets/MarketsTable";

type Props = { navigate: (to: string) => void };

export function MarketsPage({ navigate }: Props) {
  const market = useActiveBtcPredictMarket();

  /* Scroll reveal */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        }),
      { threshold: 0.1 },
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const dotClass =
    market.status === "live"
      ? "dot-live"
      : market.status === "stale"
        ? "dot-stale"
        : market.status === "expired"
          ? "dot-expired"
          : "dot-unknown";

  const statusTextClass =
    market.status === "live"
      ? "status-live"
      : market.status === "stale"
        ? "status-stale"
        : market.status === "expired"
          ? "status-expired"
          : "status-unknown";

  const expiryDisplay = market.market?.expiry
    ? formatTimestampMs(market.market.expiry)
    : null;

  return (
    <>
      <MarketsHeroSection navigate={navigate} onRefresh={() => market.refresh()} />
      <MarketStatusCard
        isLoading={market.isLoading}
        statusLabel={market.statusLabel}
        dotClass={dotClass}
        expiryDisplay={expiryDisplay}
      />
      <FlagshipMarketCard
        navigate={navigate}
        statusLabel={market.statusLabel}
        dotClass={dotClass}
      />
      <MarketsTable
        navigate={navigate}
        isLoading={market.isLoading}
        statusLabel={market.statusLabel}
        dotClass={dotClass}
        statusTextClass={statusTextClass}
        expiryDisplay={expiryDisplay}
      />
      <MarketsFooter />
    </>
  );
}
