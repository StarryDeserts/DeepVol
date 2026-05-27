import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className = "", id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`input ring-aqua ${error ? "border-coral-400/50" : ""} ${className}`}
        {...rest}
      />
      {error && (
        <span className="text-coral-400 text-xs font-mono">{error}</span>
      )}
    </div>
  );
}
