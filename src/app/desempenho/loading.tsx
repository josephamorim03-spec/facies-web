import { Skeleton } from "@/components/Skeleton";

export default function DesempenhoLoading() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-7 w-40 rounded-control" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-edge p-4 space-y-3 rounded-surface">
            <Skeleton className="h-4 w-24 rounded-control" />
            <Skeleton className="h-8 w-12 rounded-control" />
            <Skeleton className="h-3 w-full rounded-control" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-surface" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-edge">
            <Skeleton className="h-4 w-4 rounded-control shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/5 rounded-control" />
              <Skeleton className="h-2.5 w-24 rounded-control" />
            </div>
            <Skeleton className="h-6 w-14 rounded-control shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
