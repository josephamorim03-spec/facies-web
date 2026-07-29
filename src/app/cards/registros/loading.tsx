import { Skeleton } from "@/components/Skeleton";

export default function CadernoLoading() {
  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <div className="flex gap-2 rounded-control border border-edge bg-surface p-1">
          <Skeleton className="h-9 w-24 rounded-sm" />
          <Skeleton className="h-9 w-24 rounded-sm" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap justify-center gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-sm" />
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-sm" />
        <div className="flex justify-center gap-2">
          <Skeleton className="h-7 w-16 rounded-sm" />
          <Skeleton className="h-7 w-16 rounded-sm" />
        </div>
        <Skeleton className="h-9 w-full rounded-sm" />
        <Skeleton className="h-24 w-full rounded-sm" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-12 rounded-sm" />
          <Skeleton className="h-6 w-full rounded-sm" />
        </div>
        <Skeleton className="h-10 w-full rounded-sm" />
      </div>
    </div>
  );
}
