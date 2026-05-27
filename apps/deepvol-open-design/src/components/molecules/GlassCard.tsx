import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  featured?: boolean;
  className?: string;
};

export function GlassCard({ children, featured = false, className = "" }: GlassCardProps) {
  return (
    <div className={`glass p-6 lg:p-8 relative overflow-hidden ${featured ? "featured-accent" : ""} ${className}`}>
      {children}
    </div>
  );
}
