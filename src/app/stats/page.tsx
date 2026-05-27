"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuthToken } from "@/lib/useAuthToken";
import { getProfile, listReviewTasks, ReviewTask, UserProfile } from "@/lib/api";
import AreaDot from "@/components/AreaDot";
import { Skeleton } from "@/components/Skeleton";

type Area = "GO" | "PD" | "MP" | "CG" | "CM" | "OU";
const AREAS: Area[] = ["GO", "PD", "MP", "CG", "CM", "OU"];

type AreaStats = { pending: number; done: number };

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-28 rounded-sm" />
      <div className="border border-edge p-4 space-y-3">
        <Skeleton className="h-4 w-24 rounded-sm" />
        <Skeleton className="h-12 w-16 rounded-sm" />
        <Skeleton className="h-3 w-full rounded-sm" />
        <Skeleton className="h-3 w-20 rounded-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {AREAS.map((area) => (
          <div key={area} className="border border-edge p-3 space-y-2">
            <Skeleton className="h-3 w-12 rounded-sm" />
            <Skeleton className="h-7 w-8 rounded-sm" />
            <Skeleton className="h-2 w-full rounded-sm" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-edge p-3 space-y-2">
          <Skeleton className="h-8 w-10 mx-auto rounded-sm" />
          <Skeleton className="h-3 w-16 mx-auto rounded-sm" />
        </div>
        <div className="border border-edge p-3 space-y-2">
          <Skeleton className="h-8 w-10 mx-auto rounded-sm" />
          <Skeleton className="h-3 w-16 mx-auto rounded-sm" />
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { token, tokenResolved } = useAuthToken();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pending, setPending] = useState<ReviewTask[]>([]);
  const [done, setDone] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tokenResolved) return;
    let cancelled = false;

    async function loadStats() {
      try {
        const [profileData, pendingTasks, doneTasks] = await Promise.all([
          getProfile(token),
          listReviewTasks(token, { status: "pending" }),
          listReviewTasks(token, { status: "done" }),
        ]);
        if (cancelled) return;
        setProfile(profileData);
        setPending(pendingTasks);
        setDone(doneTasks);
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e, "Erro ao carregar."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [token, tokenResolved]);

  if (loading) return <StatsSkeleton />;

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-serif">Progresso</h1>
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const goal = profile?.weekly_goal_questions ?? 200;
  const pct = Math.min(100, Math.round((done.length / Math.max(1, goal)) * 100));

  const byArea: Record<Area, AreaStats> = Object.fromEntries(
    AREAS.map((area) => [area, { pending: 0, done: 0 }]),
  ) as Record<Area, AreaStats>;

  pending.forEach((task) => {
    if (task.area in byArea) byArea[task.area as Area].pending += 1;
  });
  done.forEach((task) => {
    if (task.area in byArea) byArea[task.area as Area].done += 1;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif">Progresso</h1>

      <div className="border border-edge p-4 space-y-3">
        <h2 className="text-xs text-muted uppercase tracking-wide">Meta Semanal</h2>
        <p className="text-5xl font-serif text-ink leading-none">{pct}%</p>
        <div className="h-3 bg-edge rounded-full overflow-hidden">
          <div
            className="h-full bg-ink transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted">{done.length} de {goal} revisões</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs text-muted uppercase tracking-wide">Por área</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {AREAS.map((area) => {
            const stats = byArea[area];
            const total = stats.pending + stats.done;
            const areaPct = total > 0 ? Math.round((stats.done / total) * 100) : 0;
            return (
              <div key={area} className="border border-edge p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <AreaDot area={area} size="md" />
                  <span className="text-xs text-muted uppercase tracking-wide">{area}</span>
                </div>
                <p className="text-2xl font-serif text-ink leading-none">{total}</p>
                <p className="text-xs text-muted">{stats.pending} pend. - {stats.done} feitas</p>
                <div className="h-0.5 bg-edge mt-1">
                  <div className="h-full bg-ink" style={{ width: `${areaPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs text-muted uppercase tracking-wide">Fila</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Pendentes", value: pending.length },
            { label: "Feitas", value: done.length },
          ].map(({ label, value }) => (
            <div key={label} className="border border-edge p-4 text-center">
              <p className="text-3xl font-serif text-ink leading-none">{value}</p>
              <p className="text-xs text-muted uppercase tracking-wide mt-2">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
