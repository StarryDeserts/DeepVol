type SpinnerProps = {
  size?: "sm" | "lg";
  className?: string;
};

export function Spinner({ size = "sm", className = "" }: SpinnerProps) {
  return (
    <span
      className={`spinner ${size === "lg" ? "spinner-lg" : ""} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
