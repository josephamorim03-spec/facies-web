"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import {
  completeOnboarding,
  getOnboarding,
  saveOnboardingCapacity,
  saveOnboardingObjectives,
  saveOnboardingRoutine,
  type OnboardingState,
  type OnboardingStep,
  type RoutineDayInput,
  type StudentObjectiveInput,
} from "@/lib/api/domains/study-plan";
import { getAPIErrorDetail } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WeekdayPicker } from "./_components/WeekdayPicker";

const STEPS: { key: OnboardingStep; label: string; title: string; help: string }[] = [
  {
    key: "objectives",
    label: "Objetivo",
    title: "Para qual prova você está estudando?",
    help: "Até 3 provas. A data define o horizonte do seu cronograma; a banca define o que mais cai.",
  },
  {
    key: "routine",
    label: "Rotina",
    title: "Quais dias você tem compromisso?",
    help: "Plantão, trabalho ou aula. O cronograma nunca vai agendar estudo pesado nesses dias.",
  },
  {
    key: "capacity",
    label: "Tempo",
    title: "Quanto tempo por dia?",
    help: "Deixe em zero os dias de descanso — eles ficam intocados no seu plano.",
  },
  {
    key: "ready",
    label: "Pronto",
    title: "Sua trilha está pronta",
    help: "Ela começa provisória e fica mais precisa a cada simulado diagnóstico.",
  },
];

type ObjectiveDraft = { board_code: string; exam_name: string; exam_date: string };
type RoutineDraft = { weekday: number; kind: "shift" | "work" | "other"; duration_hours: number };

const DEFAULT_MINUTES = 120;

function errorMessage(error: unknown, fallback: string): string {
  const detail = getAPIErrorDetail(error);
  if (detail && typeof detail === "object" && "message" in detail) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [step, setStep] = useState<OnboardingStep>("objectives");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [objectives, setObjectives] = useState<ObjectiveDraft[]>([
    { board_code: "", exam_name: "", exam_date: "" },
  ]);
  const [routine, setRoutine] = useState<RoutineDraft[]>([]);
  const [availability, setAvailability] = useState<Record<number, number>>({
    0: DEFAULT_MINUTES,
    1: DEFAULT_MINUTES,
    2: DEFAULT_MINUTES,
    3: DEFAULT_MINUTES,
    4: DEFAULT_MINUTES,
    5: DEFAULT_MINUTES,
    6: 0,
  });

  useEffect(() => {
    let cancelled = false;
    getOnboarding(getAuthToken())
      .then((result) => {
        if (cancelled) return;
        setState(result);
        setStep(result.next_step);
        if (Object.keys(result.study_availability).length > 0) {
          const parsed: Record<number, number> = {};
          for (const [key, minutes] of Object.entries(result.study_availability)) {
            parsed[Number(key)] = minutes;
          }
          setAvailability(parsed);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Não foi possível carregar seu questionário."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stepIndex = useMemo(() => STEPS.findIndex((s) => s.key === step), [step]);
  const current = STEPS[stepIndex] ?? STEPS[0];

  const submitObjectives = useCallback(async () => {
    const items: StudentObjectiveInput[] = objectives
      .filter((item) => item.board_code.trim())
      .map((item) => ({
        board_code: item.board_code.trim().toUpperCase(),
        exam_name: item.exam_name.trim() || null,
        exam_date: item.exam_date || null,
        date_status: item.exam_date ? "confirmed" : "estimated",
      }));
    if (items.length === 0) {
      setError("Informe pelo menos uma banca.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await saveOnboardingObjectives(
        getAuthToken(),
        items,
        state?.objectives_revision ?? null,
      );
      setState(next);
      setStep("routine");
    } catch (err) {
      setError(errorMessage(err, "Não foi possível salvar seus objetivos."));
    } finally {
      setBusy(false);
    }
  }, [objectives, state]);

  const submitRoutine = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const days: RoutineDayInput[] = routine.map((day) => ({
        weekday: day.weekday,
        label: day.kind === "shift" ? "Plantão" : day.kind === "work" ? "Trabalho" : "Compromisso",
        duration_hours: day.duration_hours,
        kind: day.kind,
      }));
      const next = await saveOnboardingRoutine(getAuthToken(), days);
      setState(next);
      setStep("capacity");
    } catch (err) {
      setError(errorMessage(err, "Não foi possível salvar sua rotina."));
    } finally {
      setBusy(false);
    }
  }, [routine]);

  const submitCapacity = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, number> = {};
      for (const [weekday, minutes] of Object.entries(availability)) {
        payload[weekday] = minutes;
      }
      const next = await saveOnboardingCapacity(getAuthToken(), payload);
      setState(next);
      setStep("ready");
    } catch (err) {
      setError(errorMessage(err, "Não foi possível salvar sua disponibilidade."));
    } finally {
      setBusy(false);
    }
  }, [availability]);

  const finish = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding(getAuthToken());
      router.push("/hoje");
    } catch (err) {
      setError(errorMessage(err, "Não foi possível gerar sua trilha."));
      setBusy(false);
    }
  }, [router]);

  const toggleRoutineDay = useCallback((weekday: number) => {
    setRoutine((previous) =>
      previous.some((day) => day.weekday === weekday)
        ? previous.filter((day) => day.weekday !== weekday)
        : [...previous, { weekday, kind: "work", duration_hours: 8 }],
    );
  }, []);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin text-muted" />
        <span className="sr-only">Carregando questionário</span>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <ol className="mb-8 flex items-center gap-2" aria-label="Etapas do questionário">
        {STEPS.map((item, index) => {
          const done = index < stepIndex;
          const active = index === stepIndex;
          return (
            <li key={item.key} className="flex flex-1 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  done
                    ? "border-success bg-success text-primaryInk"
                    : active
                      ? "border-primary bg-primary text-primaryInk"
                      : "border-edge bg-surface text-muted"
                }`}
              >
                {done ? <Check aria-hidden className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span
                className={`hidden text-xs sm:inline ${active ? "font-medium text-ink" : "text-muted"}`}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>

      <h1 className="font-serif text-2xl text-ink">{current.title}</h1>
      <p className="mt-2 text-sm text-muted">{current.help}</p>

      {error && (
        <Alert variant="danger" className="mt-4" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="mt-6 space-y-4">
        {step === "objectives" && (
          <>
            {objectives.map((objective, index) => (
              <div key={index} className="space-y-3 rounded-control border border-edge bg-surface p-4">
                <Input
                  label="Banca"
                  placeholder="ENARE, USP, UNIFESP…"
                  value={objective.board_code}
                  onChange={(event) =>
                    setObjectives((previous) =>
                      previous.map((item, i) =>
                        i === index ? { ...item, board_code: event.target.value } : item,
                      ),
                    )
                  }
                />
                <Input
                  label="Nome da prova (opcional)"
                  placeholder="ENARE 2026/2027"
                  value={objective.exam_name}
                  onChange={(event) =>
                    setObjectives((previous) =>
                      previous.map((item, i) =>
                        i === index ? { ...item, exam_name: event.target.value } : item,
                      ),
                    )
                  }
                />
                <Input
                  label="Data da prova (opcional)"
                  type="date"
                  hint="Sem data, seu plano usa uma janela de 4 semanas."
                  value={objective.exam_date}
                  onChange={(event) =>
                    setObjectives((previous) =>
                      previous.map((item, i) =>
                        i === index ? { ...item, exam_date: event.target.value } : item,
                      ),
                    )
                  }
                />
                {objectives.length > 1 && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      setObjectives((previous) => previous.filter((_, i) => i !== index))
                    }
                  >
                    Remover
                  </Button>
                )}
              </div>
            ))}
            {objectives.length < 3 && (
              <Button
                variant="secondary"
                onClick={() =>
                  setObjectives((previous) => [
                    ...previous,
                    { board_code: "", exam_name: "", exam_date: "" },
                  ])
                }
              >
                Adicionar outra prova
              </Button>
            )}
          </>
        )}

        {step === "routine" && (
          <div className="space-y-4 rounded-control border border-edge bg-surface p-4">
            <WeekdayPicker
              ariaLabel="Dias com compromisso"
              selected={routine.map((day) => day.weekday)}
              onToggle={toggleRoutineDay}
            />
            {routine.length === 0 ? (
              <p className="text-xs text-muted">
                Nenhum compromisso fixo? Tudo bem — siga para a próxima etapa.
              </p>
            ) : (
              <div className="space-y-3">
                {routine
                  .slice()
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((day) => (
                    <div
                      key={day.weekday}
                      className="flex flex-wrap items-end gap-3 border-t border-edge pt-3"
                    >
                      <span className="text-sm font-medium text-ink">
                        {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][
                          day.weekday
                        ]}
                      </span>
                      <label className="text-xs text-muted">
                        <span className="mb-1 block uppercase tracking-[0.08em]">Tipo</span>
                        <select
                          className="rounded-control border border-edge bg-surface px-2 py-2 text-sm text-ink"
                          value={day.kind}
                          onChange={(event) =>
                            setRoutine((previous) =>
                              previous.map((item) =>
                                item.weekday === day.weekday
                                  ? {
                                      ...item,
                                      kind: event.target.value as RoutineDraft["kind"],
                                      duration_hours:
                                        event.target.value === "shift" ? 12 : item.duration_hours,
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option value="work">Trabalho / aula</option>
                          <option value="shift">Plantão</option>
                          <option value="other">Outro compromisso</option>
                        </select>
                      </label>
                      <label className="text-xs text-muted">
                        <span className="mb-1 block uppercase tracking-[0.08em]">Horas</span>
                        <input
                          type="number"
                          min={1}
                          max={24}
                          className="w-20 rounded-control border border-edge bg-surface px-2 py-2 text-sm text-ink"
                          value={day.duration_hours}
                          onChange={(event) =>
                            setRoutine((previous) =>
                              previous.map((item) =>
                                item.weekday === day.weekday
                                  ? {
                                      ...item,
                                      duration_hours: Math.max(
                                        1,
                                        Math.min(24, Number(event.target.value) || 1),
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {step === "capacity" && (
          <div className="space-y-3 rounded-control border border-edge bg-surface p-4">
            {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map(
              (label, weekday) => {
                const minutes = availability[weekday] ?? 0;
                return (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <label htmlFor={`day-${weekday}`} className="text-sm text-ink">
                      {label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`day-${weekday}`}
                        type="number"
                        min={0}
                        max={960}
                        step={15}
                        className="w-24 rounded-control border border-edge bg-surface px-2 py-2 text-sm text-ink"
                        value={minutes}
                        onChange={(event) =>
                          setAvailability((previous) => ({
                            ...previous,
                            [weekday]: Math.max(
                              0,
                              Math.min(960, Number(event.target.value) || 0),
                            ),
                          }))
                        }
                      />
                      <span className="w-24 text-xs text-muted">
                        {minutes === 0 ? "descanso" : "min/dia"}
                      </span>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}

        {step === "ready" && (
          <div className="rounded-control border border-edge bg-surface p-4">
            <p className="text-sm text-ink">
              Vamos montar sua trilha agora. Ela já começa com os simulados diagnósticos —
              é com eles que o sistema aprende onde você está.
            </p>
            <p className="mt-3 text-xs text-muted">
              Você pode ajustar rotina, metas e objetivos quando quiser.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={busy || stepIndex === 0}
          leftIcon={<ArrowLeft aria-hidden className="h-4 w-4" />}
          onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)].key)}
        >
          Voltar
        </Button>
        <Button
          variant="primary"
          size="md"
          loading={busy}
          disabled={busy}
          onClick={() => {
            if (step === "objectives") return void submitObjectives();
            if (step === "routine") return void submitRoutine();
            if (step === "capacity") return void submitCapacity();
            return void finish();
          }}
        >
          {step === "ready" ? "Gerar minha trilha" : "Continuar"}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Button>
      </div>
    </main>
  );
}
