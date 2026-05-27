import type { ReactNode, ButtonHTMLAttributes } from "react";

type ButtonVariant = "cta" | "outline" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  cta: "bg-cta rounded-full font-medium text-white shadow-cta",
  outline:
    "rounded-full border border-white/10 bg-white/[0.04] text-white/90 backdrop-blur hover:border-aqua-400/40 transition",
  ghost: "text-ink-mid hover:text-white transition",
};

export function Button({
  variant = "cta",
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const base = disabled ? "cta-disabled rounded-full" : VARIANT_CLASSES[variant];

  return (
    <button
      className={`${base} px-5 py-2.5 text-sm min-h-[44px] min-w-[44px] cursor-pointer ring-aqua ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
