import type { ReactNode } from "react";

type ToastVariant = "pass" | "warn" | "fail" | "info";

type ToastProps = {
  variant: ToastVariant;
  children: ReactNode;
  className?: string;
};

const ICON_MAP: Record<ToastVariant, ReactNode> = {
  pass: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-seafoam-400 shrink-0 mt-0.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  warn: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0 mt-0.5">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  fail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-coral-400 shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aqua-400 shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
};

export function Toast({ variant, children, className = "" }: ToastProps) {
  return (
    <div className={`toast toast-${variant} ${className}`} role="alert">
      {ICON_MAP[variant]}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}
