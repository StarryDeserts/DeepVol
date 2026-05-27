import type { ReactNode } from "react";

type DataPairProps = {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
};

export function DataPair({ label, value, mono = false, className = "" }: DataPairProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="label">{label}</span>
      <span className={`text-sm text-ink-hi ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
