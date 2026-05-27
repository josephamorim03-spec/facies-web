import { Skeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-sm" />
          <Skeleton className="h-4 w-64 rounded-sm" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-edge p-4 space-y-3">
              <Skeleton className="h-4 w-24 rounded-sm" />
              <Skeleton className="h-8 w-12 rounded-sm" />
              <Skeleton className="h-3 w-full rounded-sm" />
              <Skeleton className="h-3 w-3/4 rounded-sm" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-edge p-4 space-y-3">
          <Skeleton className="h-5 w-32 rounded-sm" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-edge last:border-0">
                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/5 rounded-sm" />
                  <Skeleton className="h-2.5 w-24 rounded-sm" />
                </div>
                <Skeleton className="h-6 w-14 rounded-sm shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
