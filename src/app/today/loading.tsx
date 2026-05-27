import { Skeleton } from "@/components/Skeleton";

export default function TodayLoading() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-7 w-48 rounded-sm" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-edge p-4 space-y-2 rounded-lg">
            <Skeleton className="h-3 w-24 rounded-sm" />
            <Skeleton className="h-8 w-14 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border border-edge p-3 rounded-lg">
            <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-2/3 rounded-sm" />
              <Skeleton className="h-2.5 w-1/3 rounded-sm" />
            </div>
            <Skeleton className="h-6 w-12 rounded-sm shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
