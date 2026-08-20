import { Skeleton } from "@/components/Skeleton";

export default function CronogramaLoading() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-7 w-36 rounded-control" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-edge p-4 space-y-3 rounded-surface">
            <Skeleton className="h-4 w-3/4 rounded-control" />
            <Skeleton className="h-3 w-full rounded-control" />
            <Skeleton className="h-3 w-1/2 rounded-control" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-16 rounded-control" />
              <Skeleton className="h-6 w-16 rounded-control" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
