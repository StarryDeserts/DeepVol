import type { ReactNode } from "react";

export type PillVariant =
  | "idle"
  | "active"
  | "pass"
  | "warn"
  | "fail"
  | "info"
  | "open"
  | "redeemed"
  | "expired"
  | "settled"
  | "failed"
  | "local";

type PillProps = {
  variant: PillVariant;
  children: ReactNode;
  className?: string;
};

export function Pill({ variant, children, className = "" }: PillProps) {
  return (
    <span className={`pill pill-${variant} ${className}`}>
      {children}
    </span>
  );
}
