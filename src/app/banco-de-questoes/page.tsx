"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import {
  browseQuestionBankQuestions,
  browseQuestionBankTopics,
  createQuestionBankSession,
  finalizeQuestionBankSession,
  recordQuestionBankAttempt,
  recordQuestionBankCorrection,
  type QuestionBankOption,
  type QuestionBankQuestion,
  type QuestionBankResolutionMode,
  type QuestionBankSession,
  type QuestionBankTopic,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

const OPTIONS: QuestionBankOption[] = ["A", "B", "C", "D", "E"];

function pct(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

export default function BancoDeQuestoesPage() {
  const { token, tokenResolved } = useAuthToken();
  const [search, setSearch] = useState("");
  const [boardCode, setBoardCode] = useState("");
  const [limit, setLimit] = useState(5);
  const [resolutionMode, setResolutionMode] = useState<QuestionBankResolutionMode>("training");
  const [topics, setTopics] = useState<QuestionBankTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<QuestionBankTopic | null>(null);
  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [session, setSession] = useState<QuestionBankSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [correctionDrafts, setCorrectionDrafts] = useState<Record<number, string>>({});

  async function runTopicSearch() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const board_codes = boardCode.trim() ? [boardCode.trim().toUpperCase()] : undefined;
      const found = await browseQuestionBankTopics(token, { search, board_codes, limit: 80 });
      setTopics(found);
      setSelectedTopic(found[0] ?? null);
      setQuestions([]);
      setSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel buscar temas do banco.");
    } finally {
      setBusy(false);
    }
  }

  async function previewQuestions(topic = selectedTopic) {
    if (!topic) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const board_codes = boardCode.trim() ? [boardCode.trim().toUpperCase()] : undefined;
      setQuestions(await browseQuestionBankQuestions(token, {
        knowledge_node_ids: [topic.knowledge_node_id],
        board_codes,
        limit,
        only_unanswered: true,
      }));
      setSession(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel buscar questoes.");
    } finally {
      setBusy(false);
    }
  }

  async function startSession(topic = selectedTopic) {
    if (!topic) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const board_codes = boardCode.trim() ? [boardCode.trim().toUpperCase()] : undefined;
      setSession(await createQuestionBankSession(token, {
        mode: "adaptive",
        resolution_mode: resolutionMode,
        knowledge_node_ids: [topic.knowledge_node_id],
        board_codes,
        limit,
        only_unanswered: true,
      }));
      setQuestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar a sessao.");
    } finally {
      setBusy(false);
    }
  }

  async function answer(position: number, selected: QuestionBankOption) {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      setSession(await recordQuestionBankAttempt(token, session.session_id, position, {
        selected_option: selected,
        confidence_self_rating: 3,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar a resposta.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCorrection(position: number) {
    if (!session) return;
    const response = correctionDrafts[position]?.trim();
    if (!response) return;
    setBusy(true);
    setError(null);
    try {
      const out = await recordQuestionBankCorrection(token, session.session_id, position, {
        prompt: "Qual foi o raciocinio correto e onde voce errou?",
        response_value: response,
        confidence_delta: 0.3,
      });
      setSession(out.session);
      setCorrectionDrafts((current) => ({ ...current, [position]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar a correcao guiada.");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!session) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const out = await finalizeQuestionBankSession(token, session.session_id, { confirm_unanswered: true });
      setSession(out.session);
      setResult(`${out.correct_questions}/${out.total_questions} acertos. Estudo ${out.study_id} criado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel finalizar.");
    } finally {
      setBusy(false);
    }
  }

  if (!tokenResolved) return <main className="p-6 text-sm text-muted">Carregando...</main>;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <section className="overflow-hidden rounded-[2rem] border border-edge bg-paper shadow-sm">
        <div className="bg-[linear-gradient(135deg,#17221b,#51624f)] p-6 text-paper md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-paper/70">KrosMed adaptativo</p>
          <h1 className="mt-3 font-serif text-4xl font-bold">Banco de questoes</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/80">
            Escolha um tema real do KrosBank. O peso vem da recorrencia do banco somada ao seu estado adaptativo, sem assunto livre e sem peso manual.
          </p>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-[1fr_9rem_8rem_10rem_auto]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tema ou microcompetencia" className="rounded-xl border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-ink" />
          <input value={boardCode} onChange={(e) => setBoardCode(e.target.value.toUpperCase())} placeholder="Banca" className="rounded-xl border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-ink" />
          <input type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="rounded-xl border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-ink" />
          <select value={resolutionMode} onChange={(e) => setResolutionMode(e.target.value as QuestionBankResolutionMode)} className="rounded-xl border border-edge bg-paper px-3 py-2 text-sm outline-none focus:border-ink">
            <option value="training">Treino</option>
            <option value="simulation">Simulado</option>
          </select>
          <button type="button" onClick={runTopicSearch} disabled={busy} className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">Buscar temas</button>
        </div>
        {error && <p className="px-5 pb-4 text-sm text-red-600">{error}</p>}
        {result && <p className="px-5 pb-4 text-sm font-medium text-emerald-700">{result}</p>}
      </section>

      {!session && topics.length > 0 && (
        <section className="grid gap-4 md:grid-cols-[1fr_20rem]">
          <div className="grid gap-3">
            {topics.map((topic) => (
              <button key={topic.knowledge_node_id} type="button" onClick={() => { setSelectedTopic(topic); void previewQuestions(topic); }} className={`rounded-3xl border p-4 text-left transition ${selectedTopic?.knowledge_node_id === topic.knowledge_node_id ? "border-ink bg-[var(--amber-tint)]" : "border-edge bg-paper hover:border-ink"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{topic.node_code ?? "KrosBank"} - {topic.node_type ?? "tema"}</p>
                    <h2 className="mt-1 font-serif text-xl font-semibold text-ink">{topic.node_name}</h2>
                  </div>
                  <span className="rounded-full border border-edge px-3 py-1 text-xs font-semibold">Peso {topic.adaptive_weight}</span>
                </div>
                <p className="mt-3 text-sm text-muted">{topic.question_count} questoes - demanda {pct(topic.bank_demand_score)} - prioridade pessoal {pct(topic.adaptive_weight_score)}</p>
              </button>
            ))}
          </div>
          <aside className="h-fit rounded-3xl border border-edge bg-paper p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Selecao atual</p>
            <h3 className="mt-2 font-serif text-2xl font-semibold">{selectedTopic?.node_name ?? "Escolha um tema"}</h3>
            {selectedTopic && (
              <>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-muted">Questoes</dt><dd className="font-semibold">{selectedTopic.question_count}</dd></div>
                  <div><dt className="text-muted">Peso</dt><dd className="font-semibold">{selectedTopic.adaptive_weight}</dd></div>
                  <div><dt className="text-muted">Recorrencia</dt><dd className="font-semibold">{pct(selectedTopic.recurrence_score)}</dd></div>
                  <div><dt className="text-muted">Demanda</dt><dd className="font-semibold">{pct(selectedTopic.bank_demand_score)}</dd></div>
                </dl>
                <div className="mt-5 flex flex-col gap-2">
                  <button type="button" onClick={() => previewQuestions()} disabled={busy} className="rounded-xl border border-ink px-4 py-2 text-sm font-semibold disabled:opacity-50">Ver questoes</button>
                  <button type="button" onClick={() => startSession()} disabled={busy} className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">Comecar sessao</button>
                </div>
              </>
            )}
          </aside>
        </section>
      )}

      {!session && questions.length > 0 && (
        <section className="rounded-3xl border border-edge bg-paper p-5">
          <h2 className="font-serif text-xl font-semibold">Previa de questoes</h2>
          <div className="mt-4 grid gap-3">
            {questions.map((q) => <article key={q.id} className="rounded-2xl border border-edge p-4"><p className="line-clamp-3 text-sm text-ink">{q.stem}</p><p className="mt-2 text-xs text-muted">{String(q.source?.board_code ?? "") || "Banca nao informada"} {String(q.source?.year ?? "")}</p></article>)}
          </div>
        </section>
      )}

      {session && (
        <section className="rounded-3xl border border-edge bg-paper p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold">{session.theme ?? "Sessao do banco"}</h2>
              <p className="text-sm text-muted">{session.answered_count}/{session.total_questions} respondidas - peso adaptativo {session.adaptive_weight} - modo {session.resolution_mode === "training" ? "treino" : "simulado"}</p>
            </div>
            <button type="button" onClick={finalize} disabled={busy || session.status === "finalized"} className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">Finalizar</button>
          </div>
          <div className="mt-5 grid gap-4">
            {session.items.map((item) => (
              <article key={item.question_id} className="rounded-2xl border border-edge p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-semibold text-muted">Questao {item.position}</p>
                  {item.correct_answer && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Gabarito {item.correct_answer} {item.is_correct === true ? "- certo" : item.is_correct === false ? "- revisar" : ""}</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{item.stem}</p>
                {item.image_refs.length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-2">{item.image_refs.map((src) => <img key={src} src={src} alt="Imagem da questao" className="rounded-xl border border-edge" />)}</div>}
                <div className="mt-4 grid gap-2">{OPTIONS.map((opt) => item.alternatives[opt] ? <button key={opt} type="button" onClick={() => answer(item.position, opt)} disabled={busy || session.status === "finalized"} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${item.selected_option === opt ? "border-ink bg-[var(--amber-tint)]" : "border-edge hover:border-ink"}`}><span className="font-semibold">{opt}.</span> {item.alternatives[opt]}</button> : null)}</div>
                {item.needs_correction && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">Correcao guiada</label>
                    <textarea value={correctionDrafts[item.position] ?? ""} onChange={(e) => setCorrectionDrafts((current) => ({ ...current, [item.position]: e.target.value }))} placeholder="Explique o raciocinio correto e o motivo do erro." className="mt-2 min-h-24 w-full rounded-xl border border-amber-200 bg-white/80 p-3 text-sm outline-none focus:border-ink" />
                    <button type="button" onClick={() => submitCorrection(item.position)} disabled={busy || !(correctionDrafts[item.position] ?? "").trim()} className="mt-2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50">Salvar correcao</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
