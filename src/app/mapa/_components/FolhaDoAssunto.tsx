"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Sheet } from "@/components/ui/Sheet";
import {
  browseQuestionBankTopics,
  createQuestionBankSession,
} from "@/lib/api";
import { invalidateLearningQueries } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";

/**
 * O fim da exploração do mapa: o assunto, e o que fazer com ele.
 *
 * ## O mapa deixa de ser só leitura
 *
 * Tocar numa célula abria uma linha de texto fora da grade e parava aí. O
 * médico via "Sepse · 7º mais cobrado · 5 questões" e não tinha para onde ir
 * com aquilo — a decisão que o mapa provoca ("então vou estudar sepse") tinha
 * de ser reconstruída à mão no Banco, com filtro.
 *
 * ## ⚠️ DUAS FONTES, e a tela diz qual está a mostrar
 *
 * O mosaico vem de `facies.json`: incidência na **janela recente da prova**,
 * com o teto de 15 assuntos que o dataset publica. As questões que dá para
 * praticar vêm de `/question-bank/topics` + `/question-bank/sessions`: o
 * **acervo**, que é outro denominador e quase sempre maior.
 *
 * Confundir os dois já custou 12.103 questões a este produto — está registado
 * no topo de `MapaDaProva.tsx`. Por isso a folha nunca escreve "5 questões" ao
 * lado do número da prova: ela diz "no acervo desta banca", com todas as
 * letras, e o número da grade continua a ser o da prova.
 *
 * ## Quando o assunto não resolve
 *
 * O `rotulo` do mosaico é o nome do subtema na taxonomia, mas a busca pode não
 * casar — nome mudou, nó foi fundido, a banca não tem questão daquele assunto
 * no acervo. Aí a folha **diz isso** em vez de oferecer um botão que abriria
 * uma sessão vazia.
 */

export function FolhaDoAssunto({
  assunto,
  institutionKey,
  nomeDaBanca,
  meu,
  naProva,
  onFechar,
}: {
  assunto: string | null;
  institutionKey: string;
  nomeDaBanca: string;
  meu: { mastery: number; attempts: number; certeza: string } | null;
  /**
   * A leitura do MOSAICO, para a folha não a esconder.
   *
   * ⚠️ A folha cobria a linha de leitura que o `MapaDaProva` escreve abaixo da
   * grade: tocar na célula abria a folha POR CIMA do texto que dizia o posto e
   * a contagem. Quem quisesse os dois tinha de fechar e reabrir. Agora a folha
   * traz a leitura consigo, e a linha de baixo continua lá para quando ela
   * fechar.
   *
   * `exibivel: false` é o piso do dataset — menos de `PISO_N_CELULA` questões,
   * poucas para publicar o número.
   */
  naProva: { posicao: number; n: number; exibivel: boolean } | null;
  onFechar: () => void;
}) {
  const { token, tokenResolved } = useAuthToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * Resolve o assunto do mosaico para um NÓ da taxonomia.
   *
   * Sem isto a sessão teria de ser montada por `search` — busca textual, que
   * traria questões parecidas em vez das do assunto. O nó dá o filtro exato, e
   * de quebra a contagem real no acervo desta banca.
   */
  const no = useQuery({
    queryKey: ["question-bank", "topics", "assunto", institutionKey, assunto],
    queryFn: () =>
      browseQuestionBankTopics(token, {
        search: assunto as string,
        institutions: [institutionKey],
        node_types: ["subtheme"],
        include_empty: false,
        limit: 1,
      }),
    enabled: tokenResolved && Boolean(assunto),
    staleTime: 3_600_000,
  });

  const encontrado = no.data?.[0] ?? null;
  const quantas = encontrado?.question_count ?? 0;

  async function praticar() {
    if (!encontrado || criando) return;
    setCriando(true);
    setErro(null);
    try {
      const criada = await createQuestionBankSession(token, {
        knowledge_node_ids: [encontrado.knowledge_node_id],
        institutions: [institutionKey],
        mode: "by_topic",
        resolution_mode: "simulation",
        study_kind: "topic",
        session_kind: "bank_topic",
        generate_review_trail: false,
      });
      void invalidateLearningQueries(queryClient);
      router.push(`/banco/sessao/${criada.session_id}`);
    } catch {
      setErro("Não foi possível montar a sessão. Tente de novo.");
      setCriando(false);
    }
  }

  return (
    <Sheet
      open={Boolean(assunto)}
      onClose={onFechar}
      eyebrow="assunto da prova"
      title={assunto ?? ""}
    >
      {/* A LEITURA DA GRADE PRIMEIRO: é a razão de a célula ter sido tocada. */}
      {naProva ? (
        <p className="font-mono text-nota tabular-nums text-muted">
          {naProva.posicao}º assunto mais cobrado ·{" "}
          {naProva.exibivel
            ? `${naProva.n} ${naProva.n === 1 ? "questão" : "questões"} nesta prova`
            : "poucas questões para mostrar o número"}
        </p>
      ) : null}

      {/* ⚠️ A AÇÃO SUBIU, e ficou acima da dobra do celular.
          Ela era a última coisa da folha, depois da linha da prova e da linha
          da sua proficiência — e numa folha de fundo, no telefone, isso quer
          dizer "atrás do teclado do polegar". O operador disse que acionar o
          banco pelo mapa estava ruim; a ordem era metade disso. O que informa a
          decisão fica em cima do botão; o que a comenta, embaixo. */}
      <div className="mt-4">
        {no.isPending ? (
          <p className="text-sm text-muted">Procurando questões…</p>
        ) : encontrado && quantas > 0 ? (
          <>
            {erro ? (
              <p className="mb-2 text-nota text-danger" role="alert">
                {erro}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void praticar()}
              disabled={criando}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-control border border-primary bg-primary px-5 text-sm font-medium text-primaryInk transition-colors hover:border-[var(--color-primary-strong)] hover:bg-[var(--color-primary-strong)] disabled:opacity-50"
            >
              {criando ? "Montando…" : `Praticar ${quantas} ${quantas === 1 ? "questão" : "questões"}`}
            </button>
            {/* ⚠️ "no acervo desta banca", e nao "da prova". Sao denominadores
                diferentes: a grade conta a janela recente publicada na facies,
                isto conta o que existe para praticar. A frase fica DEBAIXO do
                botão porque ela explica o número que está nele. */}
            <p className="mt-2 text-nota text-muted">
              {quantas} {quantas === 1 ? "questão" : "questões"} no acervo de{" "}
              {nomeDaBanca} — a contagem acima é a da prova.
            </p>
          </>
        ) : (
          // Sem nó ou sem questão: dizer, e não oferecer um botão que abriria
          // uma sessão vazia.
          <p className="text-sm leading-6 text-muted">
            Não há questões deste assunto no acervo desta banca — ele aparece no mapa porque a
            prova o cobrou, e o acervo ainda não o alcançou.
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-rule pt-4">
        {meu ? (
          <p className="font-mono text-nota tabular-nums text-muted">
            você acerta {Math.round(meu.mastery * 100)}% em {meu.attempts}{" "}
            {meu.attempts === 1 ? "resposta" : "respostas"} · {meu.certeza}
          </p>
        ) : (
          <p className="text-nota text-muted">Você ainda não respondeu isto.</p>
        )}
      </div>
    </Sheet>
  );
}
