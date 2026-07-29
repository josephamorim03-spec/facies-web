import { WeeklyOpsFullCardsSkeleton } from "@/app/cronograma/_components/WeeklyOpsCards";
import { Skeleton } from "@/components/Skeleton";
import { TodayDaySummarySkeleton } from "./TodayDaySummary";

export function TodayPageSkeleton() {
  return (
    <div className="space-y-5 md:space-y-8">
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-44 rounded-sm" />
        <Skeleton className="h-3.5 w-52 rounded-sm" />
      </div>
      <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div key={`week-sk-${idx}`} className="flex flex-col items-center gap-1.5">
                <Skeleton className="h-2.5 w-6 rounded-sm" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-1.5 w-6 rounded-sm" />
              </div>
            ))}
          </div>
          <WeeklyOpsFullCardsSkeleton />
          <TodayDaySummarySkeleton />
          <hr className="border-edge" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`task-sk-${idx}`} className="flex items-center gap-3 border-b border-edge py-3 pl-3">
                <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/5 rounded-sm" />
                  <Skeleton className="h-2.5 w-24 rounded-sm" />
                </div>
                <Skeleton className="h-7 w-16 shrink-0 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-lg border border-edge bg-surface p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-6 w-36 rounded-sm" />
              <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
            <div className="mt-5 flex items-center gap-5">
              <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
              <div className="flex-1 space-y-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={`prog-sk-${idx}`} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3 w-16 rounded-sm" />
                    <Skeleton className="h-6 w-10 rounded-sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-edge bg-surface p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-6 w-32 rounded-sm" />
              <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
            <Skeleton className="mt-4 h-3 w-40 rounded-sm" />
            <div className="mt-3 flex items-center gap-4">
              <Skeleton className="h-3 flex-1 rounded-full" />
              <Skeleton className="h-3 w-16 shrink-0 rounded-sm" />
            </div>
            <Skeleton className="mt-3 h-3 w-28 rounded-sm" />
          </div>
          <div className="rounded-lg border border-edge bg-surface p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-6 w-48 rounded-sm" />
              <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
            <div className="mt-5 space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`area-sk-${idx}`} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-32 rounded-sm" />
                    <Skeleton className="h-3 w-8 rounded-sm" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
