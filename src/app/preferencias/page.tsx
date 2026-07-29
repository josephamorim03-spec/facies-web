"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarClock,
  Check,
  Layers3,
  Save,
  SlidersHorizontal,
  Target,
  X,
} from "lucide-react";

import {
  getFsrsConfig,
  getProfile,
  listQuestionBankBoards,
  putFsrsConfig,
  updateProfile,
  type QuestionBankBoard,
  type UserProfile,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

type ToggleProps = {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
};

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
  const [boards, setBoards] = useState<QuestionBankBoard[]>([]);
  const [retention, setRetention] = useState(0.9);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getProfile(token),
      listQuestionBankBoards(token).catch(() => []),
      getFsrsConfig(token),
    ])
      .then(([nextProfile, nextBoards, fsrs]) => {
        setProfile(nextProfile);
        setBoards(nextBoards);
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

  const availableBoards = useMemo(() => {
    const selected = new Set(profile?.priority_boards ?? []);
    return boards.filter((board) => !selected.has(board.board_code));
  }, [boards, profile?.priority_boards]);

  function patchLocal(patch: Partial<UserProfile>) {
    setProfile((current) => (current ? { ...current, ...patch } : current));
    setSaved(false);
  }

  function addBoard(code: string) {
    if (!profile || !code || profile.priority_boards.length >= 3) return;
    patchLocal({ priority_boards: [...profile.priority_boards, code] });
  }

  function removeBoard(code: string) {
    if (!profile) return;
    patchLocal({
      priority_boards: profile.priority_boards.filter((item) => item !== code),
    });
  }

  function moveBoard(index: number, direction: -1 | 1) {
    if (!profile) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= profile.priority_boards.length) return;
    const next = [...profile.priority_boards];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    patchLocal({ priority_boards: next });
  }

  async function save() {
    if (!token || !profile || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const next = await updateProfile(token, {
        weekly_goal_questions: profile.weekly_goal_questions,
        priority_boards: profile.priority_boards,
        weekly_goal_notifications_enabled:
          profile.weekly_goal_notifications_enabled,
        calendar_change_alerts_enabled:
          profile.calendar_change_alerts_enabled,
        calendar_recommendations_enabled:
          profile.calendar_recommendations_enabled,
        default_feedback_timing: profile.default_feedback_timing,
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
    <div className="mx-auto max-w-4xl pb-12 pt-5">
      <header className="border-b border-edge pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Sua conta
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">
          Preferências
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Ajustes que mudam como a plataforma recomenda, alerta e corrige.
        </p>
      </header>

      <div className="divide-y divide-edge">
        <section className="py-7">
          <SectionTitle
            icon={Target}
            title="Rotina"
            description="A meta serve como referência semanal para o progresso e os alertas."
          />
          <label className="mt-5 block max-w-xs">
            <span className="text-sm font-semibold text-ink">Questões por semana</span>
            <input
              type="number"
              min={0}
              max={2000}
              step={10}
              value={profile.weekly_goal_questions}
              onChange={(event) =>
                patchLocal({
                  weekly_goal_questions: Math.max(
                    0,
                    Math.min(2000, Number(event.target.value) || 0),
                  ),
                })
              }
              className="mt-2 min-h-11 w-full border border-edge bg-paper px-3 text-sm text-ink"
            />
          </label>
        </section>

        <section className="py-7">
          <SectionTitle
            icon={SlidersHorizontal}
            title="Prioridades"
            description="A ordem influencia a seleção adaptativa do Kros. Você pode priorizar até três instituições ou bancas."
          />
          <ol className="mt-4 divide-y divide-edge" aria-label="Prioridades selecionadas">
            {profile.priority_boards.map((code, index) => {
              const label =
                boards.find((board) => board.board_code === code)?.board_name ??
                code;
              return (
                <li key={code} className="flex min-h-12 items-center gap-3 py-2">
                  <span className="w-6 text-sm font-semibold text-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveBoard(index, -1)}
                    disabled={index === 0}
                    className="p-2 text-muted hover:text-ink disabled:opacity-25"
                    title="Subir prioridade"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBoard(index, 1)}
                    disabled={index === profile.priority_boards.length - 1}
                    className="p-2 text-muted hover:text-ink disabled:opacity-25"
                    title="Descer prioridade"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBoard(code)}
                    className="p-2 text-muted hover:text-danger"
                    title="Remover prioridade"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
          {profile.priority_boards.length < 3 ? (
            <label className="mt-4 block max-w-md">
              <span className="sr-only">Adicionar prioridade</span>
              <select
                value=""
                onChange={(event) => addBoard(event.target.value)}
                className="min-h-11 w-full border border-edge bg-paper px-3 text-sm text-ink"
              >
                <option value="">Adicionar instituição ou banca</option>
                {availableBoards.map((board) => (
                  <option key={board.board_code} value={board.board_code}>
                    {board.board_name} ({board.question_count})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </section>

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
              Correção padrão no Banco
            </legend>
            <div className="mt-3 grid grid-cols-2 border border-edge bg-surface p-1">
              {(
                [
                  ["post_result", "Após o resultado"],
                  ["immediate", "Após cada questão"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer px-3 py-3 text-center text-sm font-semibold ${
                    profile.default_feedback_timing === value
                      ? "bg-ink text-paper"
                      : "text-muted hover:bg-surfaceMuted hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="feedback-timing"
                    value={value}
                    checked={profile.default_feedback_timing === value}
                    onChange={() =>
                      patchLocal({ default_feedback_timing: value })
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
              className="mt-4 w-full accent-[var(--primary)]"
            />
            <span className="mt-2 block text-xs leading-5 text-muted">
              Valores maiores aumentam a frequência das revisões de Cards.
            </span>
          </label>
        </section>
      </div>

      <footer className="sticky bottom-3 mt-4 flex items-center justify-between gap-4 border border-edge bg-paper px-4 py-3 shadow-[var(--soft-shadow)]">
        <div className="min-w-0 text-sm">
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
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 bg-primary px-4 text-sm font-semibold text-primaryInk disabled:opacity-60"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </footer>
    </div>
  );
}
