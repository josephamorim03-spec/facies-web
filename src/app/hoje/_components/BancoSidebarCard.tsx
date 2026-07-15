import Link from "next/link";
import type { QuestionBankLongitudinalDiagnosis } from "@/lib/api";

type BancoSidebarCardProps = {
  longitudinal: QuestionBankLongitudinalDiagnosis | null;
};

function scorePct(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0;
  const normalized = Math.abs(Number(value)) <= 1 ? Number(value) * 100 : Number(value);
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

export default function BancoSidebarCard({ longitudinal }: BancoSidebarCardProps) {
  if (!longitudinal || typeof longitudinal.total_nodes_studied !== "number") return null;

  if (longitudinal.total_nodes_studied === 0) {
    return (
      <section className="rounded-lg border border-edge bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Banco de questões</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Responda questões no banco para ver seu progresso aqui.
        </p>
        <Link href="/banco-de-questoes" className="mt-3 block text-xs font-semibold text-primary hover:underline">
          Acessar banco
        </Link>
      </section>
    );
  }

  const weakNodes = [...(longitudinal.nodes ?? [])]
    .filter((node) => node.exposure_count >= 2 && node.mastery_score < 0.65)
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 4);
  const weakCount = longitudinal.weak_node_ids.length;
  const atRiskCount = longitudinal.at_risk_node_ids.length;

  return (
    <section className="space-y-3 rounded-lg border border-edge bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Banco de questões</h2>
        <Link href="/revisoes" className="text-xs text-muted hover:text-primary">
          Ver tudo
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span>
          <span className="font-semibold text-ink">{longitudinal.total_nodes_studied}</span> tópicos
        </span>
        {weakCount > 0 && (
          <span className="font-medium text-danger">
            {weakCount} {weakCount === 1 ? "frágil" : "frágeis"}
          </span>
        )}
        {atRiskCount > 0 && <span className="text-warning">{atRiskCount} em risco</span>}
      </div>

      {weakNodes.length > 0 ? (
        <div className="space-y-2">
          {weakNodes.map((node) => {
            const mastery = scorePct(node.mastery_score);
            const theme = node.node_name ?? node.knowledge_node_id;
            const toneClass = mastery < 40 ? "text-danger" : "text-warning";
            const barClass = mastery < 40 ? "bg-danger" : "bg-warning";
            return (
              <Link
                key={node.knowledge_node_id}
                href={`/banco-de-questoes?theme=${encodeURIComponent(theme)}`}
                className="group block"
              >
                <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 max-w-[70%] truncate text-muted transition-colors group-hover:text-primary">
                    {theme}
                  </span>
                  <span className={`font-semibold ${toneClass}`}>{mastery}%</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-edge">
                  <div className={`h-full rounded-full ${barClass}`} style={{ width: `${mastery}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted">Todos os tópicos com estimativa longitudinal acima de 65%. Bom trabalho!</p>
      )}

      <Link
        href={weakNodes.length > 0
          ? `/banco-de-questoes?theme=${encodeURIComponent(weakNodes[0].node_name ?? weakNodes[0].knowledge_node_id)}`
          : "/banco-de-questoes"
        }
        className="block rounded-lg border border-edge px-3 py-2 text-center text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
      >
        {weakNodes.length > 0 ? `Treinar ${weakNodes[0].node_name ?? "tema frágil"}` : "Estudar agora"}
      </Link>
    </section>
  );
}
