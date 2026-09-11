"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type {
  QuestionBankExamEdition,
  KrosMode,
  FullExamType,
  QuestionBankAnswerStatus,
  QuestionBankCorrectionStatus,
  QuestionBankSourceOption,
  QuestionBankStateOption,
  QuestionBankTopic,
  QuestionBankYearStat,
  StudyKind,
} from "@/lib/api";
import { BotaoDeEscolha } from "@/components/ui/BotaoDeEscolha";
import {
  CORRECTION_MODE_SHORT_LABEL,
  correcaoEfetiva,
  correcaoEhEscolhaDoAluno,
  type CorrectionMode,
} from "../_lib/sessionBuilder";
import { TopicTreeList } from "./TopicTreeList";
import { buildTopicTree, flattenTopicTree, topicPathLabel } from "./topicTree";
import BancaPicker from "./BancaPicker";
import YearPicker from "./YearPicker";
import { EscolhaDaProva } from "./EscolhaDaProva";
import { EscolhaDoModo } from "./EscolhaDoModo";
import { SecaoRecolhivel } from "./SecaoRecolhivel";
import { TreinoDirigidoChooser } from "./TreinoDirigidoChooser";

const AREA_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "GO", label: "GO" },
  { value: "OB", label: "OB" },
  { value: "CM", label: "CM" },
  { value: "CG", label: "CG" },
  { value: "MP", label: "MP" },
  { value: "PD", label: "PD" },
  { value: "OU", label: "OU" },
] as const;

type RealizacaoState = {
  unanswered: boolean;
  answeredExpanded: boolean;
  answeredSubset: "all" | "correct" | "wrong";
};

function deriveAnswerStatus(s: RealizacaoState): QuestionBankAnswerStatus {
  if (!s.unanswered && !s.answeredExpanded) return "all";
  if (s.unanswered && !s.answeredExpanded) return "unanswered";
  if (!s.unanswered && s.answeredExpanded) {
    if (s.answeredSubset === "correct") return "correct";
    if (s.answeredSubset === "wrong") return "wrong";
    return "answered";
  }
  if (s.answeredSubset === "wrong") return "unanswered_or_wrong";
  return "all";
}

function initRealizacaoState(v: QuestionBankAnswerStatus): RealizacaoState {
  switch (v) {
    case "unanswered": return { unanswered: true, answeredExpanded: false, answeredSubset: "all" };
    case "answered": return { unanswered: false, answeredExpanded: true, answeredSubset: "all" };
    case "correct": return { unanswered: false, answeredExpanded: true, answeredSubset: "correct" };
    case "wrong": return { unanswered: false, answeredExpanded: true, answeredSubset: "wrong" };
    case "unanswered_or_wrong": return { unanswered: true, answeredExpanded: true, answeredSubset: "wrong" };
    case "needs_review":
    case "near_miss":
      return { unanswered: false, answeredExpanded: true, answeredSubset: "wrong" };
    default: return { unanswered: false, answeredExpanded: false, answeredSubset: "all" };
  }
}

function deriveRealizacaoLabel(s: RealizacaoState): string {
  if (!s.unanswered && !s.answeredExpanded) return "Todas";
  const parts: string[] = [];
  if (s.unanswered) parts.push("Não feitas");
  if (s.answeredExpanded) {
    if (s.answeredSubset === "correct") parts.push("Acertos");
    else if (s.answeredSubset === "wrong") parts.push("Erros");
    else parts.push("Feitas");
  }
  return parts.join(" + ");
}

/**
 * Dois eixos, e não um.
 *
 * Isto era uma lista só, com "Prova institucional" ao lado de duas opções de
 * correção — e escolher a prova sobrescrevia a correção em silêncio
 * (`onResolutionModeChange("simulation")`). O aluno cuja preferência era
 * "revelar tudo ao finalizar" pedia uma prova institucional e recebia "escolher
 * por questão", sem aviso.
 *
 * São perguntas independentes: O QUE estudar (tópico ou prova inteira) e COMO
 * corrigir (por questão ou tudo no fim). Separadas, uma não apaga a outra.
 */
/**
 * O tipo da ESCOLHA na tela, que tem três valores — enquanto `StudyKind` (o do
 * contrato) tem dois. "Treino dirigido" não é um terceiro `study_kind`: o
 * servidor pina `study_kind="topic"` quando `session_kind="kros"`. Manter os
 * dois tipos separados evita ter de mentir para o contrato.
 */
export type TipoDeSessao = StudyKind | "kros";

const CORRECAO_OPTIONS: { value: CorrectionMode; label: string; help: string }[] = [
  { value: "immediate", label: "A cada questão", help: "Você responde, confere na hora e segue. O comentário abre logo abaixo." },
  { value: "guided_choice", label: "Ao terminar, uma a uma", help: "Termina tudo primeiro; depois revisa o raciocínio ou revela questão por questão." },
  { value: "reveal_all", label: "Ao terminar, tudo de uma vez", help: "Termina tudo primeiro; o gabarito e os comentários abrem juntos." },
];

export type FiltersBarProps = {
  area: string;
  onAreaChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  topics: QuestionBankTopic[];
  topicSuggestions: QuestionBankTopic[];
  topicsLoading?: boolean;
  topicsError?: boolean;
  onTopicsRetry?: () => void;
  selectedTopics: QuestionBankTopic[];
  onToggleTopic: (topic: QuestionBankTopic) => void;
  boardCodes: string[];
  examCodes: string[];
  institutions: string[];
  stateCodes: string[];
  sources: QuestionBankSourceOption[];
  states: QuestionBankStateOption[];
  sourcesLoading?: boolean;
  sourcesError?: boolean;
  onSourceSelectionChange: (selection: { boardCodes: string[]; examCodes: string[]; institutions: string[] }) => void;
  onStateCodesChange: (stateCodes: string[]) => void;
  onSourcesRetry?: () => void;
  yearStats: QuestionBankYearStat[];
  yearsLoading?: boolean;
  yearsError?: boolean;
  onYearsRetry?: () => void;
  selectedYears: number[];
  onSelectedYearsChange: (years: number[]) => void;
  includeNoYear: boolean;
  onIncludeNoYearChange: (v: boolean) => void;
  answerStatus: QuestionBankAnswerStatus;
  onAnswerStatusChange: (v: QuestionBankAnswerStatus) => void;
  correctionStatus: QuestionBankCorrectionStatus;
  onCorrectionStatusChange: (v: QuestionBankCorrectionStatus) => void;
  correctionMode: CorrectionMode;
  onCorrectionModeChange: (v: CorrectionMode) => void;
  tipoSessao: TipoDeSessao;
  onTipoSessaoChange: (v: TipoDeSessao) => void;
  /** O preset do Treino dirigido, e o que a prévia sabe sobre as provas-alvo. */
  krosMode: KrosMode;
  onKrosModeChange: (v: KrosMode) => void;
  krosBancasAlvo: string[];
  krosBancasSemCobertura: string[];
  krosPreviaCarregando: boolean;
  /** Inclui na prova as questoes que a banca anulou ou que estao desatualizadas. */
  includeRetired: boolean;
  onIncludeRetiredChange: (value: boolean) => void;
  /** As edições da banca/ano escolhidos. Vazio = uma só, ou banco sem as views. */
  examEditions: QuestionBankExamEdition[];
  /** Tamanho da prova por ano, no modo prova. `null` nos outros. */
  tamanhoPorAnoDaProva: Map<number, number> | null;
  /** Quando a prova de cada ano caiu ("out/2025"). Ausente = sem evidência. */
  aplicacaoPorAnoDaProva: Map<number, string> | null;
  /** Tamanho de PROVA por banca. `null` = nao e modo prova, ou ainda carregando. */
  totaisDaProva: Map<string, number> | null;
  examEditionsLoading: boolean;
  fullExamNumber: string | null;
  onFullExamNumberChange: (v: string | null) => void;
  fullExamType: FullExamType;
  onFullExamTypeChange: (v: FullExamType) => void;
  limit: number;
  clampedLimit: number;
  limitMax: number;
  /**
   * Piso e passo da quantidade. Valem 1 e 1 em quase toda a tela; no Treino
   * dirigido são 20 e 5, porque é a grade que o servidor aceita — fora dela ele
   * responde 422 e a sessão não nasce. Ver `_lib/sessionBuilder`.
   */
  limitMin?: number;
  limitStep?: number;
  onLimitChange: (v: number) => void;
  focusTopicId?: string | null;
  onQuantityEditingChange?: (editing: boolean) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}


function toggleCode(values: string[], code: string): string[] {
  const normalized = values.map((value) => value.trim().toUpperCase()).filter(Boolean);
  return normalized.includes(code) ? normalized.filter((value) => value !== code) : [...normalized, code];
}

function StatePicker({
  states,
  selected,
  onChange,
}: {
  states: QuestionBankStateOption[];
  selected: string[];
  onChange: (stateCodes: string[]) => void;
}) {
  const selectedSet = useMemo(
    () => new Set(selected.map((value) => value.trim().toUpperCase()).filter(Boolean)),
    [selected],
  );
  const options = useMemo(() => {
    const byCode = new Map<string, QuestionBankStateOption>();
    for (const state of states) {
      const code = String(state.state_code || state.label || "").trim().toUpperCase();
      if (!code) continue;
      const current = byCode.get(code);
      if (!current || state.question_count > current.question_count) {
        byCode.set(code, { ...state, state_code: code, label: state.label || code });
      }
    }
    for (const code of selectedSet) {
      if (!byCode.has(code)) byCode.set(code, { state_code: code, label: code, question_count: 0 });
    }
    return Array.from(byCode.values()).sort((a, b) => b.question_count - a.question_count || a.state_code.localeCompare(b.state_code));
  }, [selectedSet, states]);

  return (
    <div className="space-y-3 border-t border-edge pt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="paper-eyebrow">Estado da prova</p>
          <p className="mt-0.5 text-xs text-muted">UF catalogada na prova, banca ou instituição.</p>
        </div>
        {selectedSet.size > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted underline underline-offset-2 hover:text-ink"
          >
            Limpar
          </button>
        )}
      </div>
      {options.length === 0 ? (
        <p className="paper-dashed px-3 py-4 text-center text-xs text-muted">
          Nenhuma UF catalogada neste recorte.
        </p>
      ) : (
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
          {options.map((state) => {
            const code = state.state_code.trim().toUpperCase();
            const active = selectedSet.has(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => onChange(toggleCode(selected, code))}
                className={cx("km-chip", active && "km-chip-active")}
                aria-pressed={active}
              >
                <span>{code}</span>
                <span className="text-micro tabular-nums text-muted">{state.question_count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FiltersBar(props: FiltersBarProps) {
  const {
    area, onAreaChange, search, onSearchChange, topics, topicSuggestions, selectedTopics, onToggleTopic,
    topicsLoading = false, topicsError = false, onTopicsRetry,
    boardCodes, examCodes, institutions, stateCodes, sources, states, sourcesLoading, sourcesError, onSourceSelectionChange, onStateCodesChange, onSourcesRetry,
    yearStats, yearsLoading, yearsError, onYearsRetry,
    selectedYears, onSelectedYearsChange, includeNoYear, onIncludeNoYearChange,
    answerStatus, onAnswerStatusChange,
    correctionStatus, onCorrectionStatusChange,
    correctionMode, onCorrectionModeChange, tipoSessao, onTipoSessaoChange,
    krosMode, onKrosModeChange, krosBancasAlvo, krosBancasSemCobertura,
    krosPreviaCarregando,
    includeRetired, onIncludeRetiredChange,
    examEditions, examEditionsLoading, fullExamNumber, onFullExamNumberChange,
    tamanhoPorAnoDaProva,
    aplicacaoPorAnoDaProva,
    totaisDaProva,
    fullExamType, onFullExamTypeChange,
    limit, clampedLimit, limitMax, limitMin = 1, limitStep = 1,
    onLimitChange, focusTopicId, onQuantityEditingChange,
  } = props;

  const [suggestionsFocused, setSuggestionsFocused] = useState(false);
  const [realizacaoState, setRealizacaoState] = useState<RealizacaoState>(() => initRealizacaoState(answerStatus));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [limitDraft, setLimitDraft] = useState(String(limit));

  useEffect(() => { setRealizacaoState(initRealizacaoState(answerStatus)); }, [answerStatus]);
  useEffect(() => { setLimitDraft(String(limit)); }, [limit]);

  function toggleTopicExpanded(topicId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  const topicTree = useMemo(() => buildTopicTree(topics), [topics]);
  const flatTopics = useMemo(() => flattenTopicTree(topicTree), [topicTree]);
  const selectedTopicIds = new Set(selectedTopics.map((t) => t.knowledge_node_id));
  const syntheticGroupIds = useMemo(
    () => new Set(flatTopics.filter((topic) => topic.synthetic).map((topic) => topic.knowledge_node_id)),
    [flatTopics],
  );
  const expandedTopicIds = useMemo(() => {
    if (search.trim()) return new Set(flatTopics.map((topic) => topic.knowledge_node_id));
    const next = new Set(expandedIds);
    for (const id of syntheticGroupIds) next.add(id);
    return next;
  }, [expandedIds, flatTopics, search, syntheticGroupIds]);

  useEffect(() => {
    if (!focusTopicId) return;
    const topicById = new Map(flatTopics.map((topic) => [topic.knowledge_node_id, topic]));
    const expanded = new Set<string>();
    let current = topicById.get(focusTopicId);
    while (current?.parent_knowledge_node_id) {
      expanded.add(current.parent_knowledge_node_id);
      current = topicById.get(current.parent_knowledge_node_id);
    }
    const syntheticParent = flatTopics.find((topic) => topic.children.some((child) => child.knowledge_node_id === focusTopicId));
    if (syntheticParent) expanded.add(syntheticParent.knowledge_node_id);
    setExpandedIds((previous) => new Set([...previous, ...expanded]));
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`topic-node-${focusTopicId}`);
      target?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      target?.querySelector("input")?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [flatTopics, focusTopicId]);

  /**
   * Encosta o que foi digitado no piso, no teto e no PASSO do modo.
   *
   * ⚠️ O passo entrava antes só como atributo do `<input>`, e atributo de passo
   * não valida nada: o campo aceita 37 digitado à mão, o navegador não reclama,
   * e no Treino dirigido esse 37 vira 422 no servidor. Quem decide é esta
   * função.
   */
  function encostarNaGrade(valor: number): number {
    const dentro = Math.max(limitMin, Math.min(limitMax, valor));
    if (limitStep <= 1) return dentro;
    const encostado = Math.floor((dentro - limitMin) / limitStep) * limitStep + limitMin;
    return Math.max(limitMin, Math.min(limitMax, encostado));
  }

  function commitLimitDraft() {
    const parsed = Number(limitDraft);
    const next = Number.isInteger(parsed) ? encostarNaGrade(parsed) : clampedLimit;
    onLimitChange(next);
    setLimitDraft(String(next));
  }

  /**
   * No desktop abrem os passos 1 e 3; no telemóvel ficam todos recolhidos.
   *
   * ⚠️ O passo 2 fica fechado nas duas larguras, e isso é o comportamento que
   * ele já tinha antes desta rodada: "Refinar seleção" sempre foi um
   * `<details>` de abertura voluntária. Mexer nisso seria mudar uma decisão que
   * não estava em causa.
   *
   * ⚠️ NÃO CONTROLADO POR ESTADO, e isso é deliberado. `banco/page.tsx` escreve
   * `target.open = true` diretamente no DOM quando localiza um filtro ativo —
   * com `open={estado}` o React voltaria a fechar o passo no render seguinte.
   *
   * O recolhido é a regra de quem tem 390px: ali a decisão tem de caber acima da
   * dobra, e é ela que faz a tela avançar. No desktop há coluna para tudo, e
   * esconder seria trabalho a mais.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    // Na PROVA o foco clínico nem existe, e o passo que importa é o da banca e
    // do ano. Abrir "topic-filters" ali deixaria a pessoa diante de um passo
    // recolhido justamente onde ela tem de escolher — que é a queixa de "não é
    // prático". `question-bank-adjustments` é onde `BancaPicker` e `YearPicker`
    // vivem.
    const abrir = tipoSessao === "full_exam"
      ? ["question-bank-adjustments", "question-bank-session-settings"]
      : ["question-bank-topic-filters", "question-bank-session-settings"];
    for (const id of abrir) {
      const alvo = document.getElementById(id);
      if (alvo instanceof HTMLDetailsElement) alvo.open = true;
    }
    // Reage à TROCA de modo, e não só à montagem: quem chega por tópico e muda
    // para prova precisa que o passo certo abra na hora.
  }, [tipoSessao]);

  // Os DOIS eixos no título. Antes "Prova institucional" engolia a correção, e o
  // aluno não via como a prova seria corrigida até terminá-la.
  const modeLabel = [
    tipoSessao === "full_exam"
      ? "Prova institucional"
      : tipoSessao === "kros"
        ? "Treino dirigido"
        : "Por tópico",
    CORRECTION_MODE_SHORT_LABEL[correcaoEfetiva(correctionMode, tipoSessao)],
  ].join(" · ");
  const statusLabel = deriveRealizacaoLabel(realizacaoState);
  const selectedSourceCount = boardCodes.length + examCodes.length + institutions.length;
  const selectedStateCount = stateCodes.length;
  const sourceDetail = selectedSourceCount > 0
    ? `${selectedSourceCount} fonte${selectedSourceCount > 1 ? "s" : ""}`
    : "todas as fontes";
  const stateDetail = selectedStateCount > 0 ? `${selectedStateCount} UF` : "todas as UFs";

  return (
    <div className="divide-y divide-edge">
      {/* A DECISAO PRIMEIRO, e sempre visivel. Ver `EscolhaDoModo`: ela estava
          dentro de "3. Modo e carga", o ultimo bloco e fechado no telemovel,
          entao a tela pedia o refinamento antes de perguntar o que a pessoa
          vinha fazer. */}
      <EscolhaDoModo valor={tipoSessao} onChange={onTipoSessaoChange} />

      {/* O foco clinico NAO se aplica a prova: ela e' um caderno fechado, e
          filtrar tema dentro dela entregaria um pedaco com nome de prova.
          Esconder e' mais honesto que mostrar um controle sem efeito. */}
      {tipoSessao === "full_exam" ? null : (
      <SecaoRecolhivel
        id="question-bank-topic-filters"
        step="1. Foco clínico"
        title="Escolha a área e os temas"
        detail={`${AREA_OPTIONS.find((o) => o.value === area)?.label ?? "Todas"} · ${
          selectedTopics.length > 0
            ? `${selectedTopics.length} ${selectedTopics.length === 1 ? "tema" : "temas"}`
            : "todos os assuntos"
        }`}
      >
        <div className="fileira-de-controles">
          {AREA_OPTIONS.map((option) => {
            const selected = area === option.value;
            return (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => onAreaChange(option.value)}
                className={cx("km-chip", selected && "km-chip-active")}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSuggestionsFocused(true)}
            onBlur={() => setTimeout(() => setSuggestionsFocused(false), 150)}
            placeholder="Buscar especialidade, macrotema ou subtema"
            className="w-full"
          />
          {suggestionsFocused && search.trim() && (
            <ul className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 max-h-72 overflow-y-auto rounded-surface border border-edge bg-surface ">
              {topicSuggestions.slice(0, 8).map((topic) => {
                const selectable = topic.question_count > 0;
                return (
                  <li key={topic.knowledge_node_id}>
                    <button
                      type="button"
                      disabled={!selectable}
                      onMouseDown={() => {
                        if (!selectable) return;
                        onToggleTopic(topic);
                        onSearchChange("");
                        setSuggestionsFocused(false);
                      }}
                      className={cx(
                        "flex w-full flex-col px-3 py-2 text-left",
                        selectable ? "hover:bg-surfaceMuted" : "cursor-not-allowed opacity-65",
                      )}
                    >
                      <span className="break-words text-sm font-medium [overflow-wrap:anywhere]">{topic.node_name}</span>
                      <span className="break-words font-mono text-micro tabular-nums text-muted [overflow-wrap:anywhere]">{topicPathLabel(topic)} · {topic.question_count} q</span>
                    </button>
                  </li>
                );
              })}
              {topicSuggestions.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">Nenhum resultado para &ldquo;{search}&rdquo;</li>
              )}
            </ul>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
          {/* ⚠️ O RECORTE PASSOU A SER SO DE DESKTOP.

              A 390px esta caixa ERA a dobra: 512px de altura fixa, e um scroller
              aninhado dentro do scroller da pagina — o antipadrao classico em
              toque, porque o dedo nunca sabe qual dos dois vai mover.

              Seguro porque a arvore nasce recolhida (`expandedIds` vazio), o que
              da ~460px, e agora ela vive dentro de um passo que a pessoa abriu
              de proposito. */}
          <div className="overflow-visible rounded-control border border-edge bg-paper p-2 lg:max-h-[32rem] lg:overflow-y-auto">
            <TopicTreeList
              nodes={topicTree}
              selectedIds={selectedTopicIds}
              expandedIds={expandedTopicIds}
              onToggle={onToggleTopic}
              onToggleExpand={toggleTopicExpanded}
              loading={topicsLoading}
              error={topicsError}
            onRetry={onTopicsRetry}
            highlightedId={focusTopicId}
            />
          </div>

          <div className="border-l-2 border-edge pl-3">
            <p className="paper-eyebrow">
              {selectedTopics.length > 0
                ? `${selectedTopics.length} selecionado${selectedTopics.length > 1 ? "s" : ""}`
                : "Nenhum tema selecionado"}
            </p>
            {selectedTopics.length > 0 ? (
              <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                {selectedTopics.map((topic) => (
                  <span key={topic.knowledge_node_id} className="km-chip max-w-full items-start">
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{topicPathLabel(topic)}</span>
                    <button
                      type="button"
                      onClick={() => onToggleTopic(topic)}
                      className="ml-0.5 text-muted hover:text-ink"
                      aria-label={`Remover ${topic.node_name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted">Sem tema, usa todos os assuntos dos filtros.</p>
            )}
          </div>
        </div>
      </SecaoRecolhivel>
      )}

      <SecaoRecolhivel
        id="question-bank-adjustments"
        // A prova nao tem "1. Foco clinico", entao aqui ela e' o passo 1 -- e o
        // nome muda com ele: para a prova isto nao e' refinamento, e' A escolha.
        step={tipoSessao === "full_exam" ? "1. A prova" : "2. Refinar seleção"}
        title={tipoSessao === "full_exam" ? "Banca e ano" : "Banca, ano e histórico"}
        detail={`${statusLabel} · ${sourceDetail} · ${stateDetail}`}
      >
        <BancaPicker
          sources={sources}
          totaisDaProva={totaisDaProva}
          selectedBoardCodes={boardCodes}
          selectedExamCodes={examCodes}
          selectedInstitutions={institutions}
          onChange={onSourceSelectionChange}
          loading={sourcesLoading}
          error={sourcesError}
          onRetry={onSourcesRetry}
        />

        <StatePicker
          states={states}
          selected={stateCodes}
          onChange={onStateCodesChange}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <YearPicker
            yearStats={yearStats}
            tamanhoPorAnoDaProva={tamanhoPorAnoDaProva}
            aplicacaoPorAnoDaProva={aplicacaoPorAnoDaProva}
            selectedYears={selectedYears}
            onSelectedYearsChange={onSelectedYearsChange}
            includeNoYear={includeNoYear}
            onIncludeNoYearChange={onIncludeNoYearChange}
            loading={yearsLoading}
            error={yearsError}
            onRetry={onYearsRetry}
          />

          <div className="space-y-3">
            <p className="paper-eyebrow">Status das questões</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = { ...realizacaoState, unanswered: !realizacaoState.unanswered };
                  setRealizacaoState(next);
                  onAnswerStatusChange(deriveAnswerStatus(next));
                }}
                className={cx("km-chip", realizacaoState.unanswered && "km-chip-active")}
              >
                Não feitas
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = { ...realizacaoState, answeredExpanded: !realizacaoState.answeredExpanded };
                  setRealizacaoState(next);
                  onAnswerStatusChange(deriveAnswerStatus(next));
                }}
                className={cx("km-chip", realizacaoState.answeredExpanded && "km-chip-active")}
              >
                Feitas
              </button>
            </div>
            {realizacaoState.answeredExpanded && (
              <div className="flex flex-wrap gap-2 border-l-2 border-primary/30 pl-4">
                {(["all", "correct", "wrong"] as const).map((subset) => (
                  <button
                    key={subset}
                    type="button"
                    onClick={() => {
                      const next = { ...realizacaoState, answeredSubset: subset };
                      setRealizacaoState(next);
                      onAnswerStatusChange(deriveAnswerStatus(next));
                    }}
                    className={cx("km-chip", realizacaoState.answeredSubset === subset && "km-chip-active")}
                  >
                    {subset === "all" ? "Todas" : subset === "correct" ? "Acertadas" : "Erradas"}
                  </button>
                ))}
              </div>
            )}
            <div>
              <p className="paper-eyebrow mb-2">Correção IA</p>
              <div className="fileira-de-controles">
                {([
                  ["all", "Todas"],
                  ["with_correction", "Com correção"],
                  ["without_correction", "Sem correção"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onCorrectionStatusChange(value)}
                    className={cx("km-chip", correctionStatus === value && "km-chip-active")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SecaoRecolhivel>

      <SecaoRecolhivel
        id="question-bank-session-settings"
        step={tipoSessao === "full_exam" ? "2. A prova e a correção" : "3. Carga e correção"}
        title={`${modeLabel}, ${clampedLimit} questões`}
      >
        <fieldset>
          {/* A ênfase só aparece depois de escolher o Treino dirigido: mostrar
              quatro cartões a mais para quem escolheu "Por tópico" seria oferecer
              uma decisão que não existe naquele caminho. */}
          {tipoSessao === "kros" ? (
            <TreinoDirigidoChooser
              value={krosMode}
              onChange={onKrosModeChange}
              bancasAlvo={krosBancasAlvo}
              bancasSemCobertura={krosBancasSemCobertura}
              carregando={krosPreviaCarregando}
            />
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="paper-eyebrow">
            Como corrigir
          </legend>
          {correcaoEhEscolhaDoAluno(tipoSessao) ? null : (
            <p className="mt-1 text-nota text-muted">
              {tipoSessao === "full_exam" ? "A prova" : "O treino dirigido"} corrige ao terminar —
              ver o gabarito no meio desfaria o exercício.
            </p>
          )}
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {/* ⚠️ Estes três não tinham sequer `rounded-*` nem alvo mínimo: era
                um retângulo de canto vivo, com o estado pintado em
                `bg-surfaceMuted`. Mesma decisão do bloco acima, três gramáticas
                diferentes na MESMA secção da tela. */}
            {CORRECAO_OPTIONS.filter(
              (option) => option.value !== "immediate" || correcaoEhEscolhaDoAluno(tipoSessao),
            ).map((option) => (
              <BotaoDeEscolha
                key={option.value}
                escolhido={correcaoEfetiva(correctionMode, tipoSessao) === option.value}
                onClick={() => onCorrectionModeChange(option.value)}
                descricao={option.help}
              >
                {option.label}
              </BotaoDeEscolha>
            ))}
          </div>
        </fieldset>

        {tipoSessao === "full_exam" ? (
          <div className="grid gap-3 border-t border-edge pt-4 md:grid-cols-[11rem_1fr]">
            {/* A INSTITUIÇÃO E O ANO SAÍRAM DAQUI, e não foi cosmética.
                Eram dois `<input>` de texto livre, e o payload mandava ao banco
                o que a pessoa digitasse: `institutions = [fullExamName]`. As
                chaves reais têm 60 a 90 caracteres e a comparação é exata, então
                "USP" casava ZERO — e ainda sobrescrevia a banca já escolhida no
                seletor logo acima, que trazia a chave certa. Campo vazio deixava
                o botão morto sem dizer por quê.

                Agora a prova é a banca e o ano do seletor. Aqui fica só o que
                ele não cobre: a modalidade, e qual prova quando houve duas. */}
            <label className="space-y-1.5">
              <span className="paper-eyebrow">Tipo</span>
              <select
                value={fullExamType}
                onChange={(e) => onFullExamTypeChange(e.target.value as FullExamType)}
                className="w-full rounded-control border border-edge bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="acesso_direto">Acesso direto</option>
                <option value="r_plus">R+</option>
              </select>
            </label>
            <EscolhaDaProva
              edicoes={examEditions}
              carregando={examEditionsLoading}
              valor={fullExamNumber}
              onChange={onFullExamNumberChange}
            />
          </div>
        ) : null}

        {/* So aparece na prova institucional: e o unico recorte onde "a prova
            inteira" quer dizer alguma coisa. Num estudo por tema, questao sem
            gabarito valido seria ruido.

            Destacado, e nao mais um checkbox na lista: quem escolhe fazer a
            prova na integra precisa achar isto sem procurar. O texto diz o que
            muda de fato -- a prova ja vem completa, e a unica coisa em jogo e a
            anulada. */}
        {tipoSessao === "full_exam" ? (
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-control border p-4 transition-colors ${
              includeRetired
                ? "border-accent bg-surface-muted"
                : "border-edge bg-surface hover:border-accent"
            }`}
          >
            <input
              type="checkbox"
              checked={includeRetired}
              onChange={(e) => onIncludeRetiredChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Incluir as questoes anuladas
              </span>
              <span className="mt-1 block text-xs text-muted">
                A prova ja vem completa, como caiu no dia. As que a banca anulou
                depois ficam de fora por padrao, porque nao tem gabarito valido.
                Marque para enfrentar o caderno na integra: elas vem sinalizadas
                e nao contam no seu desempenho.
              </span>
            </span>
          </label>
        ) : null}

        {/* Alinhado a esquerda e em largura cheia, como o cabecalho da secao e os
            cards de modo acima. Centralizar num `max-w-md` fazia deste bloco uma
            ilha estreita que nao encostava em nenhuma borda vizinha. */}
        <div className="space-y-3 border-t border-edge pt-5">
          <div className="flex items-end justify-between gap-4">
            <label className="space-y-1.5">
              <span className="paper-eyebrow block">Questões</span>
              <input
                type="number"
                min={limitMin}
                max={limitMax}
                step={limitStep}
                inputMode="numeric"
                pattern="[0-9]*"
                value={limitDraft}
                onFocus={() => onQuantityEditingChange?.(true)}
                onChange={(e) => {
                  const next = e.target.value;
                  if (/^\d*$/.test(next)) setLimitDraft(next);
                }}
                onBlur={() => {
                  commitLimitDraft();
                  onQuantityEditingChange?.(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                className="w-24 text-center"
              />
            </label>
            {/* ⚠️ O MÁXIMO É O DO CONTROLE, e não o do acervo.
                Com o Treino dirigido num filtro de 12 questões, esta linha dizia
                "Máx. 12" ao lado de uma barra travada em 20 — dois números para
                a mesma coisa, na mesma linha, discordando um do outro. O que o
                aluno precisa de saber aqui é até onde o controle vai; quantas
                questões o filtro tem é o que a ressalva diz, com palavras. */}
            <p className="pb-2.5 text-xs text-muted">Máx. {limitMax}</p>
          </div>
          <input
            type="range"
            min={limitMin}
            max={limitMax}
            step={limitStep}
            value={clampedLimit}
            onChange={(e) => {
              const next = encostarNaGrade(Number(e.target.value));
              setLimitDraft(String(next));
              onLimitChange(next);
            }}
            className="w-full"
            style={{ "--track-bg": `linear-gradient(to right, var(--range-fill) 0%, var(--range-fill) ${((clampedLimit - limitMin) / Math.max(1, limitMax - limitMin)) * 100}%, var(--range-rest) ${((clampedLimit - limitMin) / Math.max(1, limitMax - limitMin)) * 100}%, var(--range-rest) 100%)` } as CSSProperties}
            aria-label="Quantidade de questões"
          />
          {/* A regra fica ESCRITA junto do controle que ela restringe. O piso do
              Treino dirigido não é arbitrário: abaixo de 20 o motor não tem itens
              para preencher as quotas do preset, e a sessão sairia com a mistura
              torta — plausível e errada. Uma barra que simplesmente se recusa a
              descer, sem dizer porquê, parece defeito. */}
          {tipoSessao === "kros" ? (
            <p className="text-xs text-muted">
              O Treino dirigido monta de 20 a 120 questões, de 5 em 5 — é o
              mínimo para a ênfase escolhida caber na mistura.
            </p>
          ) : null}
        </div>
      </SecaoRecolhivel>
    </div>
  );
}
