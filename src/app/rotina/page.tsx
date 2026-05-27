"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useRotinaData } from "./_hooks/useRotinaData";
import { isoToday, isInternalSkipRoutineEvent } from "./lib/eventEncoding";
import { DevTokenPanel } from "./_components/DevTokenPanel";
import { AdaptiveContextPanel } from "./_components/AdaptiveContextPanel";
import { SettingsPanel } from "./_components/SettingsPanel";
import { EventForm } from "./_components/EventForm";
import { EventList } from "./_components/EventList";
import { RescheduleSection } from "./_components/RescheduleSection";

function IconGear({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function RotinaPage() {
  const [state, actions] = useRotinaData();

  const todayISO = isoToday();
  const routineEvents = state.events
    .filter((e) => e.event_type === "routine" && !isInternalSkipRoutineEvent(e.label))
    .filter((e) => !e.active_until || e.active_until >= todayISO)
    .sort((a, b) => (a.weekday ?? 99) - (b.weekday ?? 99));
  const punctualEvents = state.events
    .filter((e) => e.event_type === "event" && !isInternalSkipRoutineEvent(e.label))
    .filter((e) => !!e.event_date)
    .filter((e) => !e.active_until || (e.event_date as string) <= e.active_until)
    .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const upcomingPunctualEvents = punctualEvents
    .filter((event) => !!event.event_date && event.event_date >= todayISO)
    .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const historyPunctualEvents = punctualEvents
    .filter((event) => !!event.event_date && event.event_date < todayISO)
    .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""));
  const punctualTabEvents = state.punctualTab === "upcoming" ? upcomingPunctualEvents : historyPunctualEvents;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-serif">Rotina</h1>

      <DevTokenPanel
        token={state.token}
        onTokenChange={actions.setToken}
        onResetConfirmOpen={actions.setResetConfirmOpen}
      />

      {/* Meta semanal + workload */}
      <AdaptiveContextPanel
        weeklyGoal={state.weeklyGoal}
        weeklyGoalInput={state.weeklyGoalInput}
        savedMsg={state.savedMsg}
        profileError={state.profileError}
        contextState={state.contextState}
        adaptiveWeek={state.adaptiveWeek}
        adaptiveRank={state.adaptiveRank}
        adaptiveError={state.adaptiveError}
        adaptiveBusy={state.adaptiveBusy}
        contextSavedMsg={state.contextSavedMsg}
        rebalanceResult={state.rebalanceResult}
        rebalanceDays={state.rebalanceDays}
        workload={state.workload}
        todayISO={todayISO}
        onWeeklyGoalInputChange={actions.handleWeeklyGoalInputChange}
        onWeeklyGoalInputBlur={actions.normalizeWeeklyGoalInputOnBlur}
        onContextStateChange={actions.setContextState}
        onRebalanceDaysChange={actions.setRebalanceDays}
        onSaveAdaptiveContext={actions.saveAdaptiveContext}
        onRefreshAdaptive={() => actions.refreshAdaptive(state.token)}
        onRunRebalance={actions.runRebalance}
        onSaveProfile={actions.saveProfile}
      />

      <hr className="border-edge" />

      {/* Eventos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif">Eventos</h2>
          <button onClick={() => actions.setShowSettings(!state.showSettings)} className="text-muted hover:text-ink" title="Configurações de tolerância">
            <IconGear className="w-4 h-4" />
          </button>
        </div>

        <SettingsPanel
          showSettings={state.showSettings}
          avg12h={state.avg12h}
          avg24h={state.avg24h}
          showHelp={state.showHelp}
          showRetentionHelp={state.showRetentionHelp}
          retention={state.retention}
          hasCustomParams={state.hasCustomParams}
          onAvg12hChange={actions.setAvg12h}
          onAvg24hChange={actions.setAvg24h}
          onShowHelpChange={actions.setShowHelp}
          onShowRetentionHelpChange={actions.setShowRetentionHelp}
          onRetentionChange={actions.setRetention}
          onSaveTolerance={actions.saveTolerance}
          onResetFsrsParams={actions.resetFsrsParams}
          onClose={() => actions.setShowSettings(false)}
        />

        {state.evError && <p className="text-sm text-red-600 mb-3">{state.evError}</p>}

        <EventForm
          eventCadence={state.eventCadence}
          eventWeekday={state.eventWeekday}
          eventDate={state.eventDate}
          eventCategory={state.eventCategory}
          eventLabel={state.eventLabel}
          eventDuration={state.eventDuration}
          evError={state.evError}
          onEventCadenceChange={actions.setEventCadence}
          onEventWeekdayChange={actions.setEventWeekday}
          onEventDateChange={actions.setEventDate}
          onEventCategoryChange={actions.setEventCategory}
          onEventLabelChange={actions.setEventLabel}
          onEventDurationChange={actions.setEventDuration}
          onAddEvent={actions.addEvent}
        />

        <hr className="border-edge my-4" />

        <EventList
          routineEvents={routineEvents}
          punctualTabEvents={punctualTabEvents}
          punctualTab={state.punctualTab}
          onPunctualTabChange={actions.setPunctualTab}
          onRemoveEvent={actions.removeEvent}
        />
      </div>

      <hr className="border-edge" />

      {/* Reagendamento automático — por último */}
      <RescheduleSection
        rescheduleMode={state.rescheduleMode}
        savedMsg={state.savedMsg}
        profileError={state.profileError}
        onRescheduleModeChange={actions.setRescheduleMode}
        onSaveProfile={actions.saveProfile}
      />

      <ConfirmDialog
        open={state.resetConfirmOpen}
        title="Limpar dados"
        message="Limpar todos os dados (estudos, revisões, eventos)? Esta acao nao pode ser desfeita."
        cancelLabel="Cancelar"
        confirmLabel="Limpar"
        onCancel={() => actions.setResetConfirmOpen(false)}
        onConfirm={() => void actions.confirmResetData()}
      />
    </div>
  );
}
