"use client";

import { RotinaTab } from "./_components/RotinaTab";
import { usePerfilPageState } from "./_hooks/usePerfilPageState";
import { isInternalSkipRoutineEvent } from "./_lib/perfilShared";

function PerfilPageSkeleton() {
  return (
    <div className="space-y-8 max-w-md mx-auto md:max-w-none md:mx-0 animate-pulse">
      <section className="space-y-3">
        <div className="h-6 w-40 bg-edge rounded-sm mx-auto" />
      </section>

      <hr className="border-edge" />

      <section className="space-y-4">
        <div className="h-3 w-24 bg-edge rounded-sm mx-auto md:mx-0" />
        <div className="h-9 w-64 bg-edge rounded-sm mx-auto md:mx-0" />
        <div className="h-28 w-full bg-edge rounded-sm" />
        <div className="h-8 w-32 bg-edge rounded-sm mx-auto md:mx-0" />
      </section>

      <hr className="border-edge" />

      <section className="space-y-4">
        <div className="h-3 w-20 bg-edge rounded-sm mx-auto md:mx-0" />
        <div className="h-28 w-full bg-edge rounded-sm" />
        <div className="h-20 w-full bg-edge rounded-sm" />
      </section>

      <hr className="border-edge" />

      <section className="space-y-3">
        <div className="h-3 w-36 bg-edge rounded-sm mx-auto md:mx-0" />
        <div className="h-8 w-56 bg-edge rounded-sm mx-auto md:mx-0" />
      </section>
    </div>
  );
}

export default function PerfilPage() {
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

  if (loading) {
    return <PerfilPageSkeleton />;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const routineEvents = events
    .filter((e) => e.event_type === "routine" && !isInternalSkipRoutineEvent(e.label))
    .filter((e) => !e.active_until || e.active_until >= todayISO)
    .sort((a, b) => (a.weekday ?? 99) - (b.weekday ?? 99));

  const punctualEvents = events
    .filter((e) => e.event_type === "event" && !isInternalSkipRoutineEvent(e.label))
    .filter((e) => !!e.event_date)
    .filter((e) => !e.active_until || (e.event_date as string) <= e.active_until)
    .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const adaptiveQuestionsByDate = new Map(
    adaptiveWeek.map((plan) => [plan.date, Math.max(0, Math.round(plan.focus_minutes / 2))])
  );
  const maxAdaptiveLoad = Math.max(1, ...workload.map((d) => adaptiveQuestionsByDate.get(d.date) ?? d.load));

  return (
    <div className="space-y-6">
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
    </div>
  );
}
