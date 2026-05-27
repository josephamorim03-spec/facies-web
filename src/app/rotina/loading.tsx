import { Skeleton } from "@/components/Skeleton";

export default function RotinaLoading() {
  return (
    <div className="space-y-6 p-4">
      <Skeleton className="h-7 w-40 rounded-sm" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-edge p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-1/3 rounded-sm" />
              <Skeleton className="h-6 w-16 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-1/2 rounded-sm" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-sm" />
    </div>
  );
}
