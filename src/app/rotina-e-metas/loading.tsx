import { Skeleton } from "@/components/Skeleton";

export default function RotinaEMetasLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28 rounded-sm" />
        <Skeleton className="h-8 w-24 rounded-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-sm" />
        ))}
      </div>
      <div className="space-y-3 rounded-sm border border-edge p-4">
        <Skeleton className="h-4 w-36 rounded-sm" />
        <Skeleton className="h-32 w-full rounded-sm" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-sm" />
        ))}
      </div>
    </div>
  );
}

