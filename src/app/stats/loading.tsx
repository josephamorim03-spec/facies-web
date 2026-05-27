import { Skeleton } from "@/components/Skeleton";

export default function StatsLoading() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-7 w-36 rounded-sm" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-edge p-4 space-y-2 rounded-lg">
            <Skeleton className="h-3 w-20 rounded-sm" />
            <Skeleton className="h-8 w-12 rounded-sm" />
          </div>
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-edge">
            <Skeleton className="h-3 w-3/5 rounded-sm" />
            <Skeleton className="h-2.5 w-16 rounded-sm ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
