import type { ReactNode } from "react";

type GlassInnerProps = {
  children: ReactNode;
  className?: string;
};

export function GlassInner({ children, className = "" }: GlassInnerProps) {
  return (
    <div className={`glass-inner p-4 ${className}`}>
      {children}
    </div>
  );
}
