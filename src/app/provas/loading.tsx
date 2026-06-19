import { Skeleton } from "@/components/Skeleton";

export default function ProvasLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32 rounded-sm" />
        <Skeleton className="h-3 w-64 max-w-full rounded-sm" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-sm border border-edge p-4">
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-3 w-full rounded-sm" />
            <Skeleton className="h-3 w-4/5 rounded-sm" />
            <Skeleton className="h-8 w-full rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

