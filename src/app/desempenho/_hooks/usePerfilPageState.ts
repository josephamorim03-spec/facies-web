"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import { useToast } from "@/lib/useToast";
import { getBlockedRedirectSessionKey, getWelcomeToastSessionKey } from "@/lib/storage-keys";
import { getErrorMessage } from "@/lib/error-utils";
import {
  AdaptiveSubjectRank,
  AdaptiveScheduleGenerate,
  getAdaptiveSchedule,
  getSubjectsRank,
  getProfile,
  updateProfile,
  getWorkload,
  listEvents,
  createEvent,
  deleteEvent,
  getFsrsConfig,
  putFsrsConfig,
  listReviewTasks,
  listDirectedStudies,
  getStudyPerformanceSummary,
  ReviewTask,
  StudyPerformanceSummary,
  WorkloadDay,
  CalendarEventOut,
} from "@/lib/api";

import {
  addIsoDays,
  Area,
  clampRetentionPct,
  encodeEventLabel,
  EventCategory,
  getHelpPopupPosition,
  HelpPopupPosition,
  isoWeekStart,
  PERIOD_SESSION_KEY,
  Period,
  RETENTION_DEFAULT,
  RETENTION_MAX,
  RETENTION_MIN,
  TAB_KEY,
  ThemeListSort,
  toDisplayDate,
  WEEKDAYS,
} from "../_lib/perfilShared";

export function usePerfilPageState() {
  const { showToast } = useToast();
  const welcomeToastShownRef = useRef(false);
  const [tab, setTab] = useState<"desempenho" | "rotina">("desempenho");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TAB_KEY) as "desempenho" | "rotina" | null;
      if (stored) setTab(stored);
    } catch {
      // ignore
    }
  }, []);

  function changeTab(nextTab: "desempenho" | "rotina") {
    setTab(nextTab);
    try {
      localStorage.setItem(TAB_KEY, nextTab);
    } catch {
      // ignore
    }
  }

  const [token, setToken] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [hasCompletedInitialGoalSetup, setHasCompletedInitialGoalSetup] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(200);
  const [weeklyGoalInput, setWeeklyGoalInput] = useState("200");
  const [pending, setPending] = useState<ReviewTask[]>([]);
  const [done, setDone] = useState<ReviewTask[]>([]);
  const [studies, setStudies] = useState<any[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<StudyPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("geral");
  const [clickedAreas, setClickedAreas] = useState<Set<Area>>(new Set());
  const [themeSort, setThemeSort] = useState<ThemeListSort>("consistency");
  const [themeHelpArea, setThemeHelpArea] = useState<Area | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(PERIOD_SESSION_KEY) as Period | null;
      if (stored && (stored === "geral" || stored === "semanal" || stored === "mensal")) {
        setPeriod(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  function changePeriod(nextPeriod: Period) {
    setPeriod(nextPeriod);
    try {
      sessionStorage.setItem(PERIOD_SESSION_KEY, nextPeriod);
    } catch {
      // ignore
    }
  }

  function handleWeeklyGoalInputChange(rawValue: string) {
    const digitsOnly = rawValue.replace(/\D/g, "");
    if (digitsOnly === "") {
      setWeeklyGoalInput("");
      return;
    }
    const normalized = String(parseInt(digitsOnly, 10));
    setWeeklyGoalInput(normalized);
    const parsed = parseInt(normalized, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      setWeeklyGoal(parsed);
    }
  }

  function normalizeWeeklyGoalInputOnBlur() {
    if (weeklyGoalInput.trim() === "") {
      setWeeklyGoalInput(String(weeklyGoal));
      return;
    }
    const parsed = parseInt(weeklyGoalInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setWeeklyGoalInput(String(weeklyGoal));
      return;
    }
    setWeeklyGoal(parsed);
    setWeeklyGoalInput(String(parsed));
  }

  useEffect(() => {
    if (period !== "geral") {
      setClickedAreas(new Set());
      setThemeHelpArea(null);
    }
  }, [period]);

  const [rescheduleMode, setRescheduleMode] = useState("suggest");
  const [savedMsg, setSavedMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [workload, setWorkload] = useState<WorkloadDay[]>([]);
  const [events, setEvents] = useState<CalendarEventOut[]>([]);
  const [eventCadence, setEventCadence] = useState<"routine" | "event">("routine");
  const [eventWeekday, setEventWeekday] = useState(0);
  const [eventDate, setEventDate] = useState("");
  const [eventCategory, setEventCategory] = useState<EventCategory>("work");
  const [eventLabel, setEventLabel] = useState("");
  const [eventDuration, setEventDuration] = useState(8);
  const [evError, setEvError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [avg12h, setAvg12h] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showRetentionHelp, setShowRetentionHelp] = useState(false);
  const [helpPosition, setHelpPosition] = useState<HelpPopupPosition | null>(null);
  const [retentionHelpPosition, setRetentionHelpPosition] = useState<HelpPopupPosition | null>(null);
  const [retention, setRetention] = useState(String(RETENTION_DEFAULT));
  const [savedRetention, setSavedRetention] = useState(String(RETENTION_DEFAULT));
  const [hasCustomParams, setHasCustomParams] = useState(false);
  const [adaptiveWeek, setAdaptiveWeek] = useState<AdaptiveScheduleGenerate[]>([]);
  const [adaptiveRank, setAdaptiveRank] = useState<AdaptiveSubjectRank[]>([]);


  async function refreshWorkload(authToken: string) {
    try {
      setWorkload(await getWorkload(authToken));
    } catch {
      // ignore
    }
  }

  async function refreshAdaptive(authToken: string) {
    try {
      const start = isoWeekStart();
      const days = Array.from({ length: 7 }, (_, idx) => addIsoDays(start, idx));
      const plans = await Promise.all(days.map((day) => getAdaptiveSchedule(authToken, day)));
      setAdaptiveWeek(plans);
    } catch {
      setAdaptiveWeek([]);
    }
  }

  useEffect(() => {
    const authToken = getAuthToken();
    setToken(authToken);
    Promise.all([
      getProfile(authToken),
      listReviewTasks(authToken, { status: "pending" }),
      listReviewTasks(authToken, { status: "done" }),
      listDirectedStudies(authToken),
      getStudyPerformanceSummary(authToken),
      getSubjectsRank(authToken, 10),
      getWorkload(authToken),
      listEvents(authToken),
      getFsrsConfig(authToken),
    ])
      .then(([profile, pend, doneItems, directedStudies, performance, rank, work, calendarEvents, cfg]) => {
        const normalizedRetention = String(clampRetentionPct(Math.round(cfg.desired_retention * 100)));
        setHasCompletedInitialGoalSetup(profile.has_completed_initial_goal_setup);
        setWeeklyGoal(profile.weekly_goal_questions);
        setWeeklyGoalInput(String(profile.weekly_goal_questions));
        setRescheduleMode(profile.reschedule_mode ?? "suggest");
        setAvg12h(profile.shift_12h_capacity != null ? String(profile.shift_12h_capacity) : "");
        setDisplayName(profile.display_name ?? "");
        setPending(pend);
        setDone(doneItems);
        setStudies(directedStudies);
        setPerformanceSummary(performance);
        setAdaptiveRank(rank);
        setWorkload(work);
        setEvents(calendarEvents);
        setRetention(normalizedRetention);
        setSavedRetention(normalizedRetention);
        setHasCustomParams(cfg.parameters !== null);
      })
      .catch((e: any) => setError(e.message ?? "Erro ao carregar."))
      .finally(() => setLoading(false));
    refreshAdaptive(authToken).catch(() => {
      // ignore
    });
  }, []);

  useEffect(() => {
    if (loading || hasCompletedInitialGoalSetup || welcomeToastShownRef.current) return;
    const sessionTokenKey = token || "http-only-session";
    const blockedRedirectSessionKey = getBlockedRedirectSessionKey(sessionTokenKey);
    try {
      if (sessionStorage.getItem(blockedRedirectSessionKey) === "1") {
        sessionStorage.removeItem(blockedRedirectSessionKey);
        welcomeToastShownRef.current = true;
        showToast(
          "Voc\u00ea ainda n\u00e3o concluiu a rotina. Preencha e salve seus dados para podermos adaptar o restante para voc\u00ea. Logo ap\u00f3s ser\u00e1 liberado acesso as outras abas.",
          "info",
        );
        return;
      }
    } catch {
      // ignore
    }

    const sessionKey = getWelcomeToastSessionKey(sessionTokenKey);
    try {
      if (sessionStorage.getItem(sessionKey) === "1") {
        welcomeToastShownRef.current = true;
        return;
      }
    } catch {
      // ignore
    }
    welcomeToastShownRef.current = true;
    try {
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      // ignore
    }
    showToast(
      "Bem vindo a KrosMed, estamos felizes em ajudar na sua prepara\u00e7\u00e3o. Para iniciar primeiramente voc\u00ea deve definir suas metas de quest\u00f5es e salvar suas predefini\u00e7\u00f5es.",
      "info",
    );
  }, [hasCompletedInitialGoalSetup, loading, showToast, token]);

  useEffect(() => {
    if (!hasCompletedInitialGoalSetup) return;
    try {
      sessionStorage.removeItem(getWelcomeToastSessionKey(token || "http-only-session"));
    } catch {
      // ignore
    }
  }, [hasCompletedInitialGoalSetup, token]);

  useEffect(() => {
    if (!showSettings) {
      setShowHelp(false);
      setShowRetentionHelp(false);
      setHelpPosition(null);
      setRetentionHelpPosition(null);
      setRetention(savedRetention);
    }
  }, [showSettings, savedRetention]);

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

  async function saveTolerance() {
    const cap12 = parseInt(avg12h, 10);
    try {
      await updateProfile(token, {
        shift_12h_capacity: isNaN(cap12) || avg12h === "" ? null : cap12,
        shift_24h_capacity: null,
      });
      await refreshWorkload(token);
    } catch {
      // ignore
    }

    const retentionValue = clampRetentionPct(parseFloat(retention)) / 100;
    if (
      !isNaN(retentionValue) &&
      retentionValue >= RETENTION_MIN / 100 &&
      retentionValue <= RETENTION_MAX / 100
    ) {
      try {
        await putFsrsConfig(token, { desired_retention: retentionValue });
        setSavedRetention(String(clampRetentionPct(parseFloat(retention))));
      } catch {
        // ignore
      }
    }
    await refreshAdaptive(token);
    setShowSettings(false);
  }

  function openHelpTooltip(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return;
    setHelpPosition(getHelpPopupPosition(target));
    setShowHelp(true);
  }

  function openRetentionHelpTooltip(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return;
    setRetentionHelpPosition(getHelpPopupPosition(target));
    setShowRetentionHelp(true);
  }

  async function resetFsrsParams() {
    try {
      await putFsrsConfig(token, { parameters: null });
      setHasCustomParams(false);
    } catch {
      // ignore
    }
  }

  async function saveProfile() {
    setProfileError("");
    setSavedMsg("");
    try {
      const updatedProfile = await updateProfile(token, {
        weekly_goal_questions: weeklyGoal,
        reschedule_mode: rescheduleMode,
      });
      setHasCompletedInitialGoalSetup(updatedProfile.has_completed_initial_goal_setup);
      setSavedMsg("Salvo.");
      setTimeout(() => setSavedMsg(""), 2000);
      await refreshWorkload(token);
      await refreshAdaptive(token);
    } catch (e: unknown) {
      setProfileError(getErrorMessage(e, "Erro."));
    }
  }

  function checkRoutineOverflow(weekday: number, duration: number): string | null {
    const used = events
      .filter((event) => event.event_type === "routine" && event.weekday === weekday)
      .reduce((sum, event) => sum + event.duration_hours, 0);
    if (used + duration > 24) {
      return `${WEEKDAYS[weekday]} já tem ${used}h de eventos. Adicionar ${duration}h ultrapassa 24h — ajuste os eventos existentes.`;
    }
    return null;
  }

  function checkPunctualOverflow(date: string, duration: number): string | null {
    const used = events
      .filter((event) => event.event_type === "event" && event.event_date === date)
      .reduce((sum, event) => sum + event.duration_hours, 0);
    if (used + duration > 24) {
      return `${toDisplayDate(date)} já tem ${used}h de eventos. Adicionar ${duration}h ultrapassa 24h — ajuste os eventos existentes.`;
    }
    return null;
  }

  async function addEvent() {
    setEvError("");
    if (!eventLabel.trim()) {
      setEvError("Informe o nome do compromisso.");
      return;
    }
    if (eventCadence === "event" && !eventDate) {
      setEvError("Selecione a data.");
      return;
    }

    if (eventCadence === "routine") {
      const overflow = checkRoutineOverflow(eventWeekday, eventDuration);
      if (overflow) {
        setEvError(overflow);
        return;
      }
    } else {
      const overflow = checkPunctualOverflow(eventDate, eventDuration);
      if (overflow) {
        setEvError(overflow);
        return;
      }
    }

    try {
      await createEvent(token, {
        label: encodeEventLabel(eventLabel, eventCategory),
        event_type: eventCadence,
        weekday: eventCadence === "routine" ? eventWeekday : null,
        event_date: eventCadence === "event" ? eventDate : null,
        duration_hours: eventDuration,
      });
      setEventLabel("");
      if (eventCadence === "event") setEventDate("");
      setEvents(await listEvents(token));
      await refreshWorkload(token);
      await refreshAdaptive(token);
    } catch (e: unknown) {
      setEvError(getErrorMessage(e, "Erro."));
    }
  }

  async function removeEvent(id: string) {
    const now = new Date();
    const effectiveFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    try {
      await deleteEvent(token, id, { scope: "future", effective_from: effectiveFrom });
      setEvents(await listEvents(token));
      await refreshWorkload(token);
      await refreshAdaptive(token);
    } catch {
      // ignore
    }
  }

  return {
    tab,
    changeTab,
    token,
    displayName,
    hasCompletedInitialGoalSetup,
    weeklyGoal,
    weeklyGoalInput,
    pending,
    done,
    studies,
    performanceSummary,
    loading,
    error,
    period,
    clickedAreas,
    themeSort,
    themeHelpArea,
    rescheduleMode,
    savedMsg,
    profileError,
    workload,
    events,
    eventCadence,
    eventWeekday,
    eventDate,
    eventCategory,
    eventLabel,
    eventDuration,
    evError,
    showSettings,
    avg12h,
    showHelp,
    showRetentionHelp,
    helpPosition,
    retentionHelpPosition,
    retention,
    hasCustomParams,
    adaptiveWeek,
    adaptiveRank,
    setThemeSort,
    setThemeHelpArea,
    setRescheduleMode,
    setEvents,
    setWorkload,
    setEventCadence,
    setEventWeekday,
    setEventDate,
    setEventCategory,
    setEventLabel,
    setEventDuration,
    setShowSettings,
    setAvg12h,
    setShowHelp,
    setShowRetentionHelp,
    setHelpPosition,
    setRetentionHelpPosition,
    setRetention,
    setAdaptiveWeek,
    setAdaptiveRank,
    changePeriod,
    handleWeeklyGoalInputChange,
    normalizeWeeklyGoalInputOnBlur,
    handleBarClick,
    saveTolerance,
    openHelpTooltip,
    openRetentionHelpTooltip,
    resetFsrsParams,
    saveProfile,
    addEvent,
    removeEvent,
  };
}
