import type { ReactNode } from "react";
import { Button } from "@/components/atoms/Button";
import { Pill } from "@/components/atoms/Pill";
import { Label } from "@/components/atoms/Label";
import { DataPair } from "@/components/molecules/DataPair";

type SuccessVariant = "confirmed" | "local" | "failed";

type SuccessPanelProps = {
  variant: SuccessVariant;
  title: string;
  message: string;
  digest?: string;
  details?: { label: string; value: ReactNode }[];
  onViewPortfolio?: () => void;
  onDismiss?: () => void;
  className?: string;
};

const ICONS: Record<SuccessVariant, ReactNode> = {
  confirmed: (
    <div className="grid place-items-center w-16 h-16 rounded-full mx-auto" style={{ background: "rgba(108,242,194,.12)", border: "1px solid rgba(108,242,194,.3)" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6CF2C2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </div>
  ),
  local: (
    <div className="grid place-items-center w-16 h-16 rounded-full mx-auto" style={{ background: "rgba(247,185,85,.12)", border: "1px solid rgba(247,185,85,.3)" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F7B955" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4M12 17h.01" />
      </svg>
    </div>
  ),
  failed: (
    <div className="grid place-items-center w-16 h-16 rounded-full mx-auto" style={{ background: "rgba(255,107,107,.12)", border: "1px solid rgba(255,107,107,.3)" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    </div>
  ),
};

const PILL_VARIANT: Record<SuccessVariant, "pass" | "warn" | "fail"> = {
  confirmed: "pass",
  local: "warn",
  failed: "fail",
};

export function SuccessPanel({
  variant,
  title,
  message,
  digest,
  details = [],
  onViewPortfolio,
  onDismiss,
  className = "",
}: SuccessPanelProps) {
  return (
    <div className={`text-center ${className}`}>
      {ICONS[variant]}

      <div className="mt-4">
        <Pill variant={PILL_VARIANT[variant]}>{variant}</Pill>
      </div>

      <h3 className="font-display text-xl text-white mt-3">{title}</h3>
      <p className="text-sm text-ink-mid mt-2 max-w-sm mx-auto">{message}</p>

      {digest && (
        <div className="mt-3">
          <Label>Transaction digest</Label>
          <div className="font-mono text-xs text-ink-mid mt-1">{digest}</div>
        </div>
      )}

      {details.length > 0 && (
        <div className="mt-5 glass-inner p-4 text-left grid grid-cols-2 gap-3">
          {details.map((d) => (
            <DataPair key={d.label} label={d.label} value={d.value} mono />
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-3">
        {onViewPortfolio && (
          <Button variant="cta" onClick={onViewPortfolio}>View portfolio</Button>
        )}
        {onDismiss && (
          <Button variant="outline" onClick={onDismiss}>Dismiss</Button>
        )}
      </div>
    </div>
  );
}
