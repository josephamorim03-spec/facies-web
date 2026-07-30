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
import { BottomActionBar, BOTTOM_ACTION_BAR_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KrosGlyph } from "@/components/KrosGlyph";
import { KrosBaseline } from "./_components/KrosBaseline";
import { KrosConstellation } from "./_components/KrosConstellation";
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

  return (
    <div className={`relative min-h-[calc(100vh-5rem)] ${BOTTOM_ACTION_BAR_RESERVE_CLASS}`}>
      <KrosConstellation />

      <div className="student-stagger">
        <section
          className="grid gap-5 pb-6 pt-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end"
          aria-labelledby="kros-title"
        >
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-3 text-primary">
              <KrosGlyph className="h-8 w-8" motion={busy ? "busy" : "ambient"} />
              <span className="paper-eyebrow">Kros</span>
            </div>
            <h1
              id="kros-title"
              className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl"
            >
              Simulador adaptativo
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Uma prova inédita montada pelas suas necessidades, pelas instituições
              prioritárias e pelo que ainda falta cobrir.
            </p>
          </div>

          <KrosBaseline performance={performance} loading={loadingPerformance} />
        </section>

        <Card as="main" padded={false}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section aria-labelledby="kros-size-title" className="p-4 sm:p-5">
              <h2 id="kros-size-title" className="text-base font-semibold text-ink">
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

            <aside className="flex flex-col justify-end border-t border-edge p-4 sm:p-5 lg:border-l lg:border-t-0">
              <p className="text-sm leading-6 text-muted">
                O resultado alimenta sua adaptabilidade e fica identificado como
                Kros na Evolução e no calendário.
              </p>
              <BottomActionBar
                maxWidthClassName="max-w-lg lg:max-w-none"
                className="mt-6 md:mt-6"
                status={
                  error ? (
                    <span className="text-danger" role="alert">
                      {error}
                    </span>
                  ) : null
                }
              >
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
              </BottomActionBar>
            </aside>
          </div>
        </Card>
      </div>
    </div>
  );
}
