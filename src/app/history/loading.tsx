import { Skeleton } from "@/components/Skeleton";

export default function HistoryLoading() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-7 w-32 rounded-sm" />
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-12 rounded-sm" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-edge p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-1/3 rounded-sm" />
              <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-2/3 rounded-sm" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-14 rounded-sm" />
              <Skeleton className="h-5 w-14 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
