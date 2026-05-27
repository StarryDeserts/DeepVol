type SkeletonBlockProps = {
  width?: string;
  height?: string;
  className?: string;
};

export function SkeletonBlock({
  width = "100%",
  height = "16px",
  className = "",
}: SkeletonBlockProps) {
  return (
    <div
      className={`skel ${className}`}
      style={{ width, height }}
      role="status"
      aria-label="Loading"
    />
  );
}
