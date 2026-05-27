import type { ReactNode } from "react";
import { Chip } from "../atoms/Chip";
import { Label } from "../atoms/Label";
import type { MarketProduct } from "../../lib/productRoute";

type ProductCardProps = {
  product: MarketProduct;
  title: string;
  description: string;
  featured?: boolean;
  icon: ReactNode;
  stats?: { label: string; value: string }[];
  onClick?: () => void;
  className?: string;
};

const PRODUCT_COLORS: Record<MarketProduct, string> = {
  MOVE: "text-seafoam-400",
  UP: "text-aqua-400",
  DOWN: "text-coral-400",
  RANGE: "text-iris-500",
};

export function ProductCard({
  product,
  title,
  description,
  featured = false,
  icon,
  stats = [],
  onClick,
  className = "",
}: ProductCardProps) {
  return (
    <article
      className={`glass p-6 relative overflow-hidden cursor-pointer ${
        featured ? "featured-accent" : ""
      } ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="icon-ring p-3">
          <span className={PRODUCT_COLORS[product]}>{icon}</span>
        </div>
        <Chip highlight={featured}>{product}</Chip>
      </div>

      <h3 className="font-display text-xl text-white mt-4">{title}</h3>
      <p className="text-sm text-ink-mid mt-2 leading-relaxed">{description}</p>

      {stats.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label}>
              <Label>{s.label}</Label>
              <div className="font-mono text-sm text-white mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
