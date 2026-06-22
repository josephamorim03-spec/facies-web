import Link from "next/link";
import type { QuestionBankLongitudinalDiagnosis } from "@/lib/api";

const CHARGE_LABELS: Record<string, string> = {
  case_based: "Caso clínico",
  isolated: "Questão isolada",
  sequential: "Sequencial",
  image_based: "Imagem",
};

const ANSWER_LABELS: Record<string, string> = {
  single_best: "Melhor alternativa",
  numerical: "Numérica",
  true_false: "V/F",
  association: "Associação",
};

const REASONING_LABELS: Record<string, string> = {
  recall: "Memorização",
  analysis: "Análise",
  application: "Aplicação",
  synthesis: "Síntese",
};

type BancoDeQuestoesInsightsProps = {
  longitudinal: QuestionBankLongitudinalDiagnosis | null;
  loading: boolean;
};

function pct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function ErrorPatternBars({
  data,
  labels,
  title,
}: {
  data: Record<string, number>;
  labels: Record<string, string>;
  title: string;
}) {
  const entries = Object.entries(data)
    .filter(([, value]) => Number(value) > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);
  if (entries.length === 0) return null;

  const max = entries[0][1] || 1;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 truncate text-muted">{labels[key] ?? key}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
              <div
                className="h-full rounded-full bg-muted"
                style={{ width: `${Math.round((value / max) * 100)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-medium">{pct(value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BancoDeQuestoesInsights({ longitudinal, loading }: BancoDeQuestoesInsightsProps) {
  if (loading && !longitudinal) {
    return (
      <section className="space-y-3 animate-pulse" aria-label="Carregando dados do banco de questões">
        <div className="h-4 w-48 rounded-sm bg-edge" />
        <div className="h-2 w-full rounded-sm bg-edge" />
        <div className="h-2 w-3/4 rounded-sm bg-edge" />
      </section>
    );
  }
  if (!longitudinal || longitudinal.total_nodes_studied === 0) return null;

  const weakNodes = [...(longitudinal.nodes ?? [])]
    .filter((node) => node.exposure_count >= 2 && node.mastery_score < 0.6)
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 5);

  const hasPatterns =
    Object.values(longitudinal.charge_pattern_errors ?? {}).some((value) => value > 0) ||
    Object.values(longitudinal.answer_type_errors ?? {}).some((value) => value > 0) ||
    Object.values(longitudinal.reasoning_type_errors ?? {}).some((value) => value > 0);

  const hasMetacognition =
    (longitudinal.trap_sensitivity ?? 0) > 0.05 ||
    (longitudinal.overconfidence_score ?? 0) > 0.05 ||
    (longitudinal.impulsive_rate ?? 0) > 0.05;

  const anchorWeaknesses = (longitudinal.anchor_objective_weaknesses ?? []).filter(
    (w) => w.error_count > 0,
  );

  if (
    !hasPatterns &&
    weakNodes.length === 0 &&
    !hasMetacognition &&
    anchorWeaknesses.length === 0
  )
    return null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-serif text-xl font-semibold">Banco de questões</h2>
        <span className="text-xs text-muted">
          {longitudinal.total_nodes_studied} {longitudinal.total_nodes_studied === 1 ? "tópico" : "tópicos"} estudados
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {hasPatterns && (
          <div className="space-y-4 border border-edge p-4">
            <p className="text-sm font-semibold">Onde os erros se concentram</p>
            <ErrorPatternBars
              data={longitudinal.charge_pattern_errors ?? {}}
              labels={CHARGE_LABELS}
              title="Formato de questão"
            />
            <ErrorPatternBars
              data={longitudinal.answer_type_errors ?? {}}
              labels={ANSWER_LABELS}
              title="Tipo de resposta"
            />
            <ErrorPatternBars
              data={longitudinal.reasoning_type_errors ?? {}}
              labels={REASONING_LABELS}
              title="Tipo de raciocínio"
            />
          </div>
        )}

        {hasMetacognition && (
          <div className="space-y-4 border border-edge p-4">
            <p className="text-sm font-semibold">Padrão comportamental</p>
            {[
              { label: "Sensibilidade a pegadinhas", value: longitudinal.trap_sensitivity ?? 0, color: "text-amber-700" },
              { label: "Excesso de confiança", value: longitudinal.overconfidence_score ?? 0, color: "text-red-600" },
              { label: "Taxa impulsiva", value: longitudinal.impulsive_rate ?? 0, color: "text-orange-600" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="mb-1 flex justify-between gap-3 text-xs">
                  <span className="text-muted">{label}</span>
                  <span className={`font-medium ${value > 0.15 ? color : "text-muted"}`}>{pct(value)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
                  <div
                    className={`h-full rounded-full ${value > 0.15 ? "bg-warning" : "bg-edge"}`}
                    style={{ width: `${pct(value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {weakNodes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Tópicos com domínio abaixo de 60%
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {weakNodes.map((node) => {
              const mastery = pct(node.mastery_score);
              const total = node.correct_count + node.error_count;
              const label = node.node_name ?? node.knowledge_node_id;
              return (
                <Link
                  key={node.knowledge_node_id}
                  href={`/banco-de-questoes?theme=${encodeURIComponent(node.node_name ?? "")}`}
                  className="block border border-edge p-3 hover:border-primary"
                >
                  <p className="truncate text-xs font-semibold text-ink">{label}</p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-edge">
                    <div
                      className={`h-full rounded-full ${mastery < 40 ? "bg-danger" : "bg-warning"}`}
                      style={{ width: `${mastery}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {mastery}% dom. · {node.correct_count}/{total}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {anchorWeaknesses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Objetivos que você mais erra
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {anchorWeaknesses.map((w) => {
              const mastery =
                typeof w.mastery_score === "number" && Number.isFinite(w.mastery_score)
                  ? pct(w.mastery_score)
                  : null;
              const exposure =
                typeof w.exposure_count === "number" && Number.isFinite(w.exposure_count)
                  ? Math.max(0, Math.round(w.exposure_count))
                  : null;
              const meta = [
                `${w.error_count} ${w.error_count === 1 ? "erro" : "erros"}`,
                mastery !== null ? `${mastery}% dom.` : null,
                exposure !== null ? `${exposure} exp.` : null,
              ].filter(Boolean);

              return (
                <li key={w.trap_pattern} className="border border-edge p-3">
                  <p className="truncate text-xs font-semibold text-ink">{w.label}</p>
                  <p className="mt-1 text-xs text-muted">{meta.join(" · ")}</p>
                  {mastery !== null && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-edge">
                      <div
                        className={`h-full rounded-full ${mastery < 40 ? "bg-danger" : "bg-warning"}`}
                        style={{ width: `${mastery}%` }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
