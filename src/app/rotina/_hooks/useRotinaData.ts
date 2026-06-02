import { useEffect, useState, useCallback } from "react";
import { getAuthToken } from "@/lib/auth";
import {
  getEffectivePunctualHoursForDate,
  getEffectiveRoutineHoursForWeekday,
} from "@/lib/calendarEventVisibility";
import { getErrorMessage } from "@/lib/error-utils";
import {
  AdaptiveRebalanceOut,
  AdaptiveScheduleGenerate,
  AdaptiveSubjectRank,
  AdaptiveUserStateIn,
  getAdaptiveSchedule,
  getProfile,
  getSubjectsRank,
  getUserState,
  updateProfile,
  getWorkload,
  listEvents,
  createEvent,
  deleteEvent,
  getFsrsConfig,
  putFsrsConfig,
  rebalanceSchedule,
  resetUserData,
  setUserState,
  WorkloadDay,
  CalendarEventOut,
} from "@/lib/api";
import {
  EventCategory,
  WEEKDAYS,
  toDisplayDate,
  encodeEventLabel,
  isoToday,
  isoWeekStart,
  addIsoDays,
} from "../lib/eventEncoding";

export type { EventCategory };

export type RestContext = {
  energy_level: number;
  sleep_hours: number;
};

export type RotinaState = {
  token: string;
  weeklyGoal: number;
  weeklyGoalInput: string;
  rescheduleMode: string;
  savedMsg: string;
  profileError: string;
  workload: WorkloadDay[];
  events: CalendarEventOut[];
  eventCadence: "routine" | "event";
  eventWeekday: number;
  eventDate: string;
  eventCategory: EventCategory;
  eventLabel: string;
  eventDuration: number;
  punctualTab: "upcoming" | "history";
  evError: string;
  showSettings: boolean;
  avg12h: string;
  avg24h: string;
  showHelp: boolean;
  showRetentionHelp: boolean;
  retention: string;
  hasCustomParams: boolean;
  contextState: RestContext;
  adaptiveWeek: AdaptiveScheduleGenerate[];
  adaptiveRank: AdaptiveSubjectRank[];
  adaptiveError: string;
  adaptiveBusy: boolean;
  contextSavedMsg: string;
  rebalanceResult: AdaptiveRebalanceOut | null;
  rebalanceDays: number;
  resetConfirmOpen: boolean;
};

export type RotinaActions = {
  setToken: (v: string) => void;
  setRescheduleMode: (v: string) => void;
  setEventCadence: (v: "routine" | "event") => void;
  setEventWeekday: (v: number) => void;
  setEventDate: (v: string) => void;
  setEventCategory: (v: EventCategory) => void;
  setEventLabel: (v: string) => void;
  setEventDuration: (v: number) => void;
  setPunctualTab: (v: "upcoming" | "history") => void;
  setShowSettings: (v: boolean) => void;
  setAvg12h: (v: string) => void;
  setAvg24h: (v: string) => void;
  setShowHelp: (v: boolean) => void;
  setShowRetentionHelp: (v: boolean) => void;
  setRetention: (v: string) => void;
  setContextState: (v: RestContext | ((prev: RestContext) => RestContext)) => void;
  setRebalanceDays: (v: number) => void;
  setResetConfirmOpen: (v: boolean) => void;
  handleWeeklyGoalInputChange: (rawValue: string) => void;
  normalizeWeeklyGoalInputOnBlur: () => void;
  saveTolerance: () => Promise<void>;
  resetFsrsParams: () => Promise<void>;
  refreshWorkload: (t: string) => Promise<void>;
  refreshAdaptive: (t: string) => Promise<void>;
  saveProfile: () => Promise<void>;
  saveAdaptiveContext: () => Promise<void>;
  runRebalance: () => Promise<void>;
  checkRoutineOverflow: (weekday: number, duration: number) => string | null;
  checkPunctualOverflow: (date: string, duration: number) => string | null;
  addEvent: () => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  confirmResetData: () => Promise<void>;
};

export function useRotinaData(): [RotinaState, RotinaActions] {
  const [token, setToken] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState(200);
  const [weeklyGoalInput, setWeeklyGoalInput] = useState("200");
  const [rescheduleMode, setRescheduleMode] = useState("suggest");
  const [savedMsg, setSavedMsg] = useState("");
  const [profileError, setProfileError] = useState("");

  // Workload chart
  const [workload, setWorkload] = useState<WorkloadDay[]>([]);

  // Events
  const [events, setEvents] = useState<CalendarEventOut[]>([]);

  const [eventCadence, setEventCadence] = useState<"routine" | "event">("routine");
  const [eventWeekday, setEventWeekday] = useState(0);
  const [eventDate, setEventDate] = useState("");
  const [eventCategory, setEventCategory] = useState<EventCategory>("work");
  const [eventLabel, setEventLabel] = useState("");
  const [eventDuration, setEventDuration] = useState(8);
  const [punctualTab, setPunctualTab] = useState<"upcoming" | "history">("upcoming");

  const [evError, setEvError] = useState("");

  // Gear settings
  const [showSettings, setShowSettings] = useState(false);
  const [avg12h, setAvg12h] = useState<string>("");
  const [avg24h, setAvg24h] = useState<string>("");
  const [showHelp, setShowHelp] = useState(false);
  const [showRetentionHelp, setShowRetentionHelp] = useState(false);
  const [retention, setRetention] = useState<string>("80");
  const [hasCustomParams, setHasCustomParams] = useState(false);
  const [contextState, setContextState] = useState<RestContext>({
    energy_level: 3,
    sleep_hours: 7,
  });
  const [adaptiveWeek, setAdaptiveWeek] = useState<AdaptiveScheduleGenerate[]>([]);
  const [adaptiveRank, setAdaptiveRank] = useState<AdaptiveSubjectRank[]>([]);
  const [adaptiveError, setAdaptiveError] = useState("");
  const [adaptiveBusy, setAdaptiveBusy] = useState(false);
  const [contextSavedMsg, setContextSavedMsg] = useState("");
  const [rebalanceResult, setRebalanceResult] = useState<AdaptiveRebalanceOut | null>(null);
  const [rebalanceDays, setRebalanceDays] = useState(14);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // ---- Handlers ----

  const handleWeeklyGoalInputChange = useCallback((rawValue: string) => {
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
  }, []);

  const normalizeWeeklyGoalInputOnBlur = useCallback(() => {
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
  }, [weeklyGoal, weeklyGoalInput]);

  const saveTolerance = useCallback(async () => {
    const cap12 = parseInt(avg12h, 10);
    const cap24 = parseInt(avg24h, 10);
    try {
      await updateProfile(token, {
        shift_12h_capacity: isNaN(cap12) || avg12h === "" ? null : cap12,
        shift_24h_capacity: isNaN(cap24) || avg24h === "" ? null : cap24,
      });
      await refreshWorkload(token);
    } catch { /* ignore */ }
    const r = parseFloat(retention) / 100;
    if (!isNaN(r) && r >= 0.70 && r <= 0.99) {
      try { await putFsrsConfig(token, { desired_retention: r }); } catch { /* ignore */ }
    }
    setShowSettings(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, avg12h, avg24h, retention]);

  const resetFsrsParams = useCallback(async () => {
    try {
      await putFsrsConfig(token, { parameters: null });
      setHasCustomParams(false);
    } catch { /* ignore */ }
  }, [token]);

  const refreshWorkload = useCallback(async (t: string) => {
    try { setWorkload(await getWorkload(t)); } catch { /* ignore */ }
  }, []);

  const refreshAdaptive = useCallback(async (t: string) => {
    setAdaptiveError("");
    try {
      const [rank, userState] = await Promise.all([
        getSubjectsRank(t, 6),
        getUserState(t),
      ]);
      setAdaptiveRank(rank);
      setContextState({
        energy_level: userState.energy_level,
        sleep_hours: userState.sleep_hours,
      });

      const start = isoWeekStart();
      const days = Array.from({ length: 7 }, (_, idx) => addIsoDays(start, idx));
      const plans = await Promise.all(days.map((day) => getAdaptiveSchedule(t, day)));
      setAdaptiveWeek(plans);
    } catch (e: unknown) {
      setAdaptiveError(getErrorMessage(e, "Nao foi possivel atualizar o plano adaptativo."));
      setAdaptiveWeek([]);
      setAdaptiveRank([]);
    }
  }, []);

  const saveProfile = useCallback(async () => {
    setProfileError(""); setSavedMsg("");
    try {
      await updateProfile(token, {
        weekly_goal_questions: weeklyGoal,
        reschedule_mode: rescheduleMode,
      });
      setSavedMsg("Salvo.");
      setTimeout(() => setSavedMsg(""), 2000);
      await refreshWorkload(token);
    } catch (e: unknown) { setProfileError(getErrorMessage(e, "Erro.")); }
  }, [token, weeklyGoal, rescheduleMode, refreshWorkload]);

  const saveAdaptiveContext = useCallback(async () => {
    setAdaptiveError("");
    setContextSavedMsg("");
    setAdaptiveBusy(true);
    setRebalanceResult(null);
    try {
      const payload: AdaptiveUserStateIn = {
        is_on_call: false,
        post_call: false,
        energy_level: contextState.energy_level,
        sleep_hours: contextState.sleep_hours,
      };
      const saved = await setUserState(token, payload);
      setContextState({
        energy_level: saved.energy_level,
        sleep_hours: saved.sleep_hours,
      });
      await refreshAdaptive(token);
      setContextSavedMsg("Contexto salvo.");
      setTimeout(() => setContextSavedMsg(""), 2500);
    } catch (e: unknown) {
      setAdaptiveError(getErrorMessage(e, "Erro ao salvar contexto."));
    } finally {
      setAdaptiveBusy(false);
    }
  }, [token, contextState, refreshAdaptive]);

  const runRebalance = useCallback(async () => {
    setAdaptiveError("");
    setAdaptiveBusy(true);
    try {
      const result = await rebalanceSchedule(token, { horizon_days: rebalanceDays });
      setRebalanceResult(result);
      await refreshAdaptive(token);
      await refreshWorkload(token);
    } catch (e: unknown) {
      setAdaptiveError(getErrorMessage(e, "Erro ao rebalancear."));
    } finally {
      setAdaptiveBusy(false);
    }
  }, [token, rebalanceDays, refreshAdaptive, refreshWorkload]);

  const checkRoutineOverflow = useCallback((weekday: number, duration: number): string | null => {
    const used = getEffectiveRoutineHoursForWeekday(events, weekday, isoToday());
    if (used + duration > 24) {
      return `${WEEKDAYS[weekday]} já tem ${used}h de eventos. Adicionar ${duration}h ultrapassa 24h — ajuste os eventos existentes.`;
    }
    return null;
  }, [events]);

  const checkPunctualOverflow = useCallback((date: string, duration: number): string | null => {
    const used = getEffectivePunctualHoursForDate(events, date);
    if (used + duration > 24) {
      return `${toDisplayDate(date)} já tem ${used}h de eventos. Adicionar ${duration}h ultrapassa 24h — ajuste os eventos existentes.`;
    }
    return null;
  }, [events]);

  const addEvent = useCallback(async () => {
    setEvError("");
    if (!eventLabel.trim()) { setEvError("Informe o nome do compromisso."); return; }
    if (eventCadence === "event" && !eventDate) { setEvError("Selecione a data."); return; }

    if (eventCadence === "routine") {
      const overflow = checkRoutineOverflow(eventWeekday, eventDuration);
      if (overflow) { setEvError(overflow); return; }
    } else {
      const overflow = checkPunctualOverflow(eventDate, eventDuration);
      if (overflow) { setEvError(overflow); return; }
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
    } catch (e: unknown) { setEvError(getErrorMessage(e, "Erro.")); }
  }, [token, eventLabel, eventCadence, eventDate, eventCategory, eventWeekday, eventDuration, checkRoutineOverflow, checkPunctualOverflow, refreshWorkload]);

  const removeEvent = useCallback(async (id: string) => {
    try {
      await deleteEvent(token, id, { scope: "future", effective_from: isoToday() });
      setEvents(await listEvents(token));
      await refreshWorkload(token);
    } catch { /* ignore */ }
  }, [token, refreshWorkload]);

  const confirmResetData = useCallback(async () => {
    setResetConfirmOpen(false);
    try {
      await resetUserData(token);
      setEvents([]);
      setWorkload([]);
      setAdaptiveWeek([]);
      setAdaptiveRank([]);
      setRebalanceResult(null);
    } catch {
      // ignore
    }
  }, [token]);

  // ---- Initial data load ----
  useEffect(() => {
    const t = getAuthToken();
    setToken(t);
    getProfile(t)
      .then((p) => {
        setWeeklyGoal(p.weekly_goal_questions);
        setWeeklyGoalInput(String(p.weekly_goal_questions));
        setRescheduleMode(p.reschedule_mode ?? "suggest");
        setAvg12h(p.shift_12h_capacity != null ? String(p.shift_12h_capacity) : "");
        setAvg24h(p.shift_24h_capacity != null ? String(p.shift_24h_capacity) : "");
      })
      .catch((err) => console.error("rotina_profile_fetch_failed", err));
    getWorkload(t).then(setWorkload).catch((err) => console.error("rotina_workload_fetch_failed", err));
    listEvents(t).then(setEvents).catch((err) => console.error("rotina_events_fetch_failed", err));
    getFsrsConfig(t)
      .then((cfg) => {
        setRetention(Math.round(cfg.desired_retention * 100).toString());
        setHasCustomParams(cfg.parameters !== null);
      })
      .catch((err) => console.error("rotina_fsrs_fetch_failed", err));
    getUserState(t)
      .then((state) => {
        setContextState({
          energy_level: state.energy_level,
          sleep_hours: state.sleep_hours,
        });
      })
      .catch((err) => console.error("rotina_user_state_fetch_failed", err));
    refreshAdaptive(t).catch((err) => console.error("rotina_adaptive_fetch_failed", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state: RotinaState = {
    token,
    weeklyGoal,
    weeklyGoalInput,
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
    punctualTab,
    evError,
    showSettings,
    avg12h,
    avg24h,
    showHelp,
    showRetentionHelp,
    retention,
    hasCustomParams,
    contextState,
    adaptiveWeek,
    adaptiveRank,
    adaptiveError,
    adaptiveBusy,
    contextSavedMsg,
    rebalanceResult,
    rebalanceDays,
    resetConfirmOpen,
  };

  const actions: RotinaActions = {
    setToken,
    setRescheduleMode,
    setEventCadence,
    setEventWeekday,
    setEventDate,
    setEventCategory,
    setEventLabel,
    setEventDuration,
    setPunctualTab,
    setShowSettings,
    setAvg12h,
    setAvg24h,
    setShowHelp,
    setShowRetentionHelp,
    setRetention,
    setContextState,
    setRebalanceDays,
    setResetConfirmOpen,
    handleWeeklyGoalInputChange,
    normalizeWeeklyGoalInputOnBlur,
    saveTolerance,
    resetFsrsParams,
    refreshWorkload,
    refreshAdaptive,
    saveProfile,
    saveAdaptiveContext,
    runRebalance,
    checkRoutineOverflow,
    checkPunctualOverflow,
    addEvent,
    removeEvent,
    confirmResetData,
  };

  return [state, actions];
}
