"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, BrainCircuit, Clock3, ShieldCheck } from "lucide-react";

import {
  createQuestionBankSession,
  getQuestionBankPerformance,
  type QuestionBankPerformance,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { BottomActionBar, BOTTOM_ACTION_BAR_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const KROS_SIZES = [50, 100] as const;

function estimatedMinutes(size: (typeof KROS_SIZES)[number]): number {
  return size === 50 ? 75 : 150;
}

export default function KrosPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [size, setSize] = useState<(typeof KROS_SIZES)[number]>(50);
  const [performance, setPerformance] = useState<QuestionBankPerformance | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    getQuestionBankPerformance(token).then(setPerformance).catch(() => undefined);
  }, []);

  const diagnostic = useMemo(() => {
    if (!performance?.first_attempt_accuracy) {
      return "O primeiro Kros estabelece sua linha de base.";
    }
    return `Sua linha de base atual é ${Math.round(performance.first_attempt_accuracy * 100)}% na primeira tentativa.`;
  }, [performance]);

  async function startKros() {
    const token = getAuthToken();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await createQuestionBankSession(token, {
        session_kind: "kros",
        feedback_timing: "post_result",
        limit: size,
      });
      router.push(`/banco/sessao/${session.session_id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível montar o Kros agora.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`relative min-h-[calc(100vh-5rem)] ${BOTTOM_ACTION_BAR_RESERVE_CLASS}`}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-44 border-b border-edge bg-surfaceMuted"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      />

      <section className="grid gap-5 pb-6 pt-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end" aria-labelledby="kros-title">
        <div className="max-w-3xl">
          <div className="mb-4 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/kros-logo-vector.svg"
              alt=""
              className="h-9 w-9 dark:invert"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Kros
            </span>
          </div>
          <h1 id="kros-title" className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Simulador adaptativo
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Uma prova inédita montada pelas suas necessidades, pelas instituições
            prioritárias e pelo que ainda falta cobrir.
          </p>
        </div>
        <p className="rounded-surface border border-edge bg-surface p-4 text-sm leading-6 text-muted shadow-soft">
          {diagnostic}
        </p>
      </section>

      <Card as="main" padded={false}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section aria-labelledby="kros-size-title" className="p-4 sm:p-5">
            <h2 id="kros-size-title" className="text-base font-semibold text-ink">
              Tamanho da prova
            </h2>
            <div
              className="mt-4 grid grid-cols-2 gap-1 rounded-control border border-edge bg-paper p-1"
              role="radiogroup"
              aria-label="Quantidade de questões"
            >
              {KROS_SIZES.map((option) => {
                const active = option === size;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSize(option)}
                    className={`paper-control relative min-h-24 px-4 py-3 text-left transition-colors ${
                      active
                        ? "bg-primary text-primaryInk"
                        : "text-muted hover:bg-surfaceMuted hover:text-ink"
                    }`}
                  >
                    <span className="block text-3xl font-semibold">{option}</span>
                    <span className="mt-1 block text-xs">questões inéditas</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-surface border border-edge bg-paper p-4">
                <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">
                  {estimatedMinutes(size)} min
                </p>
                <p className="mt-1 text-xs text-muted">tempo sugerido</p>
              </div>
              <div className="rounded-surface border border-edge bg-paper p-4">
                <BrainCircuit className="h-5 w-5 text-primary" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">Adaptativo</p>
                <p className="mt-1 text-xs text-muted">seleção personalizada</p>
              </div>
              <div className="rounded-surface border border-edge bg-paper p-4">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">Pós-resultado</p>
                <p className="mt-1 text-xs text-muted">gabarito ao enviar</p>
              </div>
            </div>
          </section>

          <aside className="flex flex-col justify-end border-t border-edge p-4 sm:p-5 lg:border-l lg:border-t-0">
            <p className="text-sm leading-6 text-muted">
              O resultado alimenta sua adaptabilidade e fica identificado como
              Kros na Evolução e no calendário.
            </p>
            <BottomActionBar
              maxWidthClassName="max-w-lg lg:max-w-none"
              className="mt-6 md:mt-6"
              status={error ? <span className="text-danger" role="alert">{error}</span> : null}
            >
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={startKros}
                disabled={busy}
                loading={busy}
                className="w-full sm:w-auto"
              >
                {busy ? "Montando prova..." : `Iniciar Kros de ${size}`}
                {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </BottomActionBar>
          </aside>
        </div>
      </Card>
    </div>
  );
}
