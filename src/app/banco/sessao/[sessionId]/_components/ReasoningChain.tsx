"use client";

import type { QuestionBankReasoningCheckpoint } from "@/lib/api";

const KIND_LABEL: Record<string, string> = {
  problem_representation: "Representação do problema",
  interpretation: "Interpretação dos achados",
  diagnosis: "Diagnóstico",
  risk_stratification: "Estratificação de risco",
  management: "Conduta",
  safety: "Segurança",
};

const STATE_LABEL: Record<string, string> = {
  verified: "Verificado",
  current: "Agora",
  gap: "Lacuna encontrada",
  not_asked: "Não perguntado",
};

function stateClasses(state: string | null | undefined): string {
  if (state === "gap") return "border-2 border-danger bg-surfaceMuted";
  if (state === "current") return "border-2 border-primary bg-surfaceMuted";
  if (state === "not_asked") return "border border-edge bg-surface opacity-45";
  return "border border-edge bg-surface";
}

function stateTextClass(state: string | null | undefined): string {
  if (state === "gap") return "text-danger";
  if (state === "current") return "text-primary";
  if (state === "verified") return "text-success";
  return "text-muted";
}

/**
 * A cadeia inteira, com o estado de cada elo.
 *
 * O curto-circuito já existia no servidor: resposta diferente de "sim" congela o
 * passo. O que faltava era o aluno VER o que deixou de ser perguntado — antes a
 * cadeia simplesmente parava, sem dizer por quê nem o que vinha depois.
 *
 * Os elos `not_asked` aparecem com o enunciado, esmaecidos e rotulados. Não é
 * economia de tela: perguntar conduta a quem não fechou o diagnóstico mediria
 * chute, e chute contamina o perfil adaptativo.
 */
export function ReasoningChain({ chain }: { chain: QuestionBankReasoningCheckpoint[] }) {
  if (!chain || chain.length === 0) return null;

  const skipped = chain.filter((item) => item.state === "not_asked");
  const gapIndex = chain.findIndex((item) => item.state === "gap");

  return (
    <section className="mt-4" aria-label="Cadeia de raciocínio">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Cadeia de raciocínio
        </span>
        <span className="chrome-leader" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          {chain.length} elos
        </span>
      </div>

      <ol className="mt-2 flex flex-col gap-1">
        {chain.map((item) => (
          <li
            key={item.checkpoint_key}
            className={`flex items-center gap-3 px-3 py-2 text-xs ${stateClasses(item.state)}`}
          >
            <span className={`font-semibold tabular-nums ${stateTextClass(item.state)}`}>
              {String(item.step_order).padStart(2, "0")}
            </span>
            <span className={item.state === "gap" ? "font-semibold text-ink" : "text-ink"}>
              {KIND_LABEL[item.kind] ?? item.kind}
            </span>
            <span className="chrome-leader" aria-hidden="true" />
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${stateTextClass(item.state)}`}
            >
              {STATE_LABEL[item.state ?? ""] ?? ""}
            </span>
          </li>
        ))}
      </ol>

      {gapIndex >= 0 && skipped.length > 0 ? (
        <div className="mt-3 border-t border-dotted border-edge pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            O que vinha depois, e não foi perguntado
          </p>
          <div className="mt-2 flex flex-col gap-2 opacity-60">
            {skipped.map((item) => (
              <div key={item.checkpoint_key}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Elo {String(item.step_order).padStart(2, "0")} · {KIND_LABEL[item.kind] ?? item.kind}
                </p>
                <p className="mt-0.5 font-serif text-sm leading-relaxed text-ink">{item.prompt}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 font-serif text-sm leading-relaxed text-muted">
            Estes elos dependem do anterior. Perguntar agora mediria chute, não conhecimento.
          </p>
        </div>
      ) : null}
    </section>
  );
}
