"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ContaSection } from "./_components/ContaSection";
import { MinhaSemana } from "./_components/MinhaSemana";
import { FolhaDePlantao } from "./_components/FolhaDePlantao";
import { Bell, Calendar as CalendarClock, CalendarDays as CalendarPlus, Check, Goal, NotepadText as Layers3, Repeat, Target, Trash2 as Trash2 } from "lucide-react";

import {
  createEvent,
  deleteEvent,
  getCapabilities,
  getFsrsConfig,
  getProfile,
  getMyTargetExam,
  listEvents,
  putFsrsConfig,
  updateProfile,
  type CalendarEventOut,
  type CapabilityStatus,
  type UserProfile,
  getAPIErrorMessage,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

import { getOnboarding, saveOnboardingCapacity } from "@/lib/api/domains/study-plan";
import { queryKeys } from "@/lib/queryKeys";
import { getStudentToday } from "@/lib/api/domains/student-experience";
import {
  filterEffectivePunctualEvents,
  filterEffectiveRoutineEvents,
  getEffectivePunctualHoursForDate,
  getEffectiveRoutineHoursForWeekday,
} from "@/lib/calendarEventVisibility";
import { getErrorMessage } from "@/lib/error-utils";
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
        className="relative mt-0.5 h-6 w-11 shrink-0 bg-edge transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
      >
        <span className="absolute left-1 top-1 h-4 w-4 bg-paper transition-transform peer-checked:translate-x-5" />
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
  // A semana padrao vem de `study_availability` (weekday -> minutos), que ate'
  // agora so' era escrito pelo questionario inicial e nunca mais relido.
  const [disponibilidade, setDisponibilidade] = useState<Record<string, number> | null>(
    null,
  );
  const [salvandoSemana, setSalvandoSemana] = useState(false);
  const queryClient = useQueryClient();
  // Procedencia da taxa: a frase muda entre "no seu ritmo" e "supondo N min".
  const [minutosPorQuestao, setMinutosPorQuestao] = useState(2);
  const [ritmoEhDoAluno, setRitmoEhDoAluno] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [folhaDePlantaoAberta, setFolhaDePlantaoAberta] = useState(false);
  /**
   * Dias ate a prova declarada.
   *
   * Chegava a `MinhaSemana` como `null` FIXO, entao a frase "Faltam N dias ate
   * a sua prova" nunca podia aparecer -- e a folha do plantao nao tinha
   * horizonte para expandir a escala 24x72. `days_remaining` ja viaja em
   * `StudentTargetExamItemOut`; faltava alguem le-lo.
   *
   * `null` continua sendo resposta legitima: sem prova declarada nao ha
   * contagem, e a folha cai num horizonte de oito semanas dizendo isso.
   */
  const [diasAteAProva, setDiasAteAProva] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getProfile(token),
      listEvents(token).catch(() => []),
      getFsrsConfig(token),
      getCapabilities(token).catch(() => ({ capabilities: [] })),
      // As duas ultimas sao INFORMATIVAS: sem elas a semana ainda edita e
      // salva. Falhar aqui nao pode fechar a tela de preferencias inteira.
      getOnboarding(token).catch(() => null),
      getStudentToday(token).catch(() => null),
      getMyTargetExam(token).catch(() => null),
    ])
      .then(([nextProfile, nextEvents, fsrs, capabilities, onboarding, hoje, provaAlvo]) => {
        // A primeira prova declarada e' a principal — a mesma precedencia que o
        // Hoje e o Plano usam.
        setDiasAteAProva(provaAlvo?.items?.[0]?.days_remaining ?? null);
        setProfile(nextProfile);
        setEvents(nextEvents);
        // `.catch` no fetch protege REJEICAO, nao resposta com outra forma.
        // Quando `getCapabilities` resolve sem o campo `capabilities`, o
        // `.find` estoura DENTRO do `.then` — e a excecao cai no `.catch` de
        // baixo, que a imprime na tela. Foi assim que a pagina de preferencias
        // apareceu com "Cannot read properties of undefined (reading 'find')"
        // ao lado do botao Salvar.
        const capabilityList = Array.isArray(capabilities?.capabilities)
          ? capabilities.capabilities
          : [];
        setObjectivesCapability(
          capabilityList.find((item) => item.key === "student_objectives_v2") ?? null,
        );
        setTargetExamCapability(
          capabilityList.find((item) => item.key === "target_exam_v1") ?? null,
        );
        setWeeklyGoalInput(String(nextProfile.weekly_goal_questions));
        setShift12hInput(nextProfile.shift_12h_capacity == null ? "" : String(nextProfile.shift_12h_capacity));
        setRetention(fsrs.desired_retention);
        // `null` quando a leitura falhou; `{}` quando o aluno nunca declarou.
        // A tela distingue os dois, e colapsa-los mostraria a semana em branco
        // depois de uma falha de rede.
        setDisponibilidade(onboarding ? (onboarding.study_availability ?? {}) : null);
        const orcamento = hoje?.effort_budget ?? null;
        if (orcamento?.minutes_per_question) {
          setMinutosPorQuestao(orcamento.minutes_per_question);
          setRitmoEhDoAluno(orcamento.pace_source === "observed");
        }
      })
      .catch((cause) => {
        // A mensagem tecnica vai para o console, nunca para o aluno: `cause`
        // pode carregar detalhe de rede, de provedor ou um TypeError nosso, e
        // nenhum deles diz ao aluno o que fazer.
        console.error("preferencias: falha ao carregar", cause);
        setError("Não foi possível abrir as preferências. Tente recarregar a página.");
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
  // ⚠️ SEM GUARD DE `token`: ele e' SEMPRE "" por desenho.
  //
  // `getAuthToken()` (`lib/auth.ts:29`) retorna string vazia de proposito -- a
  // sessao vive num cookie httpOnly que o BFF le e converte em
  // `Authorization`. O token nunca chega ao JavaScript, e nunca vai chegar.
  //
  // Um `if (!token) return` aqui e' portanto SEMPRE verdadeiro: a funcao
  // inteira nunca corria.
    if (eventSaving) return;
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
    setEventError(null);
    try {
      await deleteEvent(token, id, { scope: "future", effective_from: currentTodayISO });
      setEvents(await listEvents(token));
    } catch (cause) {
      setEventError(getErrorMessage(cause, "Não foi possível remover o compromisso."));
    }
  }

  async function salvarSemana(proxima: Record<string, number>) {
    setSalvandoSemana(true);
    setError(null);
    try {
      // O mesmo endpoint do questionario inicial. `save_capacity` nao rebaixa
      // aluno pronto (`_advance` devolve "ready") e regenera a trilha por conta
      // propria -- que e' exatamente o "o plano se refaz" que a tela promete.
      const estado = await saveOnboardingCapacity(token, proxima, null);
      setDisponibilidade(estado.study_availability ?? proxima);
      // ⚠️ O SERVIDOR JA' REFEZ O PLANO, e o cliente ainda tem o antigo em
      // cache. Sem esta invalidacao o aluno salva a semana, vai para o Hoje e ve
      // o dia montado pela rotina ANTIGA -- o pior momento possivel para o
      // produto parecer que ignorou o que ele acabou de dizer.
      await queryClient.invalidateQueries({ queryKey: queryKeys.studentToday });
      await queryClient.invalidateQueries({ queryKey: queryKeys.studentAgendaAll });
      await queryClient.invalidateQueries({ queryKey: queryKeys.studyPlanCurrent });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rotinaDoPlano });
    } catch (cause) {
      setError(
        getErrorMessage(cause, "Não foi possível salvar a sua semana. Tente de novo."),
      );
    } finally {
      setSalvandoSemana(false);
    }
  }

  /**
   * A ASSINATURA DO QUE SE GRAVA.
   *
   * Sem ela o `useEffect` abaixo entraria em laco: `save()` termina com
   * `setProfile(next)` — a resposta do servidor —, e um efeito que observa
   * `profile` dispararia de novo com o proprio resultado. Comparar a assinatura
   * do que FOI gravado com a do que esta na tela corta o ciclo sem depender de
   * igualdade referencial, que `updateProfile` nunca preserva.
   */
  const assinaturaDoQueSeGrava = profile
    ? JSON.stringify([
        profile.weekly_goal_questions,
        profile.shift_12h_capacity,
        profile.reschedule_mode,
        profile.weekly_goal_notifications_enabled,
        profile.calendar_change_alerts_enabled,
        profile.calendar_recommendations_enabled,
        profile.default_feedback_timing,
        profile.default_feedback_reveal_policy,
        retention,
      ])
    : null;
  const ultimaGravada = useRef<string | null>(null);

  /**
   * ⚠️ A TELA GRAVA SOZINHA, e o botao "Salvar" saiu.
   *
   * Ele vivia numa `BottomActionBar` — uma faixa fixa colada por cima da barra
   * de abas. O operador apontou o que nenhuma rede social faz: empilhar duas
   * barras no rodape do celular, comendo ~110px da tela e escondendo o fim do
   * conteudo atras de duas linhas de chrome.
   *
   * A saida nao e' mudar o botao de lugar: e' nao precisar dele. Ajuste de
   * preferencia nao tem "rascunho" — nao ha estado intermediario que valha
   * confirmar, e as Definicoes de qualquer telemovel gravam ao toque ha uma
   * decada. O que o aluno precisa saber e' que gravou, e isso e' uma linha de
   * texto, nao um botao.
   *
   * 700ms porque o unico campo que se digita aqui e' a meta semanal: gravar a
   * cada tecla mandaria "2", "24", "240" ao servidor.
   */
  useEffect(() => {
    if (!profile || !assinaturaDoQueSeGrava) return;
    // A primeira passagem so' registra o que veio do servidor: ela nao e' uma
    // mudanca do aluno.
    if (ultimaGravada.current === null) {
      ultimaGravada.current = assinaturaDoQueSeGrava;
      return;
    }
    if (ultimaGravada.current === assinaturaDoQueSeGrava) return;
    const marca = window.setTimeout(() => {
      ultimaGravada.current = assinaturaDoQueSeGrava;
      void save();
    }, 700);
    return () => window.clearTimeout(marca);
    // `save` e' recriada a cada render e nao entra na lista de proposito: quem
    // decide gravar e' a mudanca da ASSINATURA, nao a identidade da funcao.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaDoQueSeGrava, token, profile !== null]);

  async function save() {
    if (!profile || saving) return;
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
      console.error("preferencias: falha ao salvar", cause);
      setError(getAPIErrorMessage(cause) ?? "Não foi possível salvar as preferências.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 py-8" aria-busy="true">
        <div className="h-9 w-56 paper-skeleton" />
        <div className="h-32 paper-skeleton border-y border-edge" />
        <div className="h-32 paper-skeleton border-y border-edge" />
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
    <div className="mx-auto max-w-4xl">
      <div className="divide-y divide-edge">
        {/* ── Minha semana (artboard `14a`) ──────────────────────────────
            Entra ANTES de tudo porque e' a unica coisa nesta pagina que o
            plano do dia consome diretamente. Ate' agora `study_availability`
            so' era escrito no questionario inicial e nunca mais relido: o
            aluno respondia "quanto tempo por dia" uma vez, na vida, sem porta
            de volta. */}
        <section className="py-7">
          <SectionTitle
            icon={CalendarClock}
            title="Minha semana"
            description="Quanto dá para estudar em cada tipo de dia. É daqui que sai o tamanho do seu dia."
          />
          <div className="mt-5">
            <MinhaSemana
              eventos={events}
              disponibilidade={disponibilidade}
              hojeISO={currentTodayISO}
              minutosPorQuestao={minutosPorQuestao}
              ritmoEhDoAluno={ritmoEhDoAluno}
              // Era `null` fixo: a frase "Faltam N dias até a sua prova" nunca
              // podia aparecer, e a folha do plantão não tinha horizonte para
              // expandir a escala. `days_remaining` vem da prova-alvo declarada.
              diasAteAProva={diasAteAProva}
              salvando={salvandoSemana}
              onSalvar={salvarSemana}
              // ⚠️ ABRE UMA FOLHA, e nao ROLA para outra secao.
              //
              // Isto chamava `scrollIntoView` ate o painel generico "Adicionar
              // compromisso", ~150 linhas abaixo: o medico tocava em "adicionar
              // plantao" e a tela deslizava para outro assunto, com um campo de
              // nome obrigatorio que o artboard `14b` proibe em letra.
              onAdicionar={() => setFolhaDePlantaoAberta(true)}
              onRemoverExcecao={(evento) => {
                void removeEvent(evento.event_id);
              }}
            />
          </div>
          {/* A folha e' DONA da propria gravacao: ela cria o evento, expande a
              escala e devolve a lista nova. A pagina so' diz se ela esta aberta
              -- estado de formulario que vive na tela que o contem e' como uma
              pagina de mil linhas nasce. */}
          <FolhaDePlantao
            aberta={folhaDePlantaoAberta}
            token={token}
            hojeISO={currentTodayISO}
            diasAteAProva={diasAteAProva}
            onFechar={() => setFolhaDePlantaoAberta(false)}
            onCriado={setEvents}
          />
        </section>

        <section className="py-7">
          <SectionTitle
            icon={Repeat}
            title="Compromissos e metas"
            description="Meta semanal e os compromissos que bloqueiam ou reduzem a carga de estudo."
          />
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="space-y-5">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
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
              </div>

              {/* O PLANTÃO SAIU DE PAR COM A META SEMANAL.
                  Os dois ficavam lado a lado, mesmo tamanho, mesma tipografia —
                  mas "questões por semana" é a meta que governa todo dia, e a
                  capacidade em dia de plantão é ajuste que se faz uma vez e
                  quase nunca se revisita. Peso visual igual para frequências
                  tão diferentes cobra atenção que a segunda não merece.

                  Fica recolhido, e o resumo mostra o valor atual — quem só
                  quer conferir não precisa abrir. `<details>` e não estado em
                  React: é o comportamento nativo, funciona sem JavaScript e
                  não acrescenta re-render a uma tela que já tem muitos.

                  O placeholder era `?`, que não dizia se a pergunta era sobre
                  quantas questões cabem ou quantas se tolera. Agora a pergunta
                  está escrita por extenso. */}
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-xs text-muted transition-colors hover:text-ink">
                  <span className="transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                  Capacidade em dia de plantão de 12h
                  <span className="ml-auto font-mono tabular-nums">
                    {shift12hInput ? `${shift12hInput} questões` : "não definida"}
                  </span>
                </summary>
                <label className="mt-2 block max-w-xs">
                  <span className="text-xs leading-5 text-muted">
                    Em dia de plantão de 12 horas, quantas questões você consegue
                    fazer sem que o estudo vire fardo? Deixe vazio se preferir que
                    a gente estime.
                  </span>
                  <div className="mt-2 flex min-h-11 items-center rounded-control border border-edge bg-surface px-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={shift12hInput}
                      onChange={(event) => updateShift12h(event.target.value)}
                      placeholder="estimar"
                      className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
                    />
                    <span className="text-xs text-muted">questões</span>
                  </div>
                </label>
              </details>

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

            <div
              id="adicionar-compromisso"
              className="scroll-alvo space-y-4 rounded-surface border border-edge bg-surface p-4"
            >
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
                  aria-label={eventCategory === "work" ? "Nome do plantão" : "Nome do compromisso"}
                  placeholder={eventCategory === "work" ? "Ex. Plantao/UBS" : "Ex. Viagem"}
                  value={eventLabel}
                  onChange={(event) => setEventLabel(event.target.value)}
                  className="paper-control min-h-11 w-full border border-edge bg-paper px-3 text-sm text-ink"
                />
                <select
                  aria-label="Duração em horas"
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
                  <p className="paper-eyebrow">Recorrentes</p>
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
                  <p className="paper-eyebrow">Pontuais</p>
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
          /* `id` e `scroll-mt`: `/mapa` manda quem ainda não declarou prova para
             cá, e sem âncora ele aterrissava no topo da página — a seção acima
             desta tem ~240 linhas de formulário de rotina, então a decisão que
             o trouxe nasce abaixo da dobra. O `scroll-mt` desconta o cabeçalho
             fixo, que senão cobre o título da seção. */
          <section id="prova-alvo" className="scroll-mt-24 py-7">
            <SectionTitle
              icon={Goal}
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
              description="Sugira sessões, provas e novos temas nos espaços adequados, sem agendar automaticamente."
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

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-ink">
              Quando declarar confiança
            </legend>
            {/* Dois eixos independentes: QUANDO ver o gabarito (acima) e QUANDO
                declarar confiança (aqui). Antes só existia o primeiro, e a etapa
                de confiança ficava presa a sessões de simulado, sem escolha. */}
            <p className="mt-1 max-w-[68ch] font-serif text-sm leading-6 text-muted">
              No fim, com a sessão inteira fresca e antes de qualquer gabarito, mede o quanto você
              sabe que sabe. A cada questão é outro ritmo: registra a dúvida no calor dela.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-control border border-edge bg-paper p-1">
              {(
                [
                  ["post_session", "No fim da sessão"],
                  ["per_question", "A cada questão"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`paper-control cursor-pointer px-3 py-3 text-center text-sm font-semibold transition-colors ${
                    profile.confidence_timing === value
                      ? "bg-primary text-primaryInk"
                      : "text-muted hover:bg-surfaceMuted hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="confidence-timing"
                    value={value}
                    checked={profile.confidence_timing === value}
                    onChange={() => patchLocal({ confidence_timing: value })}
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

      {/* O estado do que a tela grava sozinha.

          `aria-live="polite"` e nao `role="status"` com foco: quem usa leitor
          de tela precisa saber que gravou, e nao ser interrompido no meio de um
          controle para ouvi-lo. Erro e' a excecao — ele vai em `role="alert"`,
          porque ai a interrupcao e' o ponto.

          A linha nao desaparece depois de gravar: "guardado" que some deixa a
          pessoa sem saber se viu ou imaginou. */}
      <p
        className="mt-6 min-h-6 font-mono text-nota tabular-nums text-muted"
        aria-live="polite"
      >
        {error ? (
          <span className="text-danger" role="alert">
            {error}
          </span>
        ) : saving ? (
          "guardando…"
        ) : saved ? (
          <span className="inline-flex items-center gap-1.5 text-success">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            guardado
          </span>
        ) : (
          "as mudanças guardam sozinhas"
        )}
      </p>

      <ContaSection />
    </div>
  );
}
