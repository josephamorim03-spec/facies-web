import { Skeleton } from "@/components/Skeleton";

export default function CadernoLoading() {
  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16 rounded-sm" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-sm" />
          <Skeleton className="h-7 w-20 rounded-sm" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:justify-center">
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
