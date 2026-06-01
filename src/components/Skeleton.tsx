interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`block animate-pulse bg-surfaceMuted ${className}`} />;
}
