import type { Metadata } from "next";
import Link from "next/link";

import { dataCurta, diasDaRevisao, revisaoFinal } from "@/lib/revisao";
import { RevisaoDiaLauncher } from "./_components/RevisaoDiaLauncher";

/**
 * A Semana Final dentro do app — a revisão INTERATIVA dos mesmos 7 dias.
 *
 * ## Por que esta página é só um lançador, e não uma leitura
 *
 * O ebook público (`/prova/enamed/revisao-final`) entrega a LEITURA: como a
 * banca cobra cada assunto, onde se erra, o que conferir na véspera. Aqui o
 * valor é o outro lado do mesmo dia — RESOLVER as 30 questões com correção e
 * registro de desempenho. Por isso a página lista os dias e cada um abre uma
 * sessão de questões real — a UI de resolução (`/banco/sessao/[id]`) é a mesma
 * do resto do banco, com gabarito só depois da resposta (RF6).
 *
 * As duas pontas não se sobrepõem desde a D13: até 02/09 o ebook publicava as
 * mesmas 30 questões COM gabarito à mostra, o que tornava esta página redundante
 * para quem já tinha lido o ebook.
 *
 * ## As questões são as MESMAS do ebook, e isso vem de um arquivo só
 *
 * Os `question_id` de cada dia vêm de `revisao_final.json` — o artefato que o
 * ebook também lê. A sessão é criada com `question_ids` explícitos e
 * `answer_status="all"`: o aluno revê as 30 mesmo que já tenha respondido alguma
 * delas antes (é revisão, não prática de inéditas).
 */
export const metadata: Metadata = {
  title: "Semana Final — Revisão ENAMED",
};

export default function PaginaRevisaoFinalApp() {
  const revisao = revisaoFinal();
  const dias = diasDaRevisao(revisao);
  const honestidade = revisao.honestidade;

  return (
    <div className="space-y-6" aria-label="Semana Final de Revisão">
      <header className="space-y-2">
        <p className="paper-eyebrow">semana final · {revisao.exam_key}</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
          A revisão da última semana.
        </h1>
        <p className="max-w-[62ch] text-base text-muted">
          {revisao.estrutura.total_questoes} questões da própria base da prova, nos{" "}
          {dias.length} assuntos mais prováveis — um por dia. Prova em{" "}
          {dataCurta(revisao.aplicacao_prevista)}.
        </p>
        <p className="max-w-[62ch] text-sm text-muted">
          {honestidade.nota_previsao}
        </p>
      </header>

      <ol className="space-y-3">
        {dias.map((dia) => (
          <li key={dia.dia}>
            <RevisaoDiaLauncher
              dia={dia.dia}
              subtema={dia.subtema}
              posicao={dia.posicao_previsao}
              questaoIds={dia.questoes.map((q) => q.question_id)}
            />
          </li>
        ))}
      </ol>

      <footer className="border-t border-edge pt-5 text-sm text-muted">
        <p className="max-w-[62ch]">
          Quer revisar o assunto antes de resolver?{" "}
          <Link
            href={`/prova/${revisao.exam_key.toLowerCase()}/revisao-final`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Abra o ebook da revisão
          </Link>{" "}
          — como a banca cobra cada dia, onde se erra e o checklist da véspera.
        </p>
      </footer>
    </div>
  );
}
