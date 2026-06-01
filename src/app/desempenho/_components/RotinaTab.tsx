import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useState, useEffect, useCallback } from "react";
import type { CalendarEventOut, WorkloadDay } from "@/lib/api";
import {
  deleteNotificationSubscription,
  getNotificationSettings,
  getVapidPublicKey,
  saveNotificationSubscription,
  updateNotificationSettings,
} from "@/lib/api";
import { browserUnsubscribe, requestAndSubscribe } from "@/lib/notificationService";
import { NAV_OPEN_EVENT } from "@/components/Nav";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";

function rangeStyle(value: number, min: number, max: number): CSSProperties {
  const pct = ((value - min) / (max - min)) * 100;
  return {
    "--track-bg": `linear-gradient(to right, var(--range-fill, #1A1A1A) 0%, var(--range-fill, #1A1A1A) ${pct}%, var(--range-rest, #E2E2DC) ${pct}%, var(--range-rest, #E2E2DC) 100%)`,
  } as CSSProperties;
}
import { IconGear, IconMenu, IconTrash } from "./PerfilIcons";
import {
  clampRetentionPct,
  displayEventLabel,
  DURATIONS,
  EventCategory,
  HelpPopupPosition,
  RESCHEDULE_MODES,
  RETENTION_DEFAULT,
  RETENTION_MAX,
  RETENTION_MIN,
  toDisplayDate,
  WEEKDAYS,
} from "../_lib/perfilShared";

type NotificationSettings = {
  notify_streak: boolean;
  notify_weekly_goal: boolean;
  notify_important_topic: boolean;
  notify_theory_review: boolean;
  is_active: boolean;
};

function NotificationSettingsPanel({ token }: { token: string }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    if (currentPermission === "granted" && token) {
      setSettingsLoading(true);
      getNotificationSettings(token)
        .then(setSettings)
        .catch((err) => console.error("notification_settings_fetch_failed", err))
        .finally(() => setSettingsLoading(false));
    }
  }, [token]);

  const handleEnable = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const { public_key } = await getVapidPublicKey(token);
      const sub = await requestAndSubscribe(public_key);
      if (!sub) {
        setPermission(Notification.permission as NotificationPermission);
        setMsg("Permissão negada.");
        return;
      }
      await saveNotificationSubscription(token, sub.toJSON() as PushSubscriptionJSON);
      setSettingsLoading(true);
      const s = await getNotificationSettings(token);
      setSettings(s);
      setPermission("granted");
      setMsg("Notificações ativadas!");
    } catch {
      setMsg("Erro ao ativar notificações.");
    } finally {
      setSettingsLoading(false);
      setLoading(false);
    }
  }, [token]);

  const handleDisable = useCallback(async () => {
    setLoading(true);
    try {
      await deleteNotificationSubscription(token);
      await browserUnsubscribe();
      setSettings(null);
      setMsg("Notificações desativadas.");
    } catch {
      setMsg("Erro ao desativar.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleToggle = useCallback(
    async (key: keyof Omit<NotificationSettings, "is_active">, value: boolean) => {
      if (!settings) return;
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      try {
        await updateNotificationSettings(token, { [key]: value });
      } catch {
        setSettings(settings);
      }
    },
    [token, settings]
  );

  const LABELS: { key: keyof Omit<NotificationSettings, "is_active">; label: string }[] = [
    { key: "notify_streak", label: "Streak em risco" },
    { key: "notify_weekly_goal", label: "Meta semanal em risco" },
    { key: "notify_important_topic", label: "Tema importante desassistido" },
    { key: "notify_theory_review", label: "Tema precisando de revisão teórica" },
  ];

  return (
    <div className="rounded-xl border border-edge p-3 space-y-3 mb-4 text-center md:text-left">
      <p className="text-xs text-muted uppercase tracking-wide">Notificações</p>

      {permission === "unsupported" && (
        <p className="text-xs text-muted">Seu navegador não suporta notificações.</p>
      )}

      {permission === "denied" && (
        <p className="text-xs text-muted">
          Notificações bloqueadas no navegador. Habilite nas configurações do navegador.
        </p>
      )}

      {permission === "default" && (
        <button
          onClick={handleEnable}
          disabled={loading}
          className="rounded-xl border border-edge px-3 py-1.5 text-xs text-muted hover:border-primary hover:text-ink disabled:opacity-50"
        >
          {loading ? "Aguarde…" : "Ativar notificações"}
        </button>
      )}

      {permission === "granted" && settingsLoading && (
        <div className="space-y-2">
          <div className="mx-auto h-3 w-32 animate-pulse rounded bg-edge md:mx-0" />
          <div className="mx-auto h-3 w-40 animate-pulse rounded bg-edge md:mx-0" />
          <div className="mx-auto h-3 w-36 animate-pulse rounded bg-edge md:mx-0" />
        </div>
      )}

      {permission === "granted" && settings?.is_active && (
        <>
          <div className="space-y-2">
            {LABELS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-xs text-muted justify-center md:justify-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => handleToggle(key, e.target.checked)}
                  className="accent-ink"
                />
                {label}
              </label>
            ))}
          </div>
          <button
            onClick={handleDisable}
            disabled={loading}
            className="text-xs text-muted underline underline-offset-2 hover:text-ink disabled:opacity-50"
          >
            Desativar tudo
          </button>
        </>
      )}

      {permission === "granted" && settings !== null && !settings.is_active && (
        <button
          onClick={handleEnable}
          disabled={loading || settingsLoading}
          className="rounded-xl border border-edge px-3 py-1.5 text-xs text-muted hover:border-primary hover:text-ink disabled:opacity-50"
        >
          {loading ? "Aguarde…" : "Reativar notificações"}
        </button>
      )}

      {permission === "granted" && settings === null && !loading && !settingsLoading && (
        <button
          onClick={handleEnable}
          disabled={loading}
          className="rounded-xl border border-edge px-3 py-1.5 text-xs text-muted hover:border-primary hover:text-ink disabled:opacity-50"
        >
          Ativar notificações
        </button>
      )}

      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}

type Props = {
  token: string;
  displayName: string;
  weeklyGoalInput: string;
  handleWeeklyGoalInputChange: (rawValue: string) => void;
  normalizeWeeklyGoalInputOnBlur: () => void;
  workload: WorkloadDay[];
  adaptiveQuestionsByDate: Map<string, number>;
  maxAdaptiveLoad: number;
  saveProfile: () => void | Promise<void>;
  savedMsg: string;
  profileError: string;
  showSettings: boolean;
  setShowSettings: Dispatch<SetStateAction<boolean>>;
  showHelp: boolean;
  setShowHelp: Dispatch<SetStateAction<boolean>>;
  helpPosition: HelpPopupPosition | null;
  setHelpPosition: Dispatch<SetStateAction<HelpPopupPosition | null>>;
  openHelpTooltip: (target: EventTarget | null) => void;
  avg12h: string;
  setAvg12h: Dispatch<SetStateAction<string>>;
  showRetentionHelp: boolean;
  setShowRetentionHelp: Dispatch<SetStateAction<boolean>>;
  retentionHelpPosition: HelpPopupPosition | null;
  setRetentionHelpPosition: Dispatch<SetStateAction<HelpPopupPosition | null>>;
  openRetentionHelpTooltip: (target: EventTarget | null) => void;
  retention: string;
  setRetention: Dispatch<SetStateAction<string>>;
  hasCustomParams: boolean;
  resetFsrsParams: () => void | Promise<void>;
  saveTolerance: () => void | Promise<void>;
  evError: string;
  eventCadence: "routine" | "event";
  setEventCadence: Dispatch<SetStateAction<"routine" | "event">>;
  eventWeekday: number;
  setEventWeekday: Dispatch<SetStateAction<number>>;
  eventDate: string;
  setEventDate: Dispatch<SetStateAction<string>>;
  eventCategory: EventCategory;
  setEventCategory: Dispatch<SetStateAction<EventCategory>>;
  eventLabel: string;
  setEventLabel: Dispatch<SetStateAction<string>>;
  eventDuration: number;
  setEventDuration: Dispatch<SetStateAction<number>>;
  addEvent: () => void | Promise<void>;
  routineEvents: CalendarEventOut[];
  punctualEvents: CalendarEventOut[];
  removeEvent: (id: string) => void | Promise<void>;
  rescheduleMode: string;
  setRescheduleMode: Dispatch<SetStateAction<string>>;
};

export function RotinaTab({
  token,
  displayName,
  weeklyGoalInput,
  handleWeeklyGoalInputChange,
  normalizeWeeklyGoalInputOnBlur,
  workload,
  adaptiveQuestionsByDate,
  maxAdaptiveLoad,
  saveProfile,
  savedMsg,
  profileError,
  showSettings,
  setShowSettings,
  showHelp,
  setShowHelp,
  helpPosition,
  setHelpPosition,
  openHelpTooltip,
  avg12h,
  setAvg12h,
  showRetentionHelp,
  setShowRetentionHelp,
  retentionHelpPosition,
  setRetentionHelpPosition,
  openRetentionHelpTooltip,
  retention,
  setRetention,
  hasCustomParams,
  resetFsrsParams,
  saveTolerance,
  evError,
  eventCadence,
  setEventCadence,
  eventWeekday,
  setEventWeekday,
  eventDate,
  setEventDate,
  eventCategory,
  setEventCategory,
  eventLabel,
  setEventLabel,
  eventDuration,
  setEventDuration,
  addEvent,
  routineEvents,
  punctualEvents,
  removeEvent,
  rescheduleMode,
  setRescheduleMode,
}: Props) {
  const isDesktopNavigation = useDesktopNavigationMode();
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [punctualTab, setPunctualTab] = useState<"upcoming" | "history">("upcoming");
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const upcomingPunctualEvents = punctualEvents
    .filter((event) => !!event.event_date && event.event_date >= todayISO)
    .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  const historyPunctualEvents = punctualEvents
    .filter((event) => !!event.event_date && event.event_date < todayISO)
    .sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""));
  const punctualTabEvents = punctualTab === "upcoming" ? upcomingPunctualEvents : historyPunctualEvents;

  return (
    <div className="space-y-8 max-w-md mx-auto md:max-w-none md:mx-0">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold leading-tight md:text-4xl">Metas</h1>
        </div>
        {!isDesktopNavigation && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(NAV_OPEN_EVENT))}
            className="mt-2 p-1 text-muted hover:text-ink shrink-0"
            aria-label="Menu"
          >
            <IconMenu className="w-5 h-5" />
          </button>
        )}
      </header>

      <hr className="border-edge" />

      <section className="space-y-4">
        <div className="relative flex items-center justify-center md:justify-start">
          <p className="text-xs text-ink uppercase tracking-wide font-bold">Meta semanal</p>
          <button
            onClick={() => setShowNotifSettings((v) => !v)}
            className="text-muted hover:text-ink absolute right-0 top-1/2 -translate-y-1/2"
            title="Configurações de notificações"
          >
            <IconGear className="w-4 h-4" />
          </button>
        </div>
        {showNotifSettings && <NotificationSettingsPanel token={token} />}
        <label className="text-sm text-muted flex items-center justify-center md:justify-start gap-2">
          <span className="w-36 shrink-0">Questões por semana</span>
          <input type="number" min={1} value={weeklyGoalInput}
            onChange={(e) => handleWeeklyGoalInputChange(e.target.value)}
            onBlur={normalizeWeeklyGoalInputOnBlur}
            className="w-28 border border-edge bg-paper px-2 py-1 text-sm text-center" />
        </label>
        {workload.length === 7 && (
          <div className="space-y-2">
            <p className="text-xs text-muted text-center md:text-left">Carga diária estimada</p>
            <div className="flex items-end gap-1 h-28">
              {workload.map((day) => {
                const displayQ = adaptiveQuestionsByDate.get(day.date) ?? day.load;
                const displayHeight = Math.round((displayQ / maxAdaptiveLoad) * 100);
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs text-muted">{displayQ}</span>
                    <div className="w-full bg-edge relative" style={{ height: "64px" }}>
                      <div className="absolute bottom-0 w-full bg-ink" style={{ height: `${displayHeight}%` }} />
                    </div>
                    <span className="text-xs text-muted">{WEEKDAYS[day.weekday]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-center justify-center md:justify-start gap-3">
          <button onClick={saveProfile} className="rounded-xl border border-primary bg-primary px-4 py-1.5 text-sm font-semibold text-primaryInk hover:opacity-90 transition-opacity">Salvar meta</button>
          {savedMsg && <span className="text-sm text-muted">{savedMsg}</span>}
          {profileError && <span className="text-sm text-danger">{profileError}</span>}
        </div>
      </section>

      <hr className="border-edge" />

      <div>
        <div className="relative mb-4 flex items-center justify-center md:justify-start">
          <p className="text-xs text-ink uppercase tracking-wide font-bold text-center md:text-left">Eventos</p>
          <button onClick={() => setShowSettings((v) => !v)} className="text-muted hover:text-ink absolute right-0 top-1/2 -translate-y-1/2" title="Configurações de tolerância">
            <IconGear className="w-4 h-4" />
          </button>
        </div>

        {showSettings && (
          <div className="rounded-xl border border-edge p-3 space-y-3 mb-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <p className="text-xs text-muted uppercase tracking-wide">Capacidade por turno</p>
              <div className="relative">
                <button type="button"
                  className="w-4 h-4 rounded-full border border-edge text-muted text-[10px] leading-none flex items-center justify-center hover:border-ink"
                  onMouseEnter={(e) => openHelpTooltip(e.currentTarget)}
                  onMouseLeave={() => setShowHelp(false)}
                  onClick={(e) => {
                    if (showHelp) {
                      setShowHelp(false);
                      setHelpPosition(null);
                    } else {
                      openHelpTooltip(e.currentTarget);
                    }
                  }}
                >
                  ?
                </button>
                {showHelp && (
                  <div
                    className="fixed z-30 bg-paper border border-edge p-2 text-xs text-muted shadow-sm break-words whitespace-normal"
                    style={{
                      left: `${helpPosition?.left ?? 12}px`,
                      top: `${helpPosition?.top ?? 12}px`,
                      width: `${helpPosition?.width ?? 280}px`,
                    }}
                  >
                    Informe quantas questões em média você estima fazer durante trabalho/plantão de 12h. O sistema vai usar isso como base para calcular quanto você tolera fazer de questões nos demais compromissos
                  </div>
                )}
              </div>
            </div>
            <label className="text-xs text-muted flex items-center justify-center md:justify-start gap-2">
              Trabalho 12h
              <input type="text" inputMode="numeric" value={avg12h}
                onChange={(e) => setAvg12h(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="?" className="border border-edge w-14 px-1 py-0.5 text-sm bg-paper text-center" />
              <span className="text-muted">q</span>
            </label>
            <hr className="border-edge" />
            <div className="space-y-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <p className="text-xs text-muted uppercase tracking-wide">Intensidade</p>
                <div className="relative">
                  <button type="button"
                    className="w-4 h-4 rounded-full border border-edge text-muted text-[10px] leading-none flex items-center justify-center hover:border-ink"
                    onMouseEnter={(e) => openRetentionHelpTooltip(e.currentTarget)}
                    onMouseLeave={() => setShowRetentionHelp(false)}
                    onClick={(e) => {
                      if (showRetentionHelp) {
                        setShowRetentionHelp(false);
                        setRetentionHelpPosition(null);
                      } else {
                        openRetentionHelpTooltip(e.currentTarget);
                      }
                    }}
                  >
                    ?
                  </button>
                  {showRetentionHelp && (
                    <div
                      className="fixed z-30 bg-paper border border-edge p-2 text-xs text-muted shadow-sm break-words whitespace-normal"
                      style={{
                        left: `${retentionHelpPosition?.left ?? 12}px`,
                        top: `${retentionHelpPosition?.top ?? 12}px`,
                        width: `${retentionHelpPosition?.width ?? 280}px`,
                      }}
                    >
                      Define o quão rígido será o algoritmo de revisão espaçada. Intensidade alta irá cobrar um percentual alto de acertos para espaçar mais as revisões, baixa ele irá ficar satisfeito com um percentual menor. Não recomendamos mudar o que vem por padrão, apenas em caso de insatisfação com o espaçamento das revisões.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-xs text-muted">Baixa</span>
                <input
                  type="range"
                  min={RETENTION_MIN}
                  max={RETENTION_MAX}
                  step={1}
                  value={clampRetentionPct(parseFloat(retention))}
                  onChange={(e) => setRetention(String(clampRetentionPct(Number(e.target.value))))}
                  className="w-full max-w-xs cursor-pointer"
                  style={rangeStyle(clampRetentionPct(parseFloat(retention)), RETENTION_MIN, RETENTION_MAX)}
                />
                <span className="text-xs text-muted">Alta</span>
              </div>
              {clampRetentionPct(parseFloat(retention)) !== RETENTION_DEFAULT && (
                <div className="flex justify-center md:justify-start">
                  <button
                    type="button"
                    className="text-xs text-muted underline underline-offset-2 hover:text-ink"
                    onClick={() => setRetention(String(RETENTION_DEFAULT))}
                  >
                    Voltar
                  </button>
                </div>
              )}
              {hasCustomParams && (
                <div className="flex justify-center md:justify-start">
                  <button type="button" onClick={resetFsrsParams}
                    className="text-xs text-muted border border-edge px-2 py-0.5">
                    Redefinir calibração personalizada
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-center md:justify-start gap-2">
              <button onClick={saveTolerance} className="rounded-xl border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primaryInk hover:opacity-90">Salvar</button>
              <button onClick={() => setShowSettings(false)} className="rounded-xl border border-edge px-3 py-1.5 text-xs text-muted hover:border-primary hover:text-ink">Cancelar</button>
            </div>
          </div>
        )}
        {evError && <p className="text-sm text-danger mb-3 text-center md:text-left">{evError}</p>}

        <section className="space-y-4">
          <h3 className="text-base font-serif text-muted text-center md:text-left">Adicionar compromisso</h3>
          <div className="space-y-2">
            <div className="flex gap-2 justify-center md:justify-start">
              {[
                { value: "routine" as const, label: "Recorrente" },
                { value: "event" as const, label: "Pontual" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setEventCadence(item.value)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${eventCadence === item.value ? "border-ink bg-ink text-paper" : "border-edge text-muted"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {eventCadence === "routine" ? (
              <div className="flex flex-wrap gap-1 justify-center md:justify-start">
                {WEEKDAYS.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => setEventWeekday(i)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors ${eventWeekday === i ? "border-ink bg-ink text-paper" : "border-edge text-muted"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex justify-center md:justify-start">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="border border-edge bg-paper px-2 py-1 text-sm w-full max-w-[18rem]"
                  title={eventDate ? toDisplayDate(eventDate) : undefined}
                />
              </div>
            )}

            <div className="flex gap-2 justify-center md:justify-start">
              {[
                { value: "work" as const, label: "Trabalho" },
                { value: "other" as const, label: "Outros" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setEventCategory(item.value)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${eventCategory === item.value ? "border-ink bg-ink text-paper" : "border-edge text-muted"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-end">
              <input
                type="text"
                placeholder={eventCategory === "work" ? "Ex. Plantão/UBS" : "Ex. Imprevisto/Viagem"}
                value={eventLabel}
                onChange={(e) => setEventLabel(e.target.value)}
                className="border border-edge bg-paper px-2 py-1 text-sm w-full min-w-0"
              />
              <select
                value={eventDuration}
                onChange={(e) => setEventDuration(Number(e.target.value))}
                className="border border-edge bg-paper px-2 py-1 text-sm w-full sm:w-auto"
              >
                {DURATIONS.map((d) => <option key={d} value={d}>{d}h</option>)}
              </select>
              <button onClick={addEvent} className="rounded-xl border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primaryInk hover:opacity-90 w-full sm:w-auto">+ Adicionar</button>
            </div>
          </div>
        </section>

        <hr className="border-edge my-4" />

        <section className="space-y-4">
          <h3 className="text-base font-serif text-muted text-center md:text-left">Recorrentes</h3>
          {routineEvents.length === 0 ? (
            <p className="text-sm text-muted text-center md:text-left">Nenhum evento fixo.</p>
          ) : (
            <ul className="space-y-1">
              {routineEvents.map((ev) => (
                <li key={ev.event_id} className="flex justify-between items-center gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {ev.weekday !== null ? WEEKDAYS[ev.weekday] : "?"} - {displayEventLabel(ev.label, "work")} ({ev.duration_hours}h)
                  </span>
                  <button onClick={() => removeEvent(ev.event_id)} className="text-muted hover:text-ink" title="Remover">
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="border-edge my-4" />

        <section className="space-y-4">
          <h3 className="text-base font-serif text-muted text-center md:text-left">Pontuais</h3>
          <div className="flex items-center justify-center md:justify-start gap-1">
            <button
              type="button"
              onClick={() => setPunctualTab("upcoming")}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${punctualTab === "upcoming" ? "border-ink bg-ink text-paper" : "border-edge text-muted"}`}
            >
              Próximos
            </button>
            <button
              type="button"
              onClick={() => setPunctualTab("history")}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${punctualTab === "history" ? "border-ink bg-ink text-paper" : "border-edge text-muted"}`}
            >
              Histórico
            </button>
          </div>
          {punctualTabEvents.length === 0 ? (
            <p className="text-sm text-muted text-center md:text-left">
              {punctualTab === "upcoming" ? "Nenhum evento pontual futuro." : "Nenhum evento no histórico."}
            </p>
          ) : (
            <ul className="space-y-1">
              {punctualTabEvents.map((ev) => (
                <li key={ev.event_id} className="flex justify-between items-center gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {toDisplayDate(ev.event_date ?? "")} - {displayEventLabel(ev.label, "other")} ({ev.duration_hours}h)
                  </span>
                  {punctualTab === "upcoming" && (
                    <button onClick={() => removeEvent(ev.event_id)} className="text-muted hover:text-ink" title="Remover">
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <hr className="border-edge" />

      <section className="space-y-3">
        <p className="text-xs text-ink uppercase tracking-wide font-bold text-center md:text-left">Reagendamento automático</p>
        <div className="flex gap-2 justify-center md:justify-start">
          {RESCHEDULE_MODES.map(({ value, label }) => (
            <button key={value} onClick={() => setRescheduleMode(value)}
              className={`text-xs px-3 py-1 rounded-lg border transition-colors ${rescheduleMode === value ? "border-ink bg-ink text-paper" : "border-edge text-muted"}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted text-center md:text-left">
          {rescheduleMode === "suggest" && "Você vai receber sugestões para aprovar ou recusar reagendamentos quando não atingir a meta."}
          {rescheduleMode === "auto" && "Reagendamentos acontecem automaticamente."}
          {rescheduleMode === "never" && "Sem sugestões de reagendamento."}
        </p>
        <div className="flex items-center justify-center md:justify-start gap-3">
          <button onClick={saveProfile} className="rounded-xl border border-primary bg-primary px-4 py-1.5 text-sm font-semibold text-primaryInk hover:opacity-90">Salvar</button>
          {savedMsg && <span className="text-sm text-muted">{savedMsg}</span>}
          {profileError && <span className="text-sm text-danger">{profileError}</span>}
        </div>
      </section>
    </div>
  );
}
