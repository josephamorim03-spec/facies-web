"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CalendarPlus,
  Check,
  Crosshair,
  Layers3,
  Save,
  Target,
  Trash2,
} from "lucide-react";

import {
  createEvent,
  deleteEvent,
  getCapabilities,
  getFsrsConfig,
  getProfile,
  listEvents,
  putFsrsConfig,
  updateProfile,
  type CalendarEventOut,
  type CapabilityStatus,
  type UserProfile,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import {
  filterEffectivePunctualEvents,
  filterEffectiveRoutineEvents,
  getEffectivePunctualHoursForDate,
  getEffectiveRoutineHoursForWeekday,
} from "@/lib/calendarEventVisibility";
import { getErrorMessage } from "@/lib/error-utils";
import { BottomActionBar, BOTTOM_ACTION_BAR_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { ObjectiveSelector } from "@/components/objectives/ObjectiveSelector";
import { TargetExamSelector } from "@/components/objectives/TargetExamSelector";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import {
  displayEventLabel,
  DURATIONS,
  encodeEventLabel,
  type EventCategory,
  isInternalSkipRoutineEvent,
  RESCHEDULE_MODES,
  toDisplayDate,
  WEEKDAYS,
} from "@/app/desempenho/_lib/perfilShared";

type ToggleProps = {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
};

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function PreferenceToggle({
  checked,
  label,
  description,
  onChange,
}: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 border-b border-edge py-4 last:border-b-0">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-1 block max-w-2xl text-xs leading-5 text-muted">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-edge transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
      >
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-paper shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
}) {
  return (
    <header className="grid gap-2 border-b border-edge pb-4 sm:grid-cols-[1.5rem_minmax(0,1fr)]">
      <Icon className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
    </header>
  );
}

export default function PreferenciasPage() {
  const token = getAuthToken();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [objectivesCapability, setObjectivesCapability] = useState<CapabilityStatus | null>(null);
  const [targetExamCapability, setTargetExamCapability] = useState<CapabilityStatus | null>(null);
  const [events, setEvents] = useState<CalendarEventOut[]>([]);
  const [weeklyGoalInput, setWeeklyGoalInput] = useState("200");
  const [shift12hInput, setShift12hInput] = useState("");
  const [eventCadence, setEventCadence] = useState<"routine" | "event">("routine");
  const [eventWeekday, setEventWeekday] = useState(0);
  const [eventDate, setEventDate] = useState("");
  const [eventCategory, setEventCategory] = useState<EventCategory>("work");
  const [eventLabel, setEventLabel] = useState("");
  const [eventDuration, setEventDuration] = useState(8);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSaving, setEventSaving] = useState(false);
  const [retention, setRetention] = useState(0.9);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getProfile(token),
      listEvents(token).catch(() => []),
      getFsrsConfig(token),
      getCapabilities(token).catch(() => ({ capabilities: [] })),
    ])
      .then(([nextProfile, nextEvents, fsrs, capabilities]) => {
        setProfile(nextProfile);
        setEvents(nextEvents);
        setObjectivesCapability(
          capabilities.capabilities.find((item) => item.key === "student_objectives_v2") ?? null,
        );
        setTargetExamCapability(
          capabilities.capabilities.find((item) => item.key === "target_exam_v1") ?? null,
        );
        setWeeklyGoalInput(String(nextProfile.weekly_goal_questions));
        setShift12hInput(nextProfile.shift_12h_capacity == null ? "" : String(nextProfile.shift_12h_capacity));
        setRetention(fsrs.desired_retention);
      })
      .catch((cause) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível abrir as preferências.",
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const currentTodayISO = useMemo(() => todayISO(), []);

  const routineEvents = useMemo(
    () =>
      filterEffectiveRoutineEvents(
        events.filter((event) => event.event_type === "routine" && !isInternalSkipRoutineEvent(event.label)),
        currentTodayISO,
      ).sort((a, b) => (a.weekday ?? 99) - (b.weekday ?? 99)),
    [currentTodayISO, events],
  );

  const upcomingPunctualEvents = useMemo(
    () =>
      filterEffectivePunctualEvents(
        events.filter((event) => event.event_type === "event" && !isInternalSkipRoutineEvent(event.label)),
      )
        .filter((event) => !!event.event_date && event.event_date >= currentTodayISO)
        .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? "")),
    [currentTodayISO, events],
  );

  function patchLocal(patch: Partial<UserProfile>) {
    setProfile((current) => (current ? { ...current, ...patch } : current));
    setSaved(false);
  }

  function updateWeeklyGoal(rawValue: string) {
    const digitsOnly = rawValue.replace(/\D/g, "");
    setWeeklyGoalInput(digitsOnly);
    const parsed = parsePositiveInt(digitsOnly);
    if (parsed) patchLocal({ weekly_goal_questions: parsed });
  }

  function normalizeWeeklyGoal() {
    if (!profile) return;
    const parsed = parsePositiveInt(weeklyGoalInput);
    if (!parsed) {
      setWeeklyGoalInput(String(profile.weekly_goal_questions));
      return;
    }
    setWeeklyGoalInput(String(parsed));
    patchLocal({ weekly_goal_questions: parsed });
  }

  function updateShift12h(rawValue: string) {
    const digitsOnly = rawValue.replace(/\D/g, "");
    setShift12hInput(digitsOnly);
    patchLocal({ shift_12h_capacity: digitsOnly ? Number.parseInt(digitsOnly, 10) : null });
  }

  async function addEvent() {
    if (!token || eventSaving) return;
    const label = eventLabel.trim();
    setEventError(null);
    if (!label) {
      setEventError("Informe o nome do compromisso.");
      return;
    }
    if (eventCadence === "event" && !eventDate) {
      setEventError("Selecione a data.");
      return;
    }
    if (eventCadence === "routine") {
      const used = getEffectiveRoutineHoursForWeekday(events, eventWeekday, currentTodayISO);
      if (used + eventDuration > 24) {
        setEventError(`${WEEKDAYS[eventWeekday]} ja tem ${used}h de compromissos. Ajuste a duracao ou remova um compromisso existente.`);
        return;
      }
    } else {
      const used = getEffectivePunctualHoursForDate(events, eventDate);
      if (used + eventDuration > 24) {
        setEventError(`${toDisplayDate(eventDate)} ja tem ${used}h de compromissos. Ajuste a duracao ou remova um compromisso existente.`);
        return;
      }
    }

    setEventSaving(true);
    try {
      await createEvent(token, {
        label: encodeEventLabel(label, eventCategory),
        event_type: eventCadence,
        weekday: eventCadence === "routine" ? eventWeekday : null,
        event_date: eventCadence === "event" ? eventDate : null,
        duration_hours: eventDuration,
      });
      setEventLabel("");
      if (eventCadence === "event") setEventDate("");
      setEvents(await listEvents(token));
    } catch (cause) {
      setEventError(getErrorMessage(cause, "Não foi possível adicionar o compromisso."));
    } finally {
      setEventSaving(false);
    }
  }

  async function removeEvent(id: string) {
    if (!token) return;
    setEventError(null);
    try {
      await deleteEvent(token, id, { scope: "future", effective_from: currentTodayISO });
      setEvents(await listEvents(token));
    } catch (cause) {
      setEventError(getErrorMessage(cause, "Não foi possível remover o compromisso."));
    }
  }

  async function save() {
    if (!token || !profile || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const next = await updateProfile(token, {
        weekly_goal_questions: profile.weekly_goal_questions,
        shift_12h_capacity: profile.shift_12h_capacity,
        reschedule_mode: profile.reschedule_mode,
        weekly_goal_notifications_enabled:
          profile.weekly_goal_notifications_enabled,
        calendar_change_alerts_enabled:
          profile.calendar_change_alerts_enabled,
        calendar_recommendations_enabled:
          profile.calendar_recommendations_enabled,
        default_feedback_timing: profile.default_feedback_timing,
        default_feedback_reveal_policy: profile.default_feedback_reveal_policy,
        has_chosen_feedback_default: true,
      });
      await putFsrsConfig(token, { desired_retention: retention });
      setProfile(next);
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar as preferências.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 py-8" aria-busy="true">
        <div className="h-9 w-56 animate-pulse bg-edge" />
        <div className="h-32 animate-pulse border-y border-edge bg-surface" />
        <div className="h-32 animate-pulse border-y border-edge bg-surface" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="py-10 text-sm text-danger" role="alert">
        {error ?? "Preferências indisponíveis."}
      </p>
    );
  }

  return (
    <div className={`mx-auto max-w-4xl ${BOTTOM_ACTION_BAR_RESERVE_CLASS}`}>
      <div className="divide-y divide-edge">
        <section className="py-7">
          <SectionTitle
            icon={Target}
            title="Rotina"
            description="Meta, capacidade e compromissos que bloqueiam ou reduzem a carga de estudo."
          />
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Questões por semana</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={weeklyGoalInput}
                    onChange={(event) => updateWeeklyGoal(event.target.value)}
                    onBlur={normalizeWeeklyGoal}
                    className="paper-control mt-2 min-h-11 w-full border border-edge bg-surface px-3 text-sm text-ink"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Trabalho 12h</span>
                  <div className="mt-2 flex min-h-11 items-center rounded-control border border-edge bg-surface px-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={shift12hInput}
                      onChange={(event) => updateShift12h(event.target.value)}
                      placeholder="?"
                      className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
                    />
                    <span className="text-xs text-muted">questões</span>
                  </div>
                </label>
              </div>

              <div>
                <p className="text-sm font-semibold text-ink">Reagendamento</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {RESCHEDULE_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => patchLocal({ reschedule_mode: mode.value })}
                      className={`paper-control min-h-9 border px-3 text-xs font-semibold transition-colors ${
                        profile.reschedule_mode === mode.value
                          ? "border-primary bg-primary text-primaryInk"
                          : "border-edge text-muted hover:border-primary hover:text-ink"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-edge bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Adicionar compromisso</p>
                  <p className="mt-1 text-xs text-muted">Filtra a rotina entre trabalho e outros bloqueios.</p>
                </div>
                <SegmentedToggle
                  value={eventCadence}
                  onChange={setEventCadence}
                  ariaLabel="Tipo de compromisso"
                  options={[
                    { value: "routine", label: "Recorrente" },
                    { value: "event", label: "Pontual" },
                  ]}
                />
              </div>

              {eventCadence === "routine" ? (
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setEventWeekday(index)}
                      className={`paper-control min-h-8 border px-2.5 text-xs font-semibold ${
                        eventWeekday === index
                          ? "border-primary bg-primary text-primaryInk"
                          : "border-edge text-muted hover:text-ink"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="paper-control min-h-10 w-full border border-edge bg-paper px-3 text-sm text-ink sm:max-w-56"
                  title={eventDate ? toDisplayDate(eventDate) : undefined}
                />
              )}

              <div className="flex flex-wrap gap-2">
                {[
                  { value: "work" as const, label: "Trabalho" },
                  { value: "other" as const, label: "Outros" },
                ].map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setEventCategory(category.value)}
                    className={`paper-control min-h-9 border px-3 text-xs font-semibold ${
                      eventCategory === category.value
                        ? "border-primary bg-primary text-primaryInk"
                        : "border-edge text-muted hover:text-ink"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_auto]">
                <input
                  type="text"
                  placeholder={eventCategory === "work" ? "Ex. Plantao/UBS" : "Ex. Viagem"}
                  value={eventLabel}
                  onChange={(event) => setEventLabel(event.target.value)}
                  className="paper-control min-h-11 w-full border border-edge bg-paper px-3 text-sm text-ink"
                />
                <select
                  value={eventDuration}
                  onChange={(event) => setEventDuration(Number(event.target.value))}
                  className="paper-control min-h-11 w-full border border-edge bg-paper px-3 text-sm text-ink"
                >
                  {DURATIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {duration}h
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={addEvent}
                  loading={eventSaving}
                  leftIcon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}
                >
                  Adicionar
                </Button>
              </div>

              {eventError ? <p className="text-xs text-danger" role="alert">{eventError}</p> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Recorrentes</p>
                  {routineEvents.length ? (
                    <ul className="mt-2 divide-y divide-edge">
                      {routineEvents.map((event) => (
                        <li key={event.event_id} className="flex min-h-10 items-center gap-2 py-2 text-sm">
                          <span className="min-w-0 flex-1 truncate text-ink">
                            {event.weekday !== null ? WEEKDAYS[event.weekday] : "?"} - {displayEventLabel(event.label, "work")} ({event.duration_hours}h)
                          </span>
                          <button
                            type="button"
                            onClick={() => removeEvent(event.event_id)}
                            className="p-1.5 text-muted hover:text-danger"
                            title="Remover compromisso"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted">Nenhum compromisso fixo.</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Pontuais</p>
                  {upcomingPunctualEvents.length ? (
                    <ul className="mt-2 divide-y divide-edge">
                      {upcomingPunctualEvents.map((event) => (
                        <li key={event.event_id} className="flex min-h-10 items-center gap-2 py-2 text-sm">
                          <span className="min-w-0 flex-1 truncate text-ink">
                            {toDisplayDate(event.event_date ?? "")} - {displayEventLabel(event.label, "other")} ({event.duration_hours}h)
                          </span>
                          <button
                            type="button"
                            onClick={() => removeEvent(event.event_id)}
                            className="p-1.5 text-muted hover:text-danger"
                            title="Remover compromisso"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted">Nenhum compromisso pontual futuro.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {targetExamCapability?.enabled ? (
          <section className="py-7">
            <SectionTitle
              icon={Crosshair}
              title="Prova alvo"
              description="Escolha até três provas entre as que o banco de questões tem. Suas sessões passam a priorizar essas bancas, e a data ancora o cronograma."
            />
            <TargetExamSelector token={token} mode="preferences" />
          </section>
        ) : null}

        {/* Caminho canônico: só aparece quando existe edição editorial publicada.
            Antes disso, renderizar a seção mostrava um aviso de indisponibilidade
            sobre o qual o aluno não pode agir — ruído, não informação. */}
        {objectivesCapability?.enabled ? (
          <section className="py-7">
            <SectionTitle
              icon={Target}
              title="Objetivo de residência"
              description="Escolha instituição e programa; o processo, a edição e a data vêm do catálogo editorial verificado."
            />
            <ObjectiveSelector
              token={token}
              mode="preferences"
              capabilityEnabled={objectivesCapability?.enabled ?? false}
              capabilityReady={objectivesCapability?.can_start_action ?? false}
              unavailableReason={objectivesCapability?.reason}
            />
          </section>
        ) : null}

        <section className="py-7">
          <SectionTitle
            icon={Bell}
            title="Alertas"
            description="Os alertas importantes vêm ligados por padrão e podem ser silenciados aqui."
          />
          <div className="mt-2">
            <PreferenceToggle
              checked={profile.weekly_goal_notifications_enabled}
              onChange={(checked) =>
                patchLocal({ weekly_goal_notifications_enabled: checked })
              }
              label="Meta semanal em risco"
              description="Avise quando o ritmo da semana indicar que a meta pode não ser alcançada."
            />
            <PreferenceToggle
              checked={profile.calendar_change_alerts_enabled}
              onChange={(checked) =>
                patchLocal({ calendar_change_alerts_enabled: checked })
              }
              label="Mudanças bruscas no calendário"
              description="Peça confirmação para alterações que concentrem carga ou contrariem o planejamento."
            />
          </div>
        </section>

        <section className="py-7">
          <SectionTitle
            icon={CalendarClock}
            title="Recomendações e correção"
            description="Defina quanto o sistema participa do planejamento e quando o gabarito aparece no Banco."
          />
          <div className="mt-2">
            <PreferenceToggle
              checked={profile.calendar_recommendations_enabled}
              onChange={(checked) =>
                patchLocal({ calendar_recommendations_enabled: checked })
              }
              label="Recomendações no calendário"
              description="Sugira Kros, provas e novos temas nos espaços adequados, sem agendar automaticamente."
            />
          </div>
          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-ink">
              Feedback padrão após o resultado
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-control border border-edge bg-paper p-1">
              {(
                [
                  ["guided_choice", "Escolher por questão"],
                  ["reveal_all", "Revelar tudo ao finalizar"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`paper-control cursor-pointer px-3 py-3 text-center text-sm font-semibold transition-colors ${
                    profile.default_feedback_reveal_policy === value
                      ? "bg-primary text-primaryInk"
                      : "text-muted hover:bg-surfaceMuted hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="feedback-reveal-policy"
                    value={value}
                    checked={profile.default_feedback_reveal_policy === value}
                    onChange={() =>
                      patchLocal({ default_feedback_reveal_policy: value })
                    }
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="py-7">
          <SectionTitle
            icon={Layers3}
            title="Cards"
            description="A retenção desejada controla o ritmo do FSRS somente nos flashcards."
          />
          <label className="mt-5 block max-w-xl">
            <span className="flex items-center justify-between gap-4 text-sm font-semibold text-ink">
              Retenção desejada
              <span>{Math.round(retention * 100)}%</span>
            </span>
            <input
              type="range"
              min="0.8"
              max="0.95"
              step="0.01"
              value={retention}
              onChange={(event) => {
                setRetention(Number(event.target.value));
                setSaved(false);
              }}
              className="mt-4 w-full accent-[var(--color-primary)]"
            />
            <span className="mt-2 block text-xs leading-5 text-muted">
              Valores maiores aumentam a frequência das revisões de Cards.
            </span>
          </label>
        </section>
      </div>

      <BottomActionBar
        maxWidthClassName="max-w-4xl"
        className="mt-4"
        status={
          <>
          {error ? (
            <span className="text-danger" role="alert">
              {error}
            </span>
          ) : saved ? (
            <span className="inline-flex items-center gap-2 text-success">
              <Check className="h-4 w-4" aria-hidden="true" />
              Preferências salvas
            </span>
          ) : (
            <span className="text-muted">Revise os ajustes antes de salvar.</span>
          )}
          </>
        }
      >
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={save}
          disabled={saving}
          loading={saving}
          leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
          className="w-full sm:w-auto"
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </BottomActionBar>
    </div>
  );
}
