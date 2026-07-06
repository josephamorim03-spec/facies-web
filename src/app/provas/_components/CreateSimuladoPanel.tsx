"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  browseQuestionBankTopics,
  createQuestionBankSession,
  previewQuestionBankAvailability,
  type QuestionBankAvailability,
  type QuestionBankMode,
  type QuestionBankTopic,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { useToast } from "@/lib/useToast";

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function topicLabel(topic: QuestionBankTopic): string {
  const path = Array.isArray(topic.node_path) ? topic.node_path.filter(Boolean).join(" / ") : "";
  return path || topic.path_label || topic.node_name;
}

function availabilityLabel(availability: QuestionBankAvailability | null, loading: boolean): string {
  if (loading) return "Calculando disponibilidade...";
  if (!availability) return "Escolha um recorte e calcule a disponibilidade.";
  if (availability.available_count <= 0) return "Nenhuma questão nova nesse recorte.";
  return `${availability.available_count} questões novas disponíveis`;
}

export default function CreateSimuladoPanel({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const { token, tokenResolved } = useAuthToken();
  const { showToast } = useToast();
  const [topics, setTopics] = useState<QuestionBankTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicId, setTopicId] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<QuestionBankMode>("adaptive");
  const [limit, setLimit] = useState(40);
  const [timeLimit, setTimeLimit] = useState(90);
  const [availability, setAvailability] = useState<QuestionBankAvailability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.knowledge_node_id === topicId) ?? null,
    [topicId, topics],
  );
  const clampedLimit = clampInt(limit, 1, 100, 40);
  const effectiveLimit =
    availability && availability.max_selectable > 0 ? Math.min(clampedLimit, availability.max_selectable) : clampedLimit;
  const clampedTimeLimit = clampInt(timeLimit, 5, 600, 90);
  const canStart = !busy && !!availability && availability.available_count > 0;

  useEffect(() => {
    if (!tokenResolved) return;
    let active = true;
    browseQuestionBankTopics(token, {
      include_empty: false,
      node_types: ["theme", "subtheme", "microcompetency"],
      limit: 120,
    })
      .then((data) => {
        if (!active) return;
        setTopics(
          data
            .filter((topic) => topic.question_count > 0)
            .sort((a, b) => (b.adaptive_weight_score ?? 0) - (a.adaptive_weight_score ?? 0)),
        );
      })
      .catch(() => {
        if (active) setTopics([]);
      })
      .finally(() => {
        if (active) setTopicsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, tokenResolved]);

  useEffect(() => {
    if (!tokenResolved) return;
    let active = true;
    previewQuestionBankAvailability(
      token,
      {
        knowledge_node_ids: selectedTopic ? [selectedTopic.knowledge_node_id] : undefined,
        search: search.trim() || undefined,
        answer_status: "unanswered",
        only_unanswered: true,
        mode,
      },
    )
      .then((data) => {
        if (!active) return;
        setAvailability(data);
        if (data.max_selectable > 0) {
          setLimit((prev) => (prev > data.max_selectable ? clampInt(data.max_selectable, 1, 100, 20) : prev));
        }
      })
      .catch(() => {
        if (!active) return;
        setAvailability(null);
        setError("Não foi possível calcular a disponibilidade.");
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, search, selectedTopic, token, tokenResolved]);

  async function startSimulation() {
    if (!tokenResolved || !canStart) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createQuestionBankSession(token, {
        mode,
        resolution_mode: "simulation",
        study_kind: "topic",
        knowledge_node_ids: selectedTopic ? [selectedTopic.knowledge_node_id] : undefined,
        search: search.trim() || undefined,
        answer_status: "unanswered",
        only_unanswered: true,
        correction_status: "all",
        generate_review_trail: false,
        limit: effectiveLimit,
        time_limit_minutes: clampedTimeLimit,
      });
      onCreated?.();
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível criar o simulado.";
      setError(message);
      showToast(message, "error");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-edge bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Novo simulado</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink">Medir desempenho agora</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Um bloco com correção ao final, limite de tempo e debrief depois da prova.
          </p>
        </div>
        <div className="rounded-lg border border-edge bg-paper px-3 py-2 text-xs text-muted">
          {availabilityLabel(availability, availabilityLoading)}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.9fr]">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Tema</span>
          <select
            value={topicId}
            onChange={(event) => {
              setTopicId(event.target.value);
              setAvailabilityLoading(true);
              setError(null);
            }}
            className="min-h-10 rounded-lg border border-edge bg-paper px-3 text-sm text-ink"
          >
            <option value="">{topicsLoading ? "Carregando temas..." : "Banco inteiro"}</option>
            {topics.map((topic) => (
              <option key={topic.knowledge_node_id} value={topic.knowledge_node_id}>
                {topicLabel(topic)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Busca opcional</span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setAvailabilityLoading(true);
              setError(null);
            }}
            placeholder="ex.: sepse, trauma..."
            className="min-h-10 rounded-lg border border-edge bg-paper px-3 text-sm text-ink"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Modo</span>
          <select
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as QuestionBankMode);
              setAvailabilityLoading(true);
              setError(null);
            }}
            className="min-h-10 rounded-lg border border-edge bg-paper px-3 text-sm text-ink"
          >
            <option value="adaptive">Adaptativo</option>
            <option value="by_topic">Manual</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Questões</span>
          <input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="min-h-10 rounded-lg border border-edge bg-paper px-3 text-sm text-ink"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Tempo</span>
          <input
            type="number"
            min={5}
            max={600}
            value={timeLimit}
            onChange={(event) => setTimeLimit(Number(event.target.value))}
            className="min-h-10 rounded-lg border border-edge bg-paper px-3 text-sm text-ink"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Padrão: questões não respondidas, correção só ao final, sem criar tarefas automaticamente.
        </p>
        <button
          type="button"
          onClick={() => void startSimulation()}
          disabled={!canStart}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Criando..." : "Iniciar simulado"}
        </button>
      </div>
    </section>
  );
}
