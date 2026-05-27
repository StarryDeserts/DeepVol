import { TabBar } from "../molecules/TabBar";
import type { MarketProduct } from "../../lib/productRoute";

type TradeTabsProps = {
  active: MarketProduct;
  onChange: (product: MarketProduct) => void;
  className?: string;
};

const TABS: { id: MarketProduct; label: string; featured?: boolean }[] = [
  { id: "MOVE", label: "MOVE", featured: true },
  { id: "UP", label: "UP" },
  { id: "DOWN", label: "DOWN" },
  { id: "RANGE", label: "RANGE" },
];

export function TradeTabs({ active, onChange, className = "" }: TradeTabsProps) {
  return <TabBar tabs={TABS} active={active} onChange={onChange} className={className} />;
}
