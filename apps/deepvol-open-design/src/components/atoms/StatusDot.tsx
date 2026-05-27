export type DotVariant =
  | "live"
  | "active"
  | "stale"
  | "warn"
  | "fail"
  | "expired"
  | "idle"
  | "unknown";

type StatusDotProps = {
  variant: DotVariant;
  className?: string;
};

export function StatusDot({ variant, className = "" }: StatusDotProps) {
  return <span className={`dot dot-${variant} ${className}`} />;
}

export function PulseDot({ className = "" }: { className?: string }) {
  return <span className={`pulse-dot ${className}`} />;
}
