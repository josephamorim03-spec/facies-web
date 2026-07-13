interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div aria-hidden="true" className={`paper-skeleton block ${className}`} />;
}
