"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/error-utils";
import {
  getProfile,
  getReviewAgenda,
  listReviewTasks,
  listDirectedStudies,
  listEvents,
  listScheduleSuggestions,
  triggerScheduleSuggestion,
  getOperationalStreak,
  getOperationalTurboSessionDailyCompletedCards,
  acceptScheduleSuggestionItem,
  acceptScheduleSuggestionAll,
  rejectScheduleSuggestion,
  ReviewTask,
  DirectedStudyListItem,
  CalendarEventOut,
  OperationalStreak,
  ScheduleSuggestion,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

const STREAK_STALE_MS = 5 * 60 * 1000;

export type QuestionPracticeSummary = {
  count: number;
  generated_at: string | null;
};

const EMPTY_QUESTION_PRACTICE: QuestionPracticeSummary = {
  count: 0,
  generated_at: null,
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStreakFetchErrorInfo(err: unknown): { status: number | null; message: string } {
  const status =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : null;
  const message =
    typeof (err as { message?: unknown })?.message === "string"
      ? String((err as { message: string }).message)
      : "unknown_error";
  return { status, message };
}

export function useCronogramaPageState() {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [doneTasks, setDoneTasks] = useState<ReviewTask[]>([]);
  const [studies, setStudies] = useState<DirectedStudyListItem[]>([]);
  const [events, setEvents] = useState<CalendarEventOut[]>([]);
  const [turboCardsByDate, setTurboCardsByDate] = useState<Record<string, number>>({});
  const [questionPractice, setQuestionPractice] = useState<QuestionPracticeSummary>(
    EMPTY_QUESTION_PRACTICE,
  );
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [streak, setStreak] = useState<OperationalStreak | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(200);
  const [calendarRecommendationsEnabled, setCalendarRecommendationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionActionKey, setSuggestionActionKey] = useState<string | null>(null);
  const [showEventSuggestionModal, setShowEventSuggestionModal] = useState(false);
  const [eventSuggestionModalIds, setEventSuggestionModalIds] = useState<string[]>([]);
  const awaitingEventSuggestionReviewRef = useRef(false);
  const knownSuggestionIdsRef = useRef<Set<string>>(new Set());
  const streakRef = useRef<OperationalStreak | null>(null);
  const streakFetchedAtRef = useRef<number>(0);

  const today = todayISO();
  const [selectedDay, setSelectedDay] = useState(today);
  const [token, setToken] = useState("");
  const [tokenResolved, setTokenResolved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncToken = () => {
      setToken(getAuthToken());
      setTokenResolved(true);
    };
    syncToken();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncToken();
      }
    };
    window.addEventListener("focus", syncToken);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", syncToken);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);

  const fetchAll = useCallback(async () => {
    if (!tokenResolved) return;
    setLoading(true);
    const streakIsStale = Date.now() - streakFetchedAtRef.current > STREAK_STALE_MS;
    const shouldShowStreakSkeleton = streakRef.current === null;
    if (shouldShowStreakSkeleton) {
      setStreakLoading(true);
    }
    try {
      const [agendaData, doneData, studyData, eventData, suggestionData, profile, turboDaily] =
        await Promise.all([
          getReviewAgenda(token),
          listReviewTasks(token, { status: "done" }),
          listDirectedStudies(token),
          listEvents(token),
          listScheduleSuggestions(token),
          getProfile(token),
          getOperationalTurboSessionDailyCompletedCards(token, 365).catch(
            () => ({ timezone: "UTC", by_day: [] as Array<{ day: string; cards_completed: number }> }),
          ),
        ]);
      const nextTurboCardsByDate: Record<string, number> = {};
      for (const row of turboDaily.by_day) {
        const day = String(row.day ?? "").trim();
        const cardsCompleted = Number(row.cards_completed ?? 0);
        if (!day || cardsCompleted <= 0) continue;
        nextTurboCardsByDate[day] = cardsCompleted;
      }
      setTasks(agendaData.tasks);
      setDoneTasks(doneData);
      setStudies(studyData);
      setEvents(eventData);
      setTurboCardsByDate(nextTurboCardsByDate);
      setQuestionPractice({
        count: Math.max(0, Number(agendaData.question_practice_total ?? 0)),
        generated_at: agendaData.generated_at ?? null,
      });
      setWeeklyGoal(Math.max(0, Number(profile.weekly_goal_questions ?? 0)));
      setCalendarRecommendationsEnabled(profile.calendar_recommendations_enabled);
      const incomingSuggestionIds = new Set(suggestionData.map((sg) => sg.suggestion_id));
      if (awaitingEventSuggestionReviewRef.current) {
        const newSuggestions = suggestionData.filter(
          (sg) => !knownSuggestionIdsRef.current.has(sg.suggestion_id),
        );
        if (newSuggestions.length > 0 && profile.calendar_change_alerts_enabled) {
          setEventSuggestionModalIds(newSuggestions.map((sg) => sg.suggestion_id));
          setShowEventSuggestionModal(true);
        }
        awaitingEventSuggestionReviewRef.current = false;
      }
      knownSuggestionIdsRef.current = incomingSuggestionIds;
      setSuggestions(suggestionData);
      setError("");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Erro ao carregar."));
    } finally {
      setLoading(false);
    }

    if (!streakIsStale && !shouldShowStreakSkeleton) {
      setStreakLoading(false);
      return;
    }
    getOperationalStreak(token)
      .then((s) => { if (s) { setStreak(s); streakFetchedAtRef.current = Date.now(); } })
      .catch((err: unknown) => {
        const { status, message } = getStreakFetchErrorInfo(err);
        const isExpected =
          status === 401 ||
          status === 403 ||
          status === 404 ||
          status === 422 ||
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504;
        if (!isExpected && process.env.NODE_ENV !== "production") {
          console.warn("streak_fetch_failed", { status, message });
        }
      })
      .finally(() => setStreakLoading(false));
  }, [token, tokenResolved]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setError((prev) =>
        prev ||
        "A página demorou para responder. Verifique sua conexão e recarregue."
      );
      setLoading(false);
    }, 20000);
    return () => clearTimeout(timer);
  }, [loading]);

  const eventSuggestionModalSet = new Set(eventSuggestionModalIds);
  const eventModalSuggestions = suggestions.filter((sg) =>
    eventSuggestionModalSet.has(sg.suggestion_id),
  );

  useEffect(() => {
    if (showEventSuggestionModal && eventModalSuggestions.length === 0) {
      setShowEventSuggestionModal(false);
      setEventSuggestionModalIds([]);
    }
  }, [showEventSuggestionModal, eventModalSuggestions.length]);

  async function handleAutoReschedule() {
    setSuggesting(true);
    awaitingEventSuggestionReviewRef.current = true;
    try {
      await triggerScheduleSuggestion(token);
      await fetchAll();
      void queryClient.invalidateQueries({ queryKey: queryKeys.planning });
    } catch {
      awaitingEventSuggestionReviewRef.current = false;
    } finally {
      setSuggesting(false);
    }
  }

  const handleEventMutationRefresh = useCallback(async () => {
    awaitingEventSuggestionReviewRef.current = true;
    await fetchAll();
    void queryClient.invalidateQueries({ queryKey: queryKeys.planning });
  }, [fetchAll, queryClient]);

  function closeEventSuggestionModal() {
    setShowEventSuggestionModal(false);
    setEventSuggestionModalIds([]);
  }

  function handleShowPendingSuggestions() {
    const pendingSgs = suggestions.filter((sg) => sg.status === "pending");
    if (pendingSgs.length === 0) return;
    setEventSuggestionModalIds(pendingSgs.map((sg) => sg.suggestion_id));
    setShowEventSuggestionModal(true);
  }

  function suggestionCreatedAtLabel(createdAt: string): string {
    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) return createdAt;
    return parsed.toLocaleString("pt-BR", { hour12: false });
  }

  async function handleAcceptSuggestionItem(suggestionId: string, taskId: string) {
    const key = `item:${suggestionId}:${taskId}`;
    setSuggestionActionKey(key);
    try {
      const updatedSuggestion = await acceptScheduleSuggestionItem(token, suggestionId, taskId);
      setSuggestions((current) => (
        updatedSuggestion.status === "pending"
          ? current.map((suggestion) => (
              suggestion.suggestion_id === suggestionId ? updatedSuggestion : suggestion
            ))
          : current.filter((suggestion) => suggestion.suggestion_id !== suggestionId)
      ));
      if (updatedSuggestion.status !== "pending") {
        setEventSuggestionModalIds((current) => current.filter((id) => id !== suggestionId));
      }
    } catch {
      // ignore
    } finally {
      setSuggestionActionKey(null);
      fetchAll().catch(() => undefined);
      void queryClient.invalidateQueries({ queryKey: queryKeys.planning });
    }
  }

  async function handleAcceptSuggestionAll(suggestionId: string) {
    // Dismiss from modal immediately.
    setEventSuggestionModalIds((prev) => prev.filter((id) => id !== suggestionId));
    setSuggestionActionKey(`all:${suggestionId}`);
    try {
      await acceptScheduleSuggestionAll(token, suggestionId);
    } catch {
      // ignore
    } finally {
      setSuggestionActionKey(null);
      fetchAll().catch(() => undefined);
      void queryClient.invalidateQueries({ queryKey: queryKeys.planning });
    }
  }

  async function handleRejectSuggestion(suggestionId: string) {
    // Dismiss from modal immediately - don't wait for the API round-trip.
    setEventSuggestionModalIds((prev) => prev.filter((id) => id !== suggestionId));
    setSuggestionActionKey(`reject:${suggestionId}`);
    try {
      await rejectScheduleSuggestion(token, suggestionId);
    } catch {
      // ignore
    } finally {
      setSuggestionActionKey(null);
      // Sync state in background; ignore errors here.
      fetchAll().catch(() => undefined);
      void queryClient.invalidateQueries({ queryKey: queryKeys.planning });
    }
  }

  return {
    tasks,
    doneTasks,
    studies,
    turboCardsByDate,
    questionPractice,
    events,
    suggestions,
    streak,
    streakLoading,
    weeklyGoal,
    calendarRecommendationsEnabled,
    loading,
    error,
    suggesting,
    suggestionActionKey,
    showEventSuggestionModal,
    today,
    selectedDay,
    token,
    eventModalSuggestions,
    setSelectedDay,
    fetchAll,
    handleAutoReschedule,
    handleShowPendingSuggestions,
    handleEventMutationRefresh,
    closeEventSuggestionModal,
    suggestionCreatedAtLabel,
    handleAcceptSuggestionItem,
    handleAcceptSuggestionAll,
    handleRejectSuggestion,
  };
}
