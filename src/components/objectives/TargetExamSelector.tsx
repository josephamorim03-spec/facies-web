"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, X as X } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/Skeleton";
import { getAPIErrorDetail } from "@/lib/api";
import { listQuestionBankInstitutions } from "@/lib/api/domains/question-bank";
import type { QuestionBankInstitution } from "@/lib/api/domains/question-bank/types";
import {
  getMyTargetExam,
  replaceMyTargetExam,
  type StudentTargetExamInput,
} from "@/lib/api/domains/study-plan";
import { getErrorMessage } from "@/lib/error-utils";

const MAX_TARGET_EXAMS = 3;
const VISIBLE_INSTITUTIONS = 40;

/**
 * ⚠️ Esta tela lia `/question-bank/boards`, e essa lista chega VAZIA.
 *
 * `board_code` é NULL em 134.523 de 134.523 questões e `question_sources.board_id`
 * em 146/146 — medido e registrado nas migrations 096 e 104 do kbank. O efeito na
 * tela: o seletor caía no estado "o banco ainda não tem provas publicadas" para
 * todo aluno, e sem prova declarada a personalização inteira do produto ficava
 * desligada rio abaixo.
 *
 * A declaração agora é por INSTITUIÇÃO. `institution_key` cobre o acervo inteiro,
 * é a chave da tabela de demanda por nó, e é o que o aluno reconhece: ele diz "vou
 * prestar a USP-SP", não "vou prestar a banca tal".
 */
type Selected = StudentTargetExamInput & {
  label: string;
  recent_question_count: number | null;
  reliable_grain: "subtheme" | "theme" | null;
  situacao: QuestionBankInstitution["situacao"];
  /** A data como veio da fonte, para detectar edição do aluno.
   *
   *  Se ele mudar `exam_date` para outra coisa, a data deixa de ser a do edital
   *  e não pode continuar viajando como `"confirmed"` — o multiplicador cheio de
   *  urgência estaria pagando por uma afirmação que a fonte não faz. */
  exam_date_origem?: string | null;
};

/** O aviso de prova que não é mais aplicada, e para onde ir.
 *
 * A migration 120 do kbank criou o dado dizendo, no cabeçalho, que uma banca que
 * aderiu ao ENARE "NÃO é escolhível como alvo — oferecer 'UFPR' na lista manda o
 * aluno estudar para uma prova que não vai acontecer". O backend de IA já
 * respeitava; esta tela, que a regra nomeia, não.
 *
 * ⚠️ A banca CONTINUA na lista. Sumir seria trocar um silêncio por outro: o
 * aluno procura pelo nome que conhece e concluiria que não temos a prova dele. O
 * que ele precisa é da situação ao lado do nome, com o destino.
 */
function AvisoSituacao({ situacao }: { situacao: QuestionBankInstitution["situacao"] }) {
  if (!situacao || situacao.situacao === "ativa") return null;
  const motivo =
    situacao.situacao === "aderiu_enare"
      ? "não aplica prova própria"
      : situacao.situacao === "processo_unificado"
        ? "seleciona por processo unificado"
        : "prova extinta";
  return (
    <p className="mt-1 text-xs text-warning">
      {motivo}
      {situacao.ultima_edicao_conhecida
        ? ` desde ${situacao.ultima_edicao_conhecida + 1}`
        : ""}
      {situacao.alvo_atual ? ` · quem quer esta vaga faz ${situacao.alvo_atual}` : ""}
    </p>
  );
}

type Props = {
  token: string;
  mode: "preferences" | "onboarding";
  onSaved?: () => void;
};

function formatCount(value: number): string {
  return value.toLocaleString("pt-BR");
}

function yearRange(institution: QuestionBankInstitution): string | null {
  const first = institution.first_year;
  const last = institution.last_year;
  if (!first && !last) return null;
  if (first && last && first !== last) return `${first}–${last}`;
  return String(last ?? first);
}

// A chave da linha e a identidade da seleção: instituição quando existe, senão o
// código de banca de uma declaração antiga. Sem isto, duas linhas legadas com
// `institution_key` nulo colidiriam na `key` do React.
function identity(item: Selected): string {
  return item.institution_key || item.board_code || item.label;
}

export function TargetExamSelector({ token, mode, onSaved }: Props) {
  const [selected, setSelected] = useState<Selected[]>([]);
  const [institutions, setInstitutions] = useState<QuestionBankInstitution[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [online, setOnline] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Em paralelo: a lista de provas não depende da seleção atual, e
      // encadear as duas dobraria o tempo de tela em branco.
      const [current, available] = await Promise.all([
        getMyTargetExam(token),
        listQuestionBankInstitutions(token),
      ]);
      const byKey = new Map(available.map((item) => [item.institution_key, item]));
      setSelected(
        [...current.items]
          .sort((a, b) => a.priority - b.priority)
          .map((item) => {
            const known = item.institution_key ? byKey.get(item.institution_key) : undefined;
            return {
              board_code: item.board_code,
              institution_key: item.institution_key,
              exam_name: item.exam_name,
              exam_date: item.exam_date,
              label: known?.institution_label ?? item.label ?? item.board_code,
              recent_question_count: known?.recent_question_count ?? null,
              reliable_grain: known?.reliable_grain ?? null,
              situacao: known?.situacao ?? null,
            };
          }),
      );
      setRevision(current.selection_revision);
      setInstitutions(available);
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível carregar sua prova alvo."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedKeys = useMemo(
    () => new Set(selected.map((item) => item.institution_key).filter(Boolean)),
    [selected],
  );

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return institutions
      .filter((item) => !selectedKeys.has(item.institution_key))
      .filter(
        (item) =>
          !term ||
          item.institution_label.toLowerCase().includes(term) ||
          (item.state ?? "").toLowerCase().includes(term),
      )
      .slice(0, VISIBLE_INSTITUTIONS);
  }, [institutions, query, selectedKeys]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function add(institution: QuestionBankInstitution) {
    if (selected.length >= MAX_TARGET_EXAMS) return;
    setSaved(false);
    setSelected([
      ...selected,
      {
        institution_key: institution.institution_key,
        exam_name: null,
        // A DATA VEM PREENCHIDA quando a conhecemos. O campo era "opcional" e
        // chegava vazio, então na prática quase ninguém o preenchia — e sem data
        // o plano vira janela rolante em vez de parar na prova.
        //
        // `date_status` acompanha a procedência: só o edital autoriza
        // "confirmed", porque ele DOBRA o peso de urgência do objetivo. Fonte
        // secundária preenche o campo e deixa como estimativa.
        exam_date: institution.proxima_prova?.data ?? null,
        exam_date_origem: institution.proxima_prova?.data ?? null,
        date_status: institution.proxima_prova?.confirmada ? "confirmed" : "estimated",
        label: institution.institution_label,
        recent_question_count: institution.recent_question_count,
        reliable_grain: institution.reliable_grain,
        situacao: institution.situacao ?? null,
      },
    ]);
    setQuery("");
  }

  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    setSaved(false);
    setSelected(next);
  }

  function patch(index: number, changes: Partial<Selected>) {
    setSaved(false);
    setSelected(selected.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setConflict(false);
    try {
      const result = await replaceMyTargetExam(
        token,
        selected.map((item) => ({
          // `institution_key` quando existe; `board_code` só sobrevive para não
          // apagar declaração antiga que nunca teve instituição.
          ...(item.institution_key
            ? { institution_key: item.institution_key }
            : { board_code: item.board_code }),
          exam_name: item.exam_name?.trim() || null,
          exam_date: item.exam_date || null,
          // O save NUNCA mandava isto, e o backend caía no default "estimated".
          // Consequência: `signal_dictionary` paga o dobro de urgência para
          // "confirmed" e nunca recebia um.
          //
          // Se o aluno editou a data à mão, ela deixa de ser a do edital — volta
          // a ser estimativa, mesmo que a original estivesse confirmada.
          date_status:
            item.date_status === "confirmed" && item.exam_date === item.exam_date_origem
              ? "confirmed"
              : "estimated",
        })),
        revision,
      );
      setRevision(result.selection_revision);
      setSaved(true);
      onSaved?.();
    } catch (cause) {
      const detail = getAPIErrorDetail(cause);
      if (detail?.code === "objective_selection_revision_conflict") {
        setConflict(true);
        await load();
      } else {
        setError(getErrorMessage(cause, "Não foi possível salvar sua prova alvo."));
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-3" aria-busy="true">
        <Skeleton className="h-4 w-56 " />
        <Skeleton className="h-14 w-full " />
        <Skeleton className="h-14 w-full " />
        <Skeleton className="h-11 w-40 " />
      </div>
    );
  }

  // Banco sem instituição publicada é o único estado em que esta tela não tem o
  // que oferecer. Dizer isso é melhor do que mostrar uma busca que nunca acha nada.
  if (!institutions.length && !selected.length) {
    return (
      <Alert variant="info" className="mt-4">
        O banco de questões ainda não tem provas publicadas para escolher como alvo.
      </Alert>
    );
  }

  return (
    <div className="mt-4 space-y-5">
      {!online ? (
        <Alert variant="warning">Você está offline. A prova alvo fica somente para leitura.</Alert>
      ) : null}
      {conflict ? (
        <Alert variant="warning" onDismiss={() => setConflict(false)}>
          Outra aba alterou sua prova alvo. Recarregamos a versão mais recente; confira antes de salvar.
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="danger" onDismiss={() => setError(null)}>{error}</Alert>
      ) : null}

      {selected.length ? (
        <ol className="divide-y divide-edge" aria-label="Provas alvo em ordem de prioridade">
          {selected.map((item, index) => (
            <li key={identity(item)} className="space-y-3 py-4">
              <div className="flex items-start gap-3">
                <span className="w-6 shrink-0 pt-0.5 text-sm font-semibold text-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{item.label}</p>
                  {/* O que esta escolha entrega, com o número que a sustenta. E o
                      LIMITE dela junto: instituição com menos de 400 questões
                      recentes não sustenta ranking de subtema, e prometer o grão
                      fino ali seria vender ruído como personalização. */}
                  {item.recent_question_count !== null ? (
                    <p className="mt-1 text-xs text-muted">
                      <span className="font-mono text-ink">
                        {formatCount(item.recent_question_count)}
                      </span>{" "}
                      questões dos últimos 6 anos
                      {item.reliable_grain === "theme"
                        ? " · ajuste por área, não por subtema"
                        : ""}
                    </p>
                  ) : null}
                  <AvisoSituacao situacao={item.situacao} />
                </div>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || !online}
                  className="p-2 text-muted disabled:opacity-25"
                  aria-label={`Subir ${item.label}`}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === selected.length - 1 || !online}
                  className="p-2 text-muted disabled:opacity-25"
                  aria-label={`Descer ${item.label}`}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaved(false);
                    setSelected(selected.filter((_, i) => i !== index));
                  }}
                  disabled={!online}
                  className="p-2 text-muted hover:text-danger disabled:opacity-25"
                  aria-label={`Remover ${item.label}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="ml-9 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-muted">
                  Nome da prova (opcional)
                  <input
                    type="text"
                    value={item.exam_name ?? ""}
                    onChange={(event) => patch(index, { exam_name: event.target.value })}
                    disabled={!online}
                    maxLength={160}
                    placeholder="ex.: acesso direto 2027"
                    className="paper-control mt-1 min-h-10 w-full border border-edge bg-surface px-3 text-sm text-ink"
                  />
                </label>
                <label className="text-xs text-muted">
                  Data da prova (opcional)
                  <input
                    type="date"
                    value={item.exam_date ?? ""}
                    min={today}
                    onChange={(event) => patch(index, { exam_date: event.target.value })}
                    disabled={!online}
                    className="paper-control mt-1 min-h-10 w-full border border-edge bg-surface px-3 text-sm text-ink"
                  />
                </label>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">
          Nenhuma prova alvo definida. Sem ela, suas sessões distribuem as questões pela
          incidência histórica do banco.
        </p>
      )}

      {selected.length < MAX_TARGET_EXAMS ? (
        <div className="space-y-3 border-t border-edge pt-4">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque pela instituição ou pelo estado"
            aria-label="Buscar prova alvo"
            className="paper-control min-h-11 w-full border border-edge bg-surface px-3 text-sm text-ink"
          />
          {matches.length ? (
            <ul className="divide-y divide-edge border-y border-edge">
              {matches.map((institution) => {
                const years = yearRange(institution);
                return (
                  <li key={institution.institution_key} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {institution.institution_label}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        <span className="font-mono">
                          {formatCount(institution.question_count)}
                        </span>{" "}
                        questões
                        {years ? ` · ${years}` : ""}
                        {institution.state ? ` · ${institution.state}` : ""}
                      </p>
                      {/* ANTES de adicionar, e não depois: aqui é onde a escolha
                          acontece, e o custo de descobrir tarde é um plano
                          inteiro montado para uma prova que não vai acontecer. */}
                      <AvisoSituacao situacao={institution.situacao} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!online}
                      onClick={() => add(institution)}
                    >
                      Adicionar
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              {query.trim()
                ? "Nenhuma prova encontrada para esta busca."
                : "Todas as provas disponíveis já estão na sua lista."}
            </p>
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          onClick={() => void save()}
          loading={saving}
          disabled={!online || selected.length === 0}
        >
          {mode === "onboarding" ? "Salvar e continuar" : "Salvar prova alvo"}
        </Button>
        {saved ? (
          <span className="text-xs text-positive" role="status">
            Prova alvo salva.
          </span>
        ) : null}
      </div>
    </div>
  );
}
