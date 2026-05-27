"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdaptiveScheduleGenerate,
  DirectedStudyListItem,
  getAdaptiveSchedule,
  getProfile,
  getStudyPerformanceSummary,
  getTurboAreaStats,
  listDirectedStudies,
  listReviewTasks,
  OperationalTurboAreaStats,
  ReviewTask,
  StudyPerformanceSummary,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { Area, PERIOD_SESSION_KEY, Period, ThemeListSort } from "../../desempenho/_lib/perfilShared";

type BackgroundLoadingState = {
  turbo: boolean;
  adaptive: boolean;
};

function todayLocalISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function useEstatisticasPageState() {
  const authTokenRef = useRef("");
  const [hydrated, setHydrated] = useState(false);

  const [pending, setPending] = useState<ReviewTask[]>([]);
  const [done, setDone] = useState<ReviewTask[]>([]);
  const [studies, setStudies] = useState<DirectedStudyListItem[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<StudyPerformanceSummary | null>(null);
  const [turboAreaStats, setTurboAreaStats] = useState<OperationalTurboAreaStats | null>(null);
  const [adaptiveTodayPlan, setAdaptiveTodayPlan] = useState<AdaptiveScheduleGenerate | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(200);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("geral");
  const [clickedAreas, setClickedAreas] = useState<Set<Area>>(new Set());
  const [themeSort, setThemeSort] = useState<ThemeListSort>("consistency");
  const [themeHelpArea, setThemeHelpArea] = useState<Area | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState<BackgroundLoadingState>({
    turbo: false,
    adaptive: false,
  });

  function changePeriod(nextPeriod: Period) {
    setPeriod(nextPeriod);
    if (nextPeriod !== "geral") {
      setClickedAreas(new Set());
      setThemeHelpArea(null);
    }
    try {
      sessionStorage.setItem(PERIOD_SESSION_KEY, nextPeriod);
    } catch {
      // ignore
    }
  }

  function handleBarClick(area: Area) {
    setClickedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) {
        next.delete(area);
      } else {
        next.add(area);
      }
      return next;
    });
  }

  useEffect(() => {
    const nextToken = getAuthToken();
    authTokenRef.current = nextToken;
    try {
      const stored = sessionStorage.getItem(PERIOD_SESSION_KEY) as Period | null;
      if (stored && (stored === "geral" || stored === "semanal" || stored === "mensal")) {
        setPeriod(stored);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!hydrated) {
      return;
    }
    const authToken = authTokenRef.current;
    setLoading(true);
    setError("");
    setBackgroundLoading({ turbo: true, adaptive: true });

    Promise.all([
      getProfile(authToken),
      listReviewTasks(authToken, { status: "pending" }),
      listReviewTasks(authToken, { status: "done" }),
      listDirectedStudies(authToken),
      getStudyPerformanceSummary(authToken),
    ])
      .then(([profile, pendingTasks, doneTasks, directedStudies, summary]) => {
        if (cancelled) return;
        setWeeklyGoal(profile.weekly_goal_questions);
        setDisplayName(profile.display_name ?? null);
        setPending(pendingTasks);
        setDone(doneTasks);
        setStudies(directedStudies);
        setPerformanceSummary(summary);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message ?? "Erro ao carregar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    getTurboAreaStats(authToken)
      .then((stats) => {
        if (cancelled) return;
        setTurboAreaStats(stats);
      })
      .catch(() => {
        if (cancelled) return;
        setTurboAreaStats(null);
      })
      .finally(() => {
        if (cancelled) return;
        setBackgroundLoading((prev) => ({ ...prev, turbo: false }));
      });

    getAdaptiveSchedule(authToken, todayLocalISO())
      .then((plan) => {
        if (cancelled) return;
        setAdaptiveTodayPlan(plan);
      })
      .catch(() => {
        if (cancelled) return;
        setAdaptiveTodayPlan(null);
      })
      .finally(() => {
        if (cancelled) return;
        setBackgroundLoading((prev) => ({ ...prev, adaptive: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const adaptiveWeek = useMemo(
    () => (adaptiveTodayPlan ? [adaptiveTodayPlan] : []),
    [adaptiveTodayPlan],
  );

  return {
    pending,
    done,
    studies,
    performanceSummary,
    turboAreaStats,
    loading,
    error,
    period,
    clickedAreas,
    themeSort,
    themeHelpArea,
    weeklyGoal,
    adaptiveWeek,
    displayName,
    isTurboLoading: backgroundLoading.turbo,
    isAdaptiveLoading: backgroundLoading.adaptive,
    setThemeSort,
    setThemeHelpArea,
    changePeriod,
    handleBarClick,
  };
}
