export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`bg-line block animate-pulse ${className}`}
    />
  );
}
