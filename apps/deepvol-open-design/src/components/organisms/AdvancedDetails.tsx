import type { ReactNode } from "react";
import { DataPair } from "../molecules/DataPair";

type DetailEntry = {
  label: string;
  value: ReactNode;
};

type AdvancedDetailsProps = {
  entries: DetailEntry[];
  className?: string;
};

export function AdvancedDetails({ entries, className = "" }: AdvancedDetailsProps) {
  if (entries.length === 0) return null;

  return (
    <details className={`glass-inner p-4 ${className}`}>
      <summary className="flex items-center justify-between cursor-pointer min-h-[44px]">
        <span className="label">Advanced details</span>
        <svg
          className="chev text-ink-mid"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {entries.map((entry) => (
          <DataPair key={entry.label} label={entry.label} value={entry.value} mono />
        ))}
      </div>
    </details>
  );
}
