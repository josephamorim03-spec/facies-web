"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createQuestionBankSession,
  previewQuestionBankAvailability,
  type QuestionBankAvailability,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

const AREAS = [
  { value: "", label: "Todas" },
  { value: "GO", label: "GO" },
  { value: "CM", label: "Clínica Médica" },
  { value: "CG", label: "Cirurgia" },
  { value: "MP", label: "Preventiva" },
  { value: "PD", label: "Pediatria" },
] as const;

const INSTITUTIONS = ["USP-SP", "UNIFESP", "ENARE", "SUS-SP", "SANTA CASA", "FMUSP"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Mode = "simulation" | "training" | "weakness";

function IconTimer({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="13" r="8" />
      <polyline points="12 9 12 13 14 15" />
      <line x1="9" y1="2" x2="15" y2="2" />
    </svg>
  );
}

function IconBook({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function IconTarget({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

type ModeIcon = (props: { className?: string }) => React.JSX.Element;

const MODES: { id: Mode; label: string; description: string; Icon: ModeIcon }[] = [
  {
    id: "simulation",
    label: "Simular prova",
    description: "Faça um simulado no padrão da prova real, sem feedback durante.",
    Icon: IconTimer,
  },
  {
    id: "training",
    label: "Aprender um tema",
    description: "Estude um assunto do início ao fim com questões e feedback imediato.",
    Icon: IconBook,
  },
  {
    id: "weakness",
    label: "Corrigir fraquezas",
    description: "Treine seus pontos fracos com base no seu desempenho.",
    Icon: IconTarget,
  },
];

export default function ProvasPage() {
  const { token, tokenResolved } = useAuthToken();
  const router = useRouter();

  const [selectedMode, setSelectedMode] = useState<Mode>("simulation");
  const [area, setArea] = useState("");
  const [institution, setInstitution] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [limit, setLimit] = useState(40);
  const [availability, setAvailability] = useState<QuestionBankAvailability | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedYearFrom = yearFrom ? Number(yearFrom) || undefined : undefined;
  const parsedYearTo = yearTo ? Number(yearTo) || undefined : undefined;
  const maxSelectable = Math.min(50, availability?.max_selectable ?? 50);
  const clampedLimit = Math.max(1, Math.min(limit, maxSelectable));

  async function checkAvailability() {
    if (!tokenResolved) return;
    setChecking(true);
    try {
      const result = await previewQuestionBankAvailability(token, {
        area: area || undefined,
        institution: institution.trim() || undefined,
        year_from: parsedYearFrom,
        year_to: parsedYearTo,
        answer_status: "unanswered",
        only_unanswered: true,
      });
      setAvailability(result);
      if (result.max_selectable > 0 && limit > result.max_selectable) {
        setLimit(result.max_selectable);
      }
    } catch {
      setAvailability(null);
    } finally {
      setChecking(false);
    }
  }

  async function startSession() {
    if (!tokenResolved) return;
    setBusy(true);
    setError(null);
    try {
      const isWeakness = selectedMode === "weakness";
      const created = await createQuestionBankSession(token, {
        mode: isWeakness ? "adaptive" : "by_topic",
        resolution_mode: selectedMode === "simulation" ? "simulation" : "training",
        area: area || undefined,
        institution: institution.trim() || undefined,
        year_from: parsedYearFrom,
        year_to: parsedYearTo,
        limit: clampedLimit,
        only_unanswered: true,
        answer_status: "unanswered",
      });
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a sessão.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink md:px-6 md:py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">KrosMed</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Monte sua sessão
          </h1>
          <p className="mt-2 text-sm text-muted">Escolha como deseja estudar e personalize sua sessão.</p>
        </header>

        {/* Mode selection */}
        <section className="grid gap-4 md:grid-cols-3">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSelectedMode(mode.id)}
              className={cx(
                "rounded-2xl border p-5 text-left transition-colors",
                selectedMode === mode.id
                  ? "border-primary bg-surfaceMuted"
                  : "border-edge bg-surface hover:border-primary",
              )}
            >
              <mode.Icon className="w-6 h-6 text-muted" />
              <p className="mt-3 text-base font-semibold text-ink">{mode.label}</p>
              <p className="mt-1 text-xs text-muted leading-relaxed">{mode.description}</p>
            </button>
          ))}
        </section>

        <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
          {/* Filters */}
          <section className="km-card p-5 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Filtros da sessão</p>

            {/* Area */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Área</label>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => { setArea(a.value); setAvailability(null); }}
                    className={cx("km-chip", area === a.value && "km-chip-active")}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Institution */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Instituição</label>
              <input
                value={institution}
                onChange={(e) => { setInstitution(e.target.value); setAvailability(null); }}
                placeholder="USP, UNIFESP, ENARE..."
                className="w-full"
              />
              <div className="flex flex-wrap gap-1.5">
                {INSTITUTIONS.map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => { setInstitution(inst); setAvailability(null); }}
                    className={cx("km-chip text-xs", institution === inst && "km-chip-active")}
                  >
                    {inst}
                  </button>
                ))}
              </div>
            </div>

            {/* Year range */}
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Ano inicial</span>
                <input
                  type="number" min={1990} max={2026} value={yearFrom}
                  onChange={(e) => { setYearFrom(e.target.value); setAvailability(null); }}
                  placeholder="2020"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Ano final</span>
                <input
                  type="number" min={1990} max={2026} value={yearTo}
                  onChange={(e) => { setYearTo(e.target.value); setAvailability(null); }}
                  placeholder="2025"
                />
              </label>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Quantidade · {clampedLimit} questões
              </label>
              <input
                type="range" min={5} max={maxSelectable} value={clampedLimit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full"
                aria-label="Quantidade de questões"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>5</span>
                <span>{maxSelectable}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void checkAvailability()}
              disabled={checking}
              className="rounded-xl border border-edge px-4 py-2 text-sm font-semibold text-muted hover:border-primary hover:text-ink disabled:opacity-50"
            >
              {checking ? "Verificando…" : "Verificar disponibilidade"}
            </button>
          </section>

          {/* Session summary */}
          <section className="km-card flex flex-col gap-5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Resumo da sessão</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-muted shrink-0" aria-hidden="true">
                  <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4" />
                  <rect x="9" y="2" width="6" height="4" rx="1" />
                  <line x1="9" y1="12" x2="15" y2="12" />
                  <line x1="9" y1="16" x2="13" y2="16" />
                </svg>
                <div>
                  <p className="text-xs text-muted">Número de questões</p>
                  <p className="text-2xl font-bold text-ink">{clampedLimit}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-muted shrink-0" aria-hidden="true">
                  <circle cx="12" cy="13" r="8" />
                  <polyline points="12 9 12 13 14 15" />
                  <line x1="9" y1="2" x2="15" y2="2" />
                </svg>
                <div>
                  <p className="text-xs text-muted">Tempo estimado</p>
                  <p className="text-xl font-bold text-ink">
                    {Math.floor(clampedLimit * 1.5)}–{Math.ceil(clampedLimit * 2)} min
                  </p>
                </div>
              </div>
              {availability && (
                <div className="rounded-xl border border-edge bg-surfaceMuted p-3 text-sm">
                  <p className="font-semibold text-ink">{availability.unanswered_count} questões disponíveis</p>
                  <p className="text-xs text-muted">{availability.answered_count} já realizadas</p>
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-xl border border-danger bg-surface p-3 text-xs text-danger">{error}</p>
            )}

            <button
              type="button"
              onClick={() => void startSession()}
              disabled={busy || !tokenResolved}
              className="mt-auto w-full rounded-xl border border-primary bg-primary py-3 text-sm font-semibold text-primaryInk shadow-sm hover:brightness-105 disabled:opacity-50"
            >
              {busy ? "Iniciando…" : `Iniciar sessão →`}
            </button>
            <p className="text-center text-xs text-muted">Sua sessão será salva automaticamente</p>
          </section>
        </div>
      </div>
    </main>
  );
}
