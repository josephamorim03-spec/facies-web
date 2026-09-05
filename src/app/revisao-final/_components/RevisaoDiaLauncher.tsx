"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createQuestionBankSession } from "@/lib/api";
import { payloadDoDia } from "@/lib/revisaoSessao";
import { useAuthToken } from "@/lib/useAuthToken";

type Estado = "pronto" | "criando" | "erro";

/**
 * Um dia da Semana Final: abre a sessão interativa com as questões daquele dia.
 *
 * O payload é deliberado em três pontos, e cada um tem uma razão:
 *
 * - `question_ids` explícitos: a sessão tem EXATAMENTE as questões do dia, na
 *   ordem da revisão (o servidor as serve com `preserve_order`).
 * - `answer_status: "all"`: o aluno revê as questões mesmo que já as tenha
 *   respondido — é revisão, não prática de inéditas. Filtrar respondidas aqui
 *   esvaziaria o dia de quem já treinou a base da prova. (Verificado: sem este
 *   campo, `_answer_status` cai em `"unanswered"`.)
 * - `feedback_timing: "immediate"`: revisão pede gabarito logo após cada
 *   resposta, não só no fim — é o que a diferencia de um mini-simulado. Este é o
 *   eixo certo: `session_kind: "bank_topic"` NÃO é pinado pelo servidor (só
 *   `kros` e `institutional_exam` forçam `post_result`).
 *
 * ⚠️ `resolution_mode` NÃO é enviado de propósito. O validador do schema o pina
 * em `"simulation"` em toda sessão nova (`question_bank.py`: "Novas sessões
 * sempre comprometem respostas e pontuam ao finalizar"). Mandar `"training"`
 * aqui era campo morto: declarava uma intenção que o servidor descarta, e um
 * leitor futuro acreditaria nela.
 *
 * Sem token, o clique leva ao login: a sessão exige conta (o `POST /sessions`
 * já passa pelo `require_active_access`).
 */
export function RevisaoDiaLauncher({
  dia,
  subtema,
  posicao,
  questaoIds,
}: {
  dia: number;
  subtema: string;
  posicao: number;
  questaoIds: string[];
}) {
  const { token } = useAuthToken();
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("pronto");

  async function resolver() {
    // ⚠️ ISTO MANDAVA TODO MUNDO PARA O LOGIN.
    // `token` e' sempre "" (`lib/auth.ts:29`), entao o botao da Semana Final
    // nunca abria a sessao: ele redirecionava quem ja estava autenticado.
    setEstado("criando");
    try {
      const created = await createQuestionBankSession(token, payloadDoDia(questaoIds));
      router.push(`/banco/sessao/${created.session_id}`);
    } catch {
      setEstado("erro");
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-surface border border-edge bg-surface px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-mono text-sm text-muted">dia {dia}</span>
          <span className="font-serif text-xl font-semibold tracking-tight text-ink">
            {subtema}
          </span>
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {posicao}º assunto mais provável · {questaoIds.length} questões
        </p>
      </div>

      <div className="flex items-center gap-3">
        {estado === "erro" ? (
          <span className="text-sm text-danger" role="alert">
            Não foi possível abrir o dia. Tente de novo.
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => void resolver()}
          disabled={estado === "criando"}
          className="paper-control inline-flex min-h-11 items-center rounded-control border border-edge bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surfaceMuted disabled:opacity-60"
        >
          {estado === "criando" ? "Abrindo…" : `Resolver dia ${dia}`}
        </button>
      </div>
    </div>
  );
}
