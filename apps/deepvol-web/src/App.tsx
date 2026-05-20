import { AppShell } from "./components/AppShell";
import { BuyMovePage } from "./routes/BuyMovePage";
import { MarketsPage } from "./routes/MarketsPage";
import { PortfolioPage } from "./routes/PortfolioPage";

export function App() {
  const path = window.location.pathname;

  return (
    <AppShell currentPath={path}>
      {renderRoute(path)}
    </AppShell>
  );
}

function renderRoute(path: string) {
  if (path === "/" || path === "/markets") {
    return <MarketsPage />;
  }

  if (path === "/buy/btc-move") {
    return <BuyMovePage />;
  }

  if (path === "/portfolio") {
    return <PortfolioPage />;
  }

  return (
    <section className="card notFoundCard">
      <div className="eyebrow">Route not found</div>
      <h1>DeepVol page unavailable</h1>
      <p>The DeepVol MVP scaffold includes Markets, Buy BTC MOVE, and Portfolio routes.</p>
      <a className="primaryLink" href="/markets">Back to markets</a>
    </section>
  );
}
