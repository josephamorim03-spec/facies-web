"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import QuestionList from "@/app/banco/_components/QuestionList";
import { Alert } from "@/components/ui/Alert";
import { BotaoDeEscolha } from "@/components/ui/BotaoDeEscolha";
import { LoadBar } from "@/components/ui/LoadBar";
import { displayAreaLabel, resolveDisplayArea } from "@/lib/areaDisplay";
import {
  createQuestionBankSession,
  listQuestionBankBookmarks,
  type QuestionBankQuestion,
} from "@/lib/api";
import { invalidateLearningQueries } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";

/**
 * As guardadas — a tela que o endpoint esperava desde sempre.
 *
 * ## O defeito que ela corrige
 *
 * `listQuestionBankBookmarks` estava escrito, tipado e a aceitar treze filtros
 * em `lib/api/domains/question-bank/questions.ts`. **Nenhum componente o
 * chamava.** O `grep` achava a definicao e mais nada.
 *
 * Do outro lado, guardar funcionava: a coluna `bookmarked` existe em
 * `student_question_state` desde a migracao 0054, o `POST .../bookmark` grava,
 * e o atalho `F` sempre funcionou. O aluno guardava questoes e nao tinha para
 * onde ir ve-las — que e' exatamente a queixa de sempre: *"vi uma questao muito
 * boa e nao faco ideia de onde ela esta"*.
 *
 * ## Por que ela nao e um destino da barra
 *
 * A barra fixa CINCO destinos e o sexto nao caberia em 390px. Guardadas e uma
 * forma de olhar o acervo, nao um lugar diferente dele, entao mora sob a
 * Pratica, ao lado de "Questões" e "Histórico".
 *
 * ⚠️ Este paragrafo dizia SEIS, citando `Webapp - telas.dc.html:278-288`. Aquele
 * desenho e de agosto e a barra dele ("hoje mapa banco evolução rotina conta")
 * nao existe mais: a taxonomia passou ao vocabulario do prontuario — conduta ·
 * prática · mapa · evolução · você. O ARGUMENTO nao mudou, e e' por isso que ele
 * fica: a barra tem um teto de largura, e guardadas nunca disputou esse teto.
 *
 * ## O que ela NAO tenta ser
 *
 * Colecao nomeada, pasta, ordenacao a mao. Nada disso existe no backend, e
 * inventa-lo aqui criaria estado que so vive no navegador de um aparelho. O que
 * existe e uma lista, e a lista ja responde a pergunta.
 */

/** Teto da consulta. O endpoint aceita ate 1000; 200 e' o que uma tela le. */
const TETO = 200;

/**
 * A area de uma questao guardada.
 *
 * `QuestionBankQuestion` NAO carrega `area` — o contrato so devolve
 * `knowledge_nodes`. A area e a raiz do caminho taxonomico (`node_path[0]`), e
 * `resolveDisplayArea` normaliza acento, caixa e sinonimo, que e' por que ela
 * casa "Ginecologia e Obstetricia" sem acento com o codigo GO.
 *
 * O enunciado entra como ultimo recurso, e nao como primeiro: inferir a area de
 * um texto clinico acerta menos que ler a arvore.
 */
function areaDaQuestao(questao: QuestionBankQuestion): string {
  const principal =
    questao.knowledge_nodes.find((no) => no.is_primary) ?? questao.knowledge_nodes[0] ?? null;
  const raiz = principal?.node_path?.[0] ?? principal?.path_label ?? null;
  return resolveDisplayArea(null, raiz, questao.stem);
}

export default function GuardadasPage() {
  const { token, tokenResolved } = useAuthToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [areaEscolhida, setAreaEscolhida] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const guardadas = useQuery({
    queryKey: ["question-bank", "bookmarks", TETO],
    queryFn: () => listQuestionBankBookmarks(token, { limit: TETO }),
    enabled: tokenResolved,
    staleTime: 30_000,
  });

  const todas = useMemo(() => guardadas.data ?? [], [guardadas.data]);

  // ⚠️ O FILTRO E LOCAL, e nao uma segunda ida ao servidor.
  //
  // O endpoint aceita `area` e `search`, mas a lista ja esta toda na memoria: a
  // pessoa que guardou 40 questoes nao deve esperar rede para escrever uma
  // letra. Se o teto de 200 for atingido um dia, este e o lugar que passa a
  // pedir ao servidor -- e o aviso abaixo diz quando isso acontecer.
  const areas = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const questao of todas as QuestionBankQuestion[]) {
      const area = areaDaQuestao(questao);
      contagem.set(area, (contagem.get(area) ?? 0) + 1);
    }
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]);
  }, [todas]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return todas.filter((questao: QuestionBankQuestion) => {
      if (areaEscolhida) {
        if (areaDaQuestao(questao) !== areaEscolhida) return false;
      }
      if (!termo) return true;
      return questao.stem.toLowerCase().includes(termo);
    });
  }, [areaEscolhida, busca, todas]);

  async function praticar() {
    if (filtradas.length === 0) return;
    setCriando(true);
    setErro(null);
    try {
      const criada = await createQuestionBankSession(token, {
        // Os ids explicitos sao o ponto: a sessao e' EXATAMENTE o que esta na
        // tela, na ordem em que esta. Repetir o filtro como criterio deixaria a
        // sessao divergir da lista assim que o aluno guardasse outra questao.
        question_ids: filtradas.map((questao) => questao.id),
        mode: "by_topic",
        resolution_mode: "simulation",
        // ⚠️ TREINO, e não simulado. Sem este campo a sessão cai no padrão do
        // perfil (`post_result`) e o aluno que tocou em "Praticar" para APRENDER
        // um assunto não vê correção nenhuma até o fim -- um verbo com dois
        // significados dentro do mesmo app. É o que `RevisaoDiaLauncher` já faz
        // (`lib/revisaoSessao.ts`), e agora os três concordam.
        feedback_timing: "immediate",
        study_kind: "topic",
        session_kind: "bank_topic",
        generate_review_trail: false,
      });
      void invalidateLearningQueries(queryClient);
      router.push(`/banco/sessao/${criada.session_id}`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível montar a sessão.");
      setCriando(false);
    }
  }

  if (!tokenResolved || guardadas.isPending) {
    return <LoadBar label="Carregando as suas guardadas" />;
  }

  if (guardadas.isError) {
    return (
      <Alert variant="danger" onRetry={() => void guardadas.refetch()}>
        Não foi possível carregar as suas guardadas.
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="paper-eyebrow">banco</p>
        <h1 className="mt-1 font-serif font-semibold text-ink">As suas guardadas</h1>
        <p className="mt-1 font-mono text-nota tabular-nums text-muted">
          {todas.length === 0
            ? "nenhuma questão guardada"
            : `${todas.length} ${todas.length === 1 ? "questão guardada" : "questões guardadas"}`}
          {areaEscolhida || busca.trim() ? ` · ${filtradas.length} no filtro` : ""}
        </p>
      </header>

      {todas.length === 0 ? (
        <section className="rounded-surface border border-edge bg-surface p-4 sm:p-5">
          <p className="text-sm leading-6 text-ink">
            Nada guardado ainda. Durante uma sessão, o botão{" "}
            <strong className="font-semibold">Guardar</strong> na barra de baixo — ou a tecla{" "}
            <span className="font-mono">F</span> — deixa a questão aqui, e ela atravessa sessões.
          </p>
        </section>
      ) : (
        <>
          {todas.length >= TETO ? (
            <Alert variant="warning">
              Esta lista mostra as {TETO} mais recentes. As anteriores continuam guardadas.
            </Alert>
          ) : null}

          <section className="space-y-3">
            <label className="block">
              <span className="paper-eyebrow">procurar no enunciado</span>
              <input
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="sepse, hiponatremia…"
                className="mt-1 min-h-11 w-full rounded-control border border-edge bg-paper px-3 text-sm text-ink placeholder:text-muted"
              />
            </label>

            {areas.length > 1 ? (
              <div className="fileira-de-controles">
                {/* A contagem por area vem da lista carregada, entao ela nunca
                    promete um filtro que devolve zero — que e o defeito classico
                    de barra de filtro com contagem vinda de outra consulta. */}
                <BotaoDeEscolha
                  papel="aba"
                  escolhido={areaEscolhida === null}
                  onClick={() => setAreaEscolhida(null)}
                >
                  Todas
                </BotaoDeEscolha>
                {areas.map(([area, quantas]) => (
                  <BotaoDeEscolha
                    key={area}
                    papel="aba"
                    escolhido={area === areaEscolhida}
                    onClick={() => setAreaEscolhida(area === areaEscolhida ? null : area)}
                  >
                    <>
                      {displayAreaLabel(area)}{" "}
                      <span className="font-mono tabular-nums">{quantas}</span>
                    </>
                  </BotaoDeEscolha>
                ))}
              </div>
            ) : null}
          </section>

          {erro ? (
            <Alert variant="danger" onDismiss={() => setErro(null)}>
              {erro}
            </Alert>
          ) : null}

          <button
            type="button"
            onClick={() => void praticar()}
            disabled={criando || filtradas.length === 0}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-control border border-primary bg-primary px-5 text-sm font-medium text-primaryInk transition-colors hover:border-[var(--color-primary-strong)] hover:bg-[var(--color-primary-strong)] disabled:opacity-50 sm:w-auto"
          >
            {criando
              ? "Montando…"
              : `Praticar ${filtradas.length} ${filtradas.length === 1 ? "guardada" : "guardadas"}`}
          </button>

          {filtradas.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Nenhuma guardada com esse filtro. As {todas.length} continuam aqui.
              </p>
              {/* A frase dizia ONDE estavam as outras e não dava como chegar
                  lá. Dizer que a saída existe sem oferecê-la é pior que calar. */}
              <button
                type="button"
                onClick={() => {
                  setAreaEscolhida(null);
                  setBusca("");
                }}
                className="min-h-11 rounded-control border border-edge bg-surface px-3 text-sm text-ink transition-colors hover:border-primary hover:text-primary"
              >
                Ver as {todas.length}
              </button>
            </div>
          ) : (
            <QuestionList
              questions={filtradas}
              eyebrow="guardadas"
              title="O que você guardou"
              selectedTopicSummary={
                areaEscolhida ? displayAreaLabel(areaEscolhida) : "Todas as áreas"
              }
            />
          )}
        </>
      )}
    </div>
  );
}
