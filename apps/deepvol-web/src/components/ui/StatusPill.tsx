import type { ReactNode } from "react";

type StatusPillTone = "neutral" | "success" | "warning" | "danger" | "info";

type StatusPillProps = {
  tone?: StatusPillTone;
  children: ReactNode;
};

export function StatusPill({ tone = "neutral", children }: StatusPillProps) {
  return <span className={`statusPill statusPill-${tone}`}>{children}</span>;
}
