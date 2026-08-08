"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Sparkles } from "lucide-react";

import {
  createQuestionBankSession,
  getQuestionBankPerformance,
  type KrosMode,
  type QuestionBankPerformance,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { BottomActionBar, BOTTOM_ACTION_BAR_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { KrosGlyph } from "@/components/KrosGlyph";
import { KrosBaseline } from "./_components/KrosBaseline";
import { KrosComposition } from "./_components/KrosComposition";
import { KROS_MODE_OPTIONS, KrosModeChooser } from "./_components/KrosModeChooser";
import { KrosSizeSlider, estimatedMinutes } from "./_components/KrosSizeSlider";
import { useKrosPreview } from "./_hooks/useKrosPreview";

// Espelham `app/domain/kros_modes.py`. Servem só até a primeira prévia chegar —
// a partir dela a faixa vem do servidor, que é quem valida.
const FALLBACK_MIN_SIZE = 20;
const FALLBACK_MAX_SIZE = 120;
const FALLBACK_STEP = 5;
const FALLBACK_ANCHORS = [50, 100];
const DEFAULT_SIZE = 50;

export default function KrosPage() {
  const router = useRouter();
  const [mode, setMode] = useState<KrosMode>("equilibrado");
  const [size, setSize] = useState<number>(DEFAULT_SIZE);
  const [performance, setPerformance] = useState<QuestionBankPerformance | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { preview, loading: loadingPreview, refresh } = useKrosPreview();

  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();
    getQuestionBankPerformance(token)
      .then((result) => {
        if (!cancelled) setPerformance(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingPerformance(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const minSize = preview?.min_size ?? FALLBACK_MIN_SIZE;
  const step = preview?.size_step ?? FALLBACK_STEP;
  const anchors = preview?.size_anchors ?? FALLBACK_ANCHORS;
  const ceiling = Math.min(preview?.max_size ?? FALLBACK_MAX_SIZE, preview?.max_available ?? FALLBACK_MAX_SIZE);
  const poolTooSmall = preview != null && preview.max_available < minSize;
  // A barra pode ter parado acima do teto que a prévia acabou de revelar.
  const effectiveSize = Math.min(size, Math.max(ceiling, minSize));

  // `target_boards` é resolvido em qualquer modo, então o cartão do "foco na
  // banca" já nasce desabilitado para quem não tem prova alvo e o aluno
  // normalmente nem consegue escolhê-lo. Se o objetivo sumir noutra aba, porém,
  // ele ficaria preso num modo desabilitado.
  //
  // Derivado, não sincronizado por efeito: um `setMode` dentro de `useEffect`
  // dispara render em cascata (e o lint recusa, com razão). O modo escolhido
  // continua sendo do aluno; o que muda é qual vale enquanto não há banca.
  const noTargetBoards = preview != null && preview.target_boards.length === 0;
  const effectiveMode: KrosMode =
    mode === "foco_banca" && noTargetBoards ? "equilibrado" : mode;

  // A prévia segue o que está NA TELA. Antes o efeito dependia só do modo e lia
  // o `size` cru: com a barra clampada, trocar de modo pedia uma prova de 120
  // embaixo de uma barra mostrando 50.
  //
  // `effectiveSize` como dependência dispensa o `onCommit` — arrastar não gera
  // uma chamada por pixel porque `refresh` já tem debounce de 450ms, e some de
  // quebra a chamada redundante que `blur`/`keyup` disparavam sem mudança.
  useEffect(() => {
    refresh(effectiveMode, effectiveSize);
  }, [effectiveMode, effectiveSize, refresh]);

  async function startKros() {
    const token = getAuthToken();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await createQuestionBankSession(token, {
        session_kind: "kros",
        feedback_timing: "post_result",
        kros_mode: effectiveMode,
        limit: effectiveSize,
      });
      router.push(`/banco/sessao/${session.session_id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível montar o Kros agora.",
      );
      setBusy(false);
    }
  }

  const startButton = (
    <Button
      type="button"
      variant="primary"
      size="md"
      onClick={startKros}
      disabled={busy || poolTooSmall}
      aria-busy={busy}
      className={`w-full sm:w-auto ${busy ? "" : "hover-lift"}`}
    >
      {busy ? (
        <>
          <KrosGlyph className="h-4 w-4" motion="busy" />
          Montando prova...
        </>
      ) : (
        <>
          {`Iniciar Kros · ${effectiveSize} questões`}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </>
      )}
    </Button>
  );

  const modeLabel =
    KROS_MODE_OPTIONS.find((option) => option.value === effectiveMode)?.label ?? "Adaptativo";

  return (
    <div className={`space-y-5 md:space-y-6 ${BOTTOM_ACTION_BAR_RESERVE_CLASS}`}>
      <header>
        {/* Sem eyebrow "Kros": o item de menu e o titulo da barra ja nomeiam a
            tela: repetir aqui era a terceira vez na mesma dobra. O glifo fica
            ao lado do titulo, que e' onde ele ainda diz alguma coisa (o estado
            `busy` durante a montagem da prova). */}
        <div className="flex items-center gap-3">
          <h1
            id="kros-title"
            className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl"
          >
            Simulador adaptativo
          </h1>
          <KrosGlyph
            className="h-8 w-8 shrink-0 text-primary"
            motion={busy ? "busy" : "ambient"}
          />
        </div>
        {/* A promessa de "instituições prioritárias" vale só no modo "Foco na
            banca", e agora vale de verdade: a fonte deixou de ser
            `profile.priority_boards` — campo sem tela que nada escrevia — e
            passou a ser a prova alvo que o aluno declara nos objetivos. O
            cartão daquele modo nomeia a banca; prometer aqui descreveria um
            comportamento que os outros modos não têm. */}
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
          Você escolhe como treinar e o tamanho da prova. O resto é montado a partir das
          suas necessidades de aprendizado.
        </p>
      </header>

      <KrosBaseline performance={performance} loading={loadingPerformance} />

      <section aria-labelledby="kros-mode-title" className="border-y border-edge py-4">
        <h2 id="kros-mode-title" className="font-serif text-xl font-semibold text-ink">
          Modo
        </h2>
        <KrosModeChooser
          value={effectiveMode}
          onChange={setMode}
          disabled={busy}
          targetBoards={preview?.target_boards ?? []}
        />
      </section>

      <section aria-labelledby="kros-size-title" className="border-b border-edge pb-4">
        <h2 id="kros-size-title" className="font-serif text-xl font-semibold text-ink">
          Tamanho da prova
        </h2>

        {poolTooSmall ? (
          // Sem `EmptyState`: ele traz `paper-surface` e seria o único painel
          // arredondado numa página que usa réguas. Mesmo idioma do KrosBaseline.
          <div className="mt-4">
            <p className="text-sm font-semibold text-ink">
              Ainda não há questões suficientes para este modo
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Encontramos {preview?.max_available ?? 0} questões elegíveis. Troque de modo ou
              resolva mais algumas no banco para liberar o Kros.
            </p>
          </div>
        ) : (
          <>
            <KrosSizeSlider
              value={effectiveSize}
              onChange={setSize}
              min={minSize}
              max={Math.max(ceiling, minSize)}
              hardMax={preview?.max_size ?? FALLBACK_MAX_SIZE}
              step={step}
              anchors={anchors}
              disabled={busy}
            />

            <KrosComposition
              composition={preview?.composition ?? null}
              loading={loadingPreview}
            />

            <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-t border-edge pt-5">
              <div className="flex items-center gap-2.5">
                <Clock3 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <dt className="sr-only">Tempo sugerido</dt>
                <dd className="text-sm text-muted">
                  <span className="font-semibold tabular-nums text-ink">
                    {estimatedMinutes(effectiveSize)} min
                  </span>
                  {" · tempo sugerido"}
                </dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <dt className="sr-only">Modo</dt>
                <dd className="text-sm text-muted">
                  <span className="font-semibold text-ink">{modeLabel}</span>
                  {" · gabarito ao enviar"}
                </dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <section aria-label="Iniciar">
        <p className="max-w-2xl text-sm leading-6 text-muted">
          O resultado alimenta sua adaptabilidade e fica identificado como
          Kros na Evolução e no calendário.
        </p>

        {error ? (
          <Alert variant="danger" className="mt-4">
            {error}
          </Alert>
        ) : null}

        {/* No desktop a acao fica solta no fluxo, como o resto da pagina. No
            mobile a barra fixa assume -- mesmo arranjo do /banco. Antes esta
            barra morava dentro de um Card, o painel-dentro-de-painel que a
            regra do web/CLAUDE.md desaconselha. */}
        <div className="mt-5 hidden md:block">{startButton}</div>
        <BottomActionBar className="md:hidden">{startButton}</BottomActionBar>
      </section>
    </div>
  );
}
