import { Skeleton } from "@/components/Skeleton";

export default function RevisoesLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-sm" />
        <Skeleton className="h-8 w-28 rounded-sm" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-sm" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-sm border border-edge p-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-sm" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3 rounded-sm" />
              <Skeleton className="h-2.5 w-1/2 rounded-sm" />
            </div>
            <Skeleton className="h-7 w-16 shrink-0 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

