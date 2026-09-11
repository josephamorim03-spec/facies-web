"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listQuestionBankSessions, type QuestionBankSession } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";
import { LoadBar } from "@/components/ui/LoadBar";
import { displayAreaLabel, resolveDisplayArea } from "@/lib/areaDisplay";

/**
 * Historico de sessoes — finalizadas E pendentes.
 *
 * Era a quarta aba de `/evolucao`, sem URL propria: `?tab=history` nao existia,
 * entao nao havia como linkar para ela — foi por isso que `/provas` acabou
 * aterrissando na aba Graficos, "sem nada de simulados a vista".
 *
 * Mora sob o Banco porque e o historico das sessoes de QUESTAO (do dia, Banco,
 * combinada e prova sao todas `QuestionBankSession`).
 *
 * Ate aqui ele filtrava `status: "finalized"` no proprio queryFn — e a tela de
 * sessao diz ao aluno, quando ele sai de um simulado, que "voce pode retomar
 * quando quiser em Questoes ou no Historico". A tela negava uma promessa que a
 * propria copia do produto faz. Sessao pendente agora aparece, e no TOPO: e a
 * unica linha da lista sobre a qual ainda da para agir.
 */

const SESSION_LABELS: Record<QuestionBankSession["session_kind"], string> = {
  kros: "Sessão do dia",
  bank_topic: "Banco",
  bank_combined: "Sessão combinada",
  institutional_exam: "Prova",
};

/** Abaixo disto a barra de filtros nao aparece: 4 seletores para 6 linhas e uma tela de configuracao, nao um historico. */
const MIN_SESSIONS_FOR_FILTERS = 10;

type EstadoFilter = "todas" | "pendentes" | "finalizadas";

function isFinalized(session: QuestionBankSession): boolean {
  return session.status === "finalized";
}

/**
 * Percentual so existe para sessao finalizada.
 *
 * Numa sessao ativa os itens ainda nao respondidos contam no denominador, entao
 * o calculo devolvia um percentual baixo e mentiroso — "12%" numa sessao que o
 * aluno mal comecou.
 */
function sessionScore(session: QuestionBankSession): {
  correct: number;
  total: number;
  pct: number | null;
} | null {
  if (!isFinalized(session)) return null;
  const scorable = session.items.filter((item) => !item.excluded_from_scoring);
  const correct = scorable.filter((item) => item.is_correct === true).length;
  return {
    correct,
    total: scorable.length,
    pct: scorable.length ? Math.round((correct / scorable.length) * 100) : null,
  };
}

function sessionTitle(session: QuestionBankSession): string {
  return (
    session.full_exam_name ??
    session.theme ??
    (session.session_kind === "bank_combined" ? "Conteúdos combinados" : "Sessão de questões")
  );
}

export default function BancoHistoricoPage() {
  const { token, tokenResolved } = useAuthToken();
  const [estado, setEstado] = useState<EstadoFilter>("todas");
  const [origem, setOrigem] = useState<QuestionBankSession["session_kind"] | "todas">("todas");
  const [area, setArea] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  const sessionsQuery = useQuery({
    // Sem `status`: a lista traz ativas e finalizadas. A chave "all" ja existia
    // em `queryKeys` e ja esta na lista de invalidacao, entao o cache nao muda
    // de forma. Os filtros abaixo sao estado LOCAL e nunca entram na chave —
    // se entrassem, a invalidacao por chave exata pararia de casar e o
    // historico ficaria rancoso depois de finalizar uma sessao.
    queryKey: queryKeys.questionBankSessions(),
    queryFn: () => listQuestionBankSessions(token, { limit: 100 }),
    enabled: tokenResolved,
    staleTime: 30_000,
  });

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);

  // Areas presentes no proprio dado, nao um catalogo: o seletor so oferece o
  // que existe para filtrar.
  const areasPresentes = useMemo(() => {
    const found = new Map<string, string>();
    for (const session of sessions) {
      if (!session.area) continue;
      const resolved = resolveDisplayArea(session.area, session.theme, null);
      if (resolved) found.set(resolved, displayAreaLabel(resolved));
    }
    return [...found.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [sessions]);

  const visible = useMemo(() => {
    const needle = busca.trim().toLowerCase();
    const filtered = sessions.filter((session) => {
      if (estado === "pendentes" && isFinalized(session)) return false;
      if (estado === "finalizadas" && !isFinalized(session)) return false;
      if (origem !== "todas" && session.session_kind !== origem) return false;
      if (area !== "todas") {
        const resolved = session.area ? resolveDisplayArea(session.area, session.theme, null) : null;
        if (resolved !== area) return false;
      }
      if (needle && !sessionTitle(session).toLowerCase().includes(needle)) return false;
      return true;
    });

    // Pendentes no topo, sempre. Enterra-las em ordem cronologica desfaz o
    // proposito de exibi-las: sao a unica linha retomavel.
    return filtered.sort((a, b) => {
      const aPending = isFinalized(a) ? 1 : 0;
      const bPending = isFinalized(b) ? 1 : 0;
      if (aPending !== bPending) return aPending - bPending;
      const aDate = a.finalized_at ?? a.updated_at;
      const bDate = b.finalized_at ?? b.updated_at;
      return bDate.localeCompare(aDate);
    });
  }, [sessions, estado, origem, area, busca]);

  const pendingCount = sessions.filter((session) => !isFinalized(session)).length;
  const showFilters = sessions.length >= MIN_SESSIONS_FOR_FILTERS;

  if (sessionsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 py-8" aria-busy="true">
        <LoadBar label="Carregando seu histórico" className="w-full max-w-xs" />
        <div className="paper-skeleton h-16" />
        <div className="paper-skeleton h-16" />
        <div className="paper-skeleton h-16" />
      </div>
    );
  }

  if (sessionsQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <p className="text-sm text-danger">Não foi possível carregar o histórico.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="flex items-center gap-3 py-4">
        <span className="paper-eyebrow">
          {pendingCount > 0 ? `${pendingCount} em andamento` : "Suas sessões"}
        </span>
        <span className="paper-leader" aria-hidden="true" />
        <span className="paper-eyebrow">{visible.length}</span>
      </div>

      {showFilters ? (
        <div className="flex flex-col gap-3 border-y border-edge py-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterGroup<EstadoFilter>
              label="Estado"
              value={estado}
              onChange={setEstado}
              options={[
                ["todas", "Todas"],
                ["pendentes", "Em andamento"],
                ["finalizadas", "Finalizadas"],
              ]}
            />
            <FilterGroup<QuestionBankSession["session_kind"] | "todas">
              label="Origem"
              value={origem}
              onChange={setOrigem}
              options={[
                ["todas", "Todas"],
                ["kros", SESSION_LABELS.kros],
                ["bank_topic", SESSION_LABELS.bank_topic],
                ["bank_combined", SESSION_LABELS.bank_combined],
                ["institutional_exam", SESSION_LABELS.institutional_exam],
              ]}
            />
          </div>

          {/* O seletor de area so existe se houver o que separar. */}
          {areasPresentes.length >= 2 ? (
            <FilterGroup<string>
              label="Área"
              value={area}
              onChange={setArea}
              options={[["todas", "Todas"], ...areasPresentes.map(([code, label]) => [code, label] as [string, string])]}
            />
          ) : null}

          {/* Uma caixa resolve prova, tema e subtema — tres seletores mortos na
              maioria das sessoes viram um campo que sempre serve. */}
          <label className="flex items-center gap-2">
            <span className="paper-eyebrow shrink-0">Buscar</span>
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Prova, tema ou assunto"
              className="paper-control min-h-10 w-full border border-edge bg-paper px-3 text-sm text-ink"
            />
          </label>
        </div>
      ) : null}

      {visible.length ? (
        <ol className="divide-y divide-edge">
          {visible.map((session) => {
            const score = sessionScore(session);
            const pending = !isFinalized(session);
            const displayArea = session.area
              ? resolveDisplayArea(session.area, session.theme, null)
              : null;
            return (
              <li
                key={session.session_id}
                data-session-status={session.status}
                className="grid gap-3 py-5 sm:grid-cols-[8rem_minmax(0,1fr)_8rem] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {SESSION_LABELS[session.session_kind]}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
                      new Date(session.finalized_at ?? session.updated_at),
                    )}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">
                    {displayArea ? (
                      <span className="mr-2 font-semibold text-ink">
                        {displayArea}
                      </span>
                    ) : null}
                    {sessionTitle(session)}
                  </p>
                  {/* O placar é o que a pessoa varre esta lista para ver, e
                      estava em 12px cinza — o mesmo peso da data ao lado, que é
                      metadado. Regra: cinza não carrega a informação principal
                      de um bloco.

                      O número recebe tinta cheia e mono tabular (as colunas se
                      alinham numa lista), e a unidade fica cinza, porque ela
                      apoia o número. A MARCA não entra aqui de propósito:
                      colori-la em vinte linhas seria decoração, e ela só vale
                      como sinal se aparecer uma vez, no lugar certo. */}
                  <p className="mt-1 text-sm text-muted">
                    {pending ? (
                      <>
                        <b className="font-mono font-semibold tabular-nums text-ink">
                          {session.answered_count}/{session.total_questions}
                        </b>{" "}
                        respondidas
                      </>
                    ) : (
                      <>
                        <b className="font-mono font-semibold tabular-nums text-ink">
                          {score?.correct ?? 0}/{score?.total ?? 0}
                        </b>{" "}
                        questões
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {pending ? (
                    <span className="paper-eyebrow border border-warning px-1.5 py-0.5 text-warning">
                      Em andamento
                    </span>
                  ) : (
                    <span className="text-xl font-semibold text-ink">
                      {score?.pct == null ? "-" : `${score.pct}%`}
                    </span>
                  )}
                  <Link
                    href={`/banco/sessao/${session.session_id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {pending ? "Retomar" : "Resultado"}
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="space-y-3 py-8">
          <p className="text-sm text-muted">
            {sessions.length
              ? "Nenhuma sessão com esses filtros."
              : "Suas sessões aparecerão aqui — as em andamento no topo."}
          </p>
          {/* Duas causas, duas saídas: filtrei demais, ou ainda não estudei. */}
          {sessions.length ? (
            <button
              type="button"
              onClick={() => {
                setEstado("todas");
                setOrigem("todas");
                setArea("todas");
                setBusca("");
              }}
              className="min-h-11 rounded-control border border-edge bg-surface px-3 text-sm text-ink transition-colors hover:border-primary hover:text-primary"
            >
              Limpar filtros
            </button>
          ) : (
            <Link
              href="/banco"
              className="paper-control inline-flex min-h-11 items-center rounded-control border border-edge bg-surface px-3 text-sm text-ink hover:border-primary hover:text-primary"
            >
              Montar a primeira sessão
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="paper-eyebrow mr-1 shrink-0">{label}</span>
      {options.map(([optionValue, optionLabel]) => (
        // ⚠️ ERA UM RETÂNGULO DE CANTO VIVO montado à mão — `border px-2.5
        // py-1` sem raio nenhum, numa fileira densa de filtros onde o resto do
        // Banco usa `.km-chip`. O chip canônico entrega o mesmo tamanho, o raio
        // do sistema e o estado que a identidade inteira usa; não vira
        // `BotaoDeEscolha` de propósito, porque este é o controlo DENSO: 44px
        // aqui empurraria a lista de sessões para fora da dobra.
        <button
          key={optionValue}
          type="button"
          aria-pressed={value === optionValue}
          onClick={() => onChange(optionValue)}
          className={`km-chip ${value === optionValue ? "km-chip-active" : ""}`}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  );
}
