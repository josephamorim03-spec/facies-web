"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, ShieldCheck, Sparkles } from "lucide-react";

import {
  createQuestionBankSession,
  getQuestionBankPerformance,
  type QuestionBankPerformance,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { Alert } from "@/components/ui/Alert";
import { BottomActionBar, BOTTOM_ACTION_BAR_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { KrosGlyph } from "@/components/KrosGlyph";
import { KrosBaseline } from "./_components/KrosBaseline";
import {
  KrosSizeChooser,
  estimatedMinutes,
  type KrosSize,
} from "./_components/KrosSizeChooser";

export default function KrosPage() {
  const router = useRouter();
  const [size, setSize] = useState<KrosSize>(50);
  const [performance, setPerformance] = useState<QuestionBankPerformance | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      disabled={busy}
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
          {`Iniciar Kros de ${size}`}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </>
      )}
    </Button>
  );

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
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
          Uma prova inédita montada pelas suas necessidades, pelas instituições
          prioritárias e pelo que ainda falta cobrir.
        </p>
      </header>

      <KrosBaseline performance={performance} loading={loadingPerformance} />

      <section aria-labelledby="kros-size-title" className="border-y border-edge py-4">
        <h2 id="kros-size-title" className="font-serif text-xl font-semibold text-ink">
          Tamanho da prova
        </h2>

        <KrosSizeChooser value={size} onChange={setSize} disabled={busy} />

        {/* Uma linha discreta no lugar de três caixas: as informações são
            as mesmas, mas param de competir com a escolha acima. */}
        <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-t border-edge pt-5">
          <div className="flex items-center gap-2.5">
            <Clock3 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <dt className="sr-only">Tempo sugerido</dt>
            <dd className="text-sm text-muted">
              <span className="font-semibold text-ink">{estimatedMinutes(size)} min</span>
              {" · tempo sugerido"}
            </dd>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <dt className="sr-only">Seleção</dt>
            <dd className="text-sm text-muted">
              <span className="font-semibold text-ink">Adaptativo</span>
              {" · seleção personalizada"}
            </dd>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <dt className="sr-only">Gabarito</dt>
            <dd className="text-sm text-muted">
              <span className="font-semibold text-ink">Pós-resultado</span>
              {" · gabarito ao enviar"}
            </dd>
          </div>
        </dl>
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
