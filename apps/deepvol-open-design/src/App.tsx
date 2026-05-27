import { useState, useEffect, useCallback } from "react";
import { AppShell } from "./components/shell/AppShell";
import { LandingPage } from "./routes/LandingPage";
import { MarketsPage } from "./routes/MarketsPage";
import { BtcMarketPage } from "./routes/BtcMarketPage";
import { PortfolioPage } from "./routes/PortfolioPage";
import { productFromSearch } from "./lib/productRoute";
import type { MarketProduct } from "./lib/productRoute";

type Route =
  | { page: "landing" }
  | { page: "markets" }
  | { page: "btc-market"; product: MarketProduct }
  | { page: "portfolio" };

function parseRoute(pathname: string, search: string): Route {
  if (pathname === "/markets/btc" || pathname === "/markets/btc/") {
    return { page: "btc-market", product: productFromSearch(search) };
  }
  if (pathname === "/buy/btc-move" || pathname === "/buy/btc-move/") {
    return { page: "btc-market", product: "MOVE" };
  }
  if (pathname === "/primitives" || pathname === "/primitives/") {
    const params = new URLSearchParams(search);
    const type = (params.get("type") ?? "").toUpperCase();
    const product: MarketProduct = type === "UP" || type === "DOWN" || type === "RANGE" ? type : "UP";
    return { page: "btc-market", product };
  }
  if (pathname === "/markets" || pathname === "/markets/") {
    return { page: "markets" };
  }
  if (pathname === "/portfolio" || pathname === "/portfolio/") {
    return { page: "portfolio" };
  }
  return { page: "landing" };
}

export function App() {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.pathname, window.location.search),
  );

  const navigate = useCallback((to: string) => {
    const url = new URL(to, window.location.origin);
    window.history.pushState(null, "", url.pathname + url.search);
    setRoute(parseRoute(url.pathname, url.search));
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    function handlePopState() {
      setRoute(parseRoute(window.location.pathname, window.location.search));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const currentPath =
    route.page === "landing"
      ? "/"
      : route.page === "markets"
        ? "/markets"
        : route.page === "btc-market"
          ? "/markets/btc"
          : "/portfolio";

  return (
    <AppShell currentPath={currentPath} onNavigate={navigate}>
      {route.page === "landing" && <LandingPage navigate={navigate} />}
      {route.page === "markets" && <MarketsPage navigate={navigate} />}
      {route.page === "btc-market" && (
        <BtcMarketPage navigate={navigate} defaultProduct={route.product} />
      )}
      {route.page === "portfolio" && <PortfolioPage navigate={navigate} />}
    </AppShell>
  );
}
