import type { ReactNode } from "react";

export type GateVariant = "pass" | "fail" | "warn" | "idle" | "active";

type GateProps = {
  variant: GateVariant;
  label: string;
  detail?: ReactNode;
  className?: string;
};

const GATE_ICONS: Record<GateVariant, ReactNode> = {
  pass: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  fail: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  warn: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  idle: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  active: (
    <span className="spinner" style={{ width: 11, height: 11, borderWidth: 2 }} />
  ),
};

export function Gate({ variant, label, detail, className = "" }: GateProps) {
  return (
    <div className={`gate ${className}`}>
      <div className={`gate-icon gate-${variant}`}>
        {GATE_ICONS[variant]}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-ink-hi">{label}</span>
        {detail && <div className="text-xs text-ink-low mt-0.5">{detail}</div>}
      </div>
    </div>
  );
}
