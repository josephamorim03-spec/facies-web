"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuthToken } from "@/lib/useAuthToken";
import { api, authHeader } from "@/lib/api";
import AreaDot from "@/components/AreaDot";
import { Skeleton } from "@/components/Skeleton";

type Area = "GO" | "PD" | "MP" | "CG" | "CM" | "OU";

type StudyEntry = {
  study_id: string;
  area: string;
  theme: string;
  total_questions: number;
  correct_questions: number;
  user_weight: number;
  performed_at: string;
  accuracy: number;
};

const WEIGHT_LABEL: Record<number, string> = { 1: "Baixo", 2: "Normal", 3: "Alto" };

export default function HistoryPage() {
  const { token, tokenResolved } = useAuthToken();
  const [studies, setStudies] = useState<StudyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!tokenResolved) return;
    let cancelled = false;

    async function loadHistory() {
      try {
        const data = await api<StudyEntry[]>("/api/studies/directed", {
          headers: authHeader(token),
        });
        if (!cancelled) setStudies(data);
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e, "Erro ao carregar."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [token, tokenResolved]);

  const filtered = filter === "all" ? studies : studies.filter((s) => s.area === filter);

  const AREAS: Area[] = ["GO", "PD", "MP", "CG", "CM", "OU"];

  function fmtDate(iso: string) {
    const s = iso.slice(0, 10);
    return `${s.slice(8, 10)}-${s.slice(5, 7)}-${s.slice(0, 4)}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif">Histórico</h1>

      {/* Area filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          className={`text-xs border px-2 py-1 ${filter === "all" ? "border-ink" : "border-edge text-muted"}`}
          onClick={() => setFilter("all")}
        >
          Todas
        </button>
        {AREAS.map((a) => (
          <button
            key={a}
            className={`flex items-center gap-1 text-xs border px-2 py-1 ${filter === a ? "border-ink" : "border-edge text-muted"}`}
            onClick={() => setFilter(a)}
          >
            <AreaDot area={a} />
            {a}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-4" aria-busy="true">
          {/* Area filter skeleton */}
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-14 rounded-sm" />
            ))}
          </div>
          {/* List items skeleton */}
          <ul className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3 py-3 border-b border-edge last:border-0">
                <Skeleton className="h-5 w-5 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/5 rounded-sm" />
                  <Skeleton className="h-3 w-2/5 rounded-sm" />
                </div>
                <Skeleton className="h-3 w-16 rounded-sm shrink-0 mt-1" />
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-muted">
          {studies.length === 0
            ? "Nenhum estudo registrado ainda."
            : "Nenhum estudo nessa área."}
        </p>
      )}

      <ul className="space-y-0">
        {filtered.map((s) => (
          <li
            key={s.study_id}
            className="flex items-start gap-3 py-3 border-b border-edge last:border-0"
          >
            <AreaDot area={s.area as Area} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">{s.theme}</p>
              <p className="text-xs text-muted">
                {s.area} · {s.correct_questions}/{s.total_questions}q · {s.accuracy}% ·{" "}
                {WEIGHT_LABEL[s.user_weight] ?? s.user_weight}
              </p>
            </div>
            <span className="text-xs text-muted shrink-0">{fmtDate(s.performed_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
