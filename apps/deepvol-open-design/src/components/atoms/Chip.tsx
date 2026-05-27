import type { ReactNode } from "react";

type ChipProps = {
  children: ReactNode;
  highlight?: boolean;
  className?: string;
};

export function Chip({ children, highlight = false, className = "" }: ChipProps) {
  return (
    <span
      className={`chip ${highlight ? "text-aqua-400 border-aqua-400/25 bg-aqua-400/[0.06]" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
