"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "pixelarticons/react";

import {
  buildNavigationRoute,
  createQuestionBankSession,
  getNavigationPrompt,
  resolveNavigationRoute,
  type KrosMode,
  type NavigationEnergy,
  type NavigationPrompt,
  type NavigationRoute,
  type NavigationRouteStatus,
  getAPIErrorMessage,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { BottomActionBar, BOTTOM_ACTION_BAR_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { KrosGlyph } from "@/components/KrosGlyph";
import { KrosComposition } from "./_components/KrosComposition";
import { KROS_MODE_OPTIONS, KrosModeChooser } from "./_components/KrosModeChooser";
import { ENERGY_LABEL, RotaPrompt } from "./_components/RotaPrompt";
import { RotaResultado } from "./_components/RotaResultado";
import { RotaSizeBand } from "./_components/RotaSizeBand";
import { useKrosPreview } from "./_hooks/useKrosPreview";

/** Espelha `KROS_MINUTES_PER_QUESTION`. Só vale até a primeira prévia chegar —
 *  daí em diante o tamanho e a faixa vêm do servidor, que é quem valida. */
const FALLBACK_MINUTES_PER_QUESTION = 1.5;
const FALLBACK_SIZE = 30;

/** A energia sugere o modo; o aluno pode discordar num `<details>`.
 *
 *  Sem energia para gastar, treinar terreno novo rende pouco: o certo é
 *  consolidar onde já houve erro. Com energia alta acontece o inverso — é a hora
 *  de encarar o que ainda não foi visto. */
const MODE_FOR_ENERGY: Record<NavigationEnergy, KrosMode> = {
  low: "prioridade_erros",
  normal: "equilibrado",
  high: "terreno_novo",
};

type Step = "prompt" | "route" | "questions";

export default function RotaPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("prompt");
  const [prompt, setPrompt] = useState<NavigationPrompt | null>(null);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [declaredMinutes, setDeclaredMinutes] = useState<number>(45);
  const [declaredEnergy, setDeclaredEnergy] = useState<NavigationEnergy>("normal");

  const [modeOverride, setModeOverride] = useState<KrosMode | null>(null);
  const [size, setSize] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<NavigationRouteStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { preview, refresh } = useKrosPreview();

  useEffect(() => {
    let cancelled = false;
    getNavigationPrompt(getAuthToken())
      .then((result) => {
        if (cancelled) return;
        setPrompt(result);
        if (result.suggested_minutes) setDeclaredMinutes(result.suggested_minutes);
        if (result.suggested_energy) setDeclaredEnergy(result.suggested_energy);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestedMode = MODE_FOR_ENERGY[declaredEnergy] ?? "equilibrado";
  const noTargetBoards = preview != null && preview.target_boards.length === 0;
  const chosenMode = modeOverride ?? suggestedMode;
  // `foco_banca` nasce desabilitado sem prova alvo; se o objetivo sumir noutra
  // aba, o modo escolhido não pode prender o aluno num modo indisponível.
  const effectiveMode: KrosMode =
    chosenMode === "foco_banca" && noTargetBoards ? "equilibrado" : chosenMode;

  const available = preview?.max_available ?? null;
  const band = preview?.size_band ?? [];
  // Enquanto a prévia não chega, o tamanho vem do tempo pela mesma conta do
  // servidor. Depois dela, quem manda é `suggested_size`.
  const fallbackSize = Math.max(
    20,
    Math.round(declaredMinutes / FALLBACK_MINUTES_PER_QUESTION / 5) * 5,
  );
  const suggestedSize = preview?.suggested_size ?? fallbackSize ?? FALLBACK_SIZE;
  const selectedSize = size ?? suggestedSize;
  const deliveredSize = available == null ? selectedSize : Math.min(selectedSize, available);

  const estimatedMinutesFor = useCallback(
    (value: number) => Math.round(value * FALLBACK_MINUTES_PER_QUESTION),
    [],
  );

  useEffect(() => {
    if (step !== "questions") return;
    refresh(effectiveMode, selectedSize, declaredMinutes);
  }, [step, effectiveMode, selectedSize, declaredMinutes, refresh]);

  async function calculate(input: {
    availableMinutes: number;
    energy: NavigationEnergy;
    interruptionOverride: boolean | null;
  }) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setDeclaredMinutes(input.availableMinutes);
    setDeclaredEnergy(input.energy);
    try {
      const result = await buildNavigationRoute(getAuthToken(), {
        availableMinutes: input.availableMinutes,
        energy: input.energy,
        interruptionOverride: input.interruptionOverride,
      });
      setRoute(result);
      setResolved(null);
      setStep("route");
    } catch (cause) {
      console.error("rota: falha ao calcular", cause);
      setError(getAPIErrorMessage(cause) ?? "Não foi possível montar sua rota agora.");
    } finally {
      setBusy(false);
    }
  }

  async function resolve(status: NavigationRouteStatus) {
    if (!route?.route_id || resolving) return;
    setResolving(true);
    try {
      await resolveNavigationRoute(getAuthToken(), route.route_id, status);
      setResolved(status);
      // Aceitar é começar: leva o aluno para a primeira ação da rota.
      const first = route.actions[0]?.action?.href;
      if (status === "accepted" && first) router.push(first);
    } catch {
      // Desfecho é telemetria da decisão, não o produto: falhar aqui não pode
      // impedir o aluno de seguir para a atividade.
      setResolved(status);
    } finally {
      setResolving(false);
    }
  }

  async function startSession() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await createQuestionBankSession(getAuthToken(), {
        session_kind: "kros",
        feedback_timing: "post_result",
        kros_mode: effectiveMode,
        limit: deliveredSize,
      });
      router.push(`/banco/sessao/${session.session_id}`);
    } catch (cause) {
      console.error("rota: falha ao montar sessão", cause);
      setError(getAPIErrorMessage(cause) ?? "Não foi possível montar a sessão agora.");
      setBusy(false);
    }
  }

  return (
    <div className={`student-page mx-auto max-w-3xl ${BOTTOM_ACTION_BAR_RESERVE_CLASS}`}>
      {error ? (
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {step === "prompt" ? (
        <RotaPrompt prompt={prompt} busy={busy} onCalculate={calculate} />
      ) : null}

      {step === "route" && route ? (
        <RotaResultado
          route={route}
          onResolve={resolve}
          resolving={resolving}
          resolved={resolved}
          onBack={() => {
            setRoute(null);
            setResolved(null);
            setStep("prompt");
          }}
          onWantQuestions={() => {
            setSize(null);
            setStep("questions");
          }}
        />
      ) : null}

      {step === "questions" ? (
        <section className="space-y-6 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-edge pb-3">
            <h1 className="font-serif text-2xl font-semibold text-ink">Sessão de questões</h1>
            <p className="paper-eyebrow">
              {declaredMinutes} min · {ENERGY_LABEL[declaredEnergy]}
            </p>
          </div>

          <RotaSizeBand
            band={band.length ? band : [suggestedSize]}
            value={selectedSize}
            maxAvailable={available}
            estimatedMinutesFor={estimatedMinutesFor}
            declaredMinutes={declaredMinutes}
            disabled={busy}
            onChange={setSize}
          />

          <details className="border-t border-edge pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-ink">
              Modo: {KROS_MODE_OPTIONS.find((o) => o.value === effectiveMode)?.label ?? "Adaptativo"}
              {modeOverride ? "" : " (sugerido pela sua energia)"}
            </summary>
            <div className="mt-4">
              <KrosModeChooser
                value={effectiveMode}
                onChange={setModeOverride}
                disabled={busy}
                targetBoards={preview?.target_boards ?? []}
                unsatisfiedTargetBoards={preview?.unsatisfied_target_boards ?? []}
              />
            </div>
          </details>

          <KrosComposition composition={preview?.composition ?? null} loading={!preview} />
        </section>
      ) : null}

      {step === "questions" ? (
        <BottomActionBar>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={startSession}
            disabled={busy}
            aria-busy={busy}
            className="w-full sm:w-auto"
          >
            {busy ? (
              <>
                <KrosGlyph className="h-4 w-4" motion="busy" />
                Montando sessão...
              </>
            ) : (
              <>
                {`Iniciar · ${deliveredSize} questões`}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
          <Button type="button" variant="ghost" size="md" disabled={busy} onClick={() => setStep("route")}>
            Voltar à rota
          </Button>
        </BottomActionBar>
      ) : null}
    </div>
  );
}

