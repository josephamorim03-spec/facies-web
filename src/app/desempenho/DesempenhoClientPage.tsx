"use client";

import { useEffect, useState } from "react";

import {
  filterEffectivePunctualEvents,
  filterEffectiveRoutineEvents,
} from "@/lib/calendarEventVisibility";
import { RotinaTab } from "./_components/RotinaTab";
import { TrainerContextStrip } from "@/components/trainer/TrainerContextStrip";
import { usePerfilPageState } from "./_hooks/usePerfilPageState";
import { isInternalSkipRoutineEvent } from "./_lib/perfilShared";
import {
  DataFreshness,
  LearningStatus,
  StudentPage,
  StudentPageHeader,
} from "@/components/student/StudentExperienceUI";
import { useStudentExperience } from "@/lib/StudentExperienceContext";
import { getAuthToken } from "@/lib/auth";
import { getStudentPlan, type StudentSurfaceHome } from "@/lib/api";
import {
  StudentBackupActions,
  StudentDeepLinks,
  StudentDetailsDisclosure,
  StudentLoadNote,
  StudentPrimaryAction,
  StudentSurfaceInsight,
  StudentSurfaceSnapshot,
} from "@/components/student/StudentActionSurface";

function SkRow({ w }: { w: string }) {
  return <div className={`h-3 ${w} bg-edge rounded-sm`} />;
}

function PerfilPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* heading "Metas" */}
      <div className="h-9 w-24 bg-edge rounded-sm" />

      <hr className="border-edge" />

      {/* Meta semanal section */}
      <section className="space-y-3">
        <SkRow w="w-28" />
        <div className="flex items-center gap-4">
          <div className="h-3 flex-1 rounded-full bg-edge" />
          <div className="h-3 w-12 shrink-0 rounded-sm bg-edge" />
        </div>
        <div className="h-10 w-full rounded-xl bg-edge" />
        <SkRow w="w-36" />
      </section>

      <hr className="border-edge" />

      {/* Capacidade / Intensidade */}
      <section className="space-y-3">
        <SkRow w="w-40" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 rounded-xl bg-edge" />
          <div className="h-12 rounded-xl bg-edge" />
        </div>
        <div className="h-10 w-full rounded-xl bg-edge" />
      </section>

      <hr className="border-edge" />

      {/* Eventos */}
      <section className="space-y-3">
        <SkRow w="w-20" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`ev-sk-${i}`} className="flex items-center gap-3 border-b border-edge py-2">
              <div className="h-3 w-3 shrink-0 rounded-full bg-edge" />
              <div className="h-3 flex-1 rounded-sm bg-edge" />
              <div className="h-3 w-16 shrink-0 rounded-sm bg-edge" />
            </div>
          ))}
        </div>
        <div className="h-9 w-full rounded-xl bg-edge" />
      </section>

      <hr className="border-edge" />

      {/* Notificações */}
      <section className="space-y-3">
        <SkRow w="w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`notif-sk-${i}`} className="flex items-center gap-2">
            <div className="h-4 w-4 shrink-0 rounded-sm bg-edge" />
            <div className="h-3 w-48 rounded-sm bg-edge" />
          </div>
        ))}
      </section>
    </div>
  );
}

type DesempenhoClientPageProps = {
  variant?: "overview" | "settings";
};

export default function PerfilPage({ variant = "overview" }: DesempenhoClientPageProps) {
  const { enabled: experienceEnabled, experience } = useStudentExperience();
  const [planHome, setPlanHome] = useState<StudentSurfaceHome | null>(null);
  const {
    loading,
    error,
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
    setRescheduleMode,
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
    handleWeeklyGoalInputChange,
    normalizeWeeklyGoalInputOnBlur,
    saveTolerance,
    openHelpTooltip,
    openRetentionHelpTooltip,
    resetFsrsParams,
    saveProfile,
    addEvent,
    removeEvent,
    displayName,
    token,
  } = usePerfilPageState();

  useEffect(() => {
    let active = true;
    getStudentPlan(getAuthToken())
      .then((home) => {
        if (active) setPlanHome(home);
      })
      .catch(() => {
        if (active) setPlanHome(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <PerfilPageSkeleton />;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const routineEvents = filterEffectiveRoutineEvents(
    events.filter((event) => event.event_type === "routine" && !isInternalSkipRoutineEvent(event.label)),
    todayISO,
  ).sort((a, b) => (a.weekday ?? 99) - (b.weekday ?? 99));

  const punctualEvents = filterEffectivePunctualEvents(
    events.filter((event) => event.event_type === "event" && !isInternalSkipRoutineEvent(event.label)),
  ).sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const adaptiveQuestionsByDate = new Map(
    adaptiveWeek.map((plan) => [plan.date, Math.max(0, Math.round(plan.focus_minutes / 2))])
  );
  const maxAdaptiveLoad = Math.max(1, ...workload.map((d) => adaptiveQuestionsByDate.get(d.date) ?? d.load));

  return (
    <StudentPage>
      <StudentPageHeader
        eyebrow="Planejar"
        title="Organize uma rotina sustentável"
        description="Metas, capacidade e compromissos formam um único plano de estudo."
        actions={experienceEnabled && experience ? (
          <DataFreshness
            status={experience.status}
            generatedAt={experience.generated_at}
            missingSources={experience.missing_sources}
          />
        ) : undefined}
      />
      {variant === "overview" && planHome ? (
        <>
          <StudentSurfaceInsight surface={planHome} />
          <StudentPrimaryAction action={planHome.primary_action} eyebrow="Ajuste de rotina" />
          <StudentLoadNote load={planHome.load_note} />
          <StudentDetailsDisclosure
            title="Carga e rotina"
            status={planHome.status}
            missingSources={planHome.missing_sources}
          >
            <StudentDeepLinks links={planHome.deep_links} />
            <StudentSurfaceSnapshot
              items={[
                { label: "Meta semanal", value: String(planHome.goal_status?.weekly_goal ?? planHome.details.weekly_goal_questions ?? "-") },
                { label: "Progresso", value: planHome.goal_status?.weekly_progress_pct === null || planHome.goal_status?.weekly_progress_pct === undefined ? "-" : `${Math.round(Number(planHome.goal_status.weekly_progress_pct))}%` },
                { label: "Calendario", value: "abrir", href: "/calendario" },
              ]}
            />
          </StudentDetailsDisclosure>
        </>
      ) : variant === "overview" && experienceEnabled && experience ? <LearningStatus load={experience.review_load} /> : null}
      <TrainerContextStrip key={savedMsg || "trainer-plan"} sourcePage="/planejar" />
      {variant === "settings" ? (
      <RotinaTab
        token={token}
        displayName={displayName}
        weeklyGoalInput={weeklyGoalInput}
        handleWeeklyGoalInputChange={handleWeeklyGoalInputChange}
        normalizeWeeklyGoalInputOnBlur={normalizeWeeklyGoalInputOnBlur}
        workload={workload}
        adaptiveQuestionsByDate={adaptiveQuestionsByDate}
        maxAdaptiveLoad={maxAdaptiveLoad}
        saveProfile={saveProfile}
        savedMsg={savedMsg}
        profileError={profileError}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showHelp={showHelp}
        setShowHelp={setShowHelp}
        helpPosition={helpPosition}
        setHelpPosition={setHelpPosition}
        openHelpTooltip={openHelpTooltip}
        avg12h={avg12h}
        setAvg12h={setAvg12h}
        showRetentionHelp={showRetentionHelp}
        setShowRetentionHelp={setShowRetentionHelp}
        retentionHelpPosition={retentionHelpPosition}
        setRetentionHelpPosition={setRetentionHelpPosition}
        openRetentionHelpTooltip={openRetentionHelpTooltip}
        retention={retention}
        setRetention={setRetention}
        hasCustomParams={hasCustomParams}
        resetFsrsParams={resetFsrsParams}
        saveTolerance={saveTolerance}
        evError={evError}
        eventCadence={eventCadence}
        setEventCadence={setEventCadence}
        eventWeekday={eventWeekday}
        setEventWeekday={setEventWeekday}
        eventDate={eventDate}
        setEventDate={setEventDate}
        eventCategory={eventCategory}
        setEventCategory={setEventCategory}
        eventLabel={eventLabel}
        setEventLabel={setEventLabel}
        eventDuration={eventDuration}
        setEventDuration={setEventDuration}
        addEvent={addEvent}
        routineEvents={routineEvents}
        punctualEvents={punctualEvents}
        removeEvent={removeEvent}
        rescheduleMode={rescheduleMode}
        setRescheduleMode={setRescheduleMode}
      />
      ) : null}
    </StudentPage>
  );
}
