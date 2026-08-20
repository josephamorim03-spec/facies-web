"use client";

import { useCallback, useEffect, useState } from "react";

import {
  enrollCanonicalFlashcard,
  findLearningPackageRequest,
  getLearningPackageRequest,
  getLearningPackageResult,
  recordLearningPackageInteraction,
  requestLearningPackage,
  saveCanonicalFlashcard,
} from "@/lib/api/domains/question-bank/learning-packages";
import { reportQuestionProblem } from "@/lib/api/domains/question-bank/reports";
import type {
  CanonicalFlashcardNote,
  ClinicalResolutionPayload,
  LearningPackage,
  LearningPackageRequest,
} from "@/lib/api/domains/question-bank/types";

type Props = {
  token: string;
  sessionId: string;
  position: number;
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Na fila",
  submitted: "Pedido enviado",
  resolving_cheap: "Preparando correção",
  validating: "Validando",
  repairing_cheap: "Completando formato",
  resolving_strong: "Revisando caso complexo",
  enriching_package: "Criando recursos pedagógicos",
  needs_review: "Em revisão médica",
  partial: "Disponível parcialmente",
  ready: "Pronto",
  failed: "Não foi possível concluir",
  superseded: "Questão atualizada",
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export default function LearningPackagePanel({ token, sessionId, position }: Props) {
  const [request, setRequest] = useState<LearningPackageRequest | null>(null);
  const [learningPackage, setLearningPackage] = useState<LearningPackage | null>(null);
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Record<string, CanonicalFlashcardNote>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  const loadResult = useCallback(async (current: LearningPackageRequest) => {
    if (["failed", "superseded"].includes(current.status)) return;
    try {
      const response = await getLearningPackageResult(token, current.request_id);
      setRequest(response.request);
      setLearningPackage(response.result);
    } catch {
      // The request resource remains the source of truth while delivery is gated.
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void findLearningPackageRequest(token, sessionId, position)
      .then((found) => {
        if (cancelled) return;
        setRequest(found);
        if (found) void loadResult(found);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => { cancelled = true; };
  }, [loadResult, position, sessionId, token]);

  useEffect(() => {
    if (!request || ["ready", "failed", "superseded"].includes(request.status)) return;
    const interval = window.setInterval(() => {
      void getLearningPackageRequest(token, request.request_id)
        .then((updated) => {
          setRequest(updated);
          void loadResult(updated);
        })
        .catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loadResult, request, token]);

  const artifacts = learningPackage?.artifacts ?? {};
  const clinical: ClinicalResolutionPayload = artifacts.clinical_resolution?.payload ?? {};
  const optionAnalysis = clinical.option_analysis ?? {};
  const decisiveClues = strings(clinical.decisive_clues);
  const riskFlags = strings(clinical.risk_flags);
  // Presença do artefato, não de um campo específico: um pacote parcial pode
  // trazer só o `option_analysis`, e ainda assim é a correção que o aluno pediu.
  const hasClinicalResolution =
    Boolean(clinical.pedagogical_justification) ||
    Boolean(clinical.central_concept) ||
    Object.keys(optionAnalysis).length > 0;
  const microcompetencies = Array.isArray(artifacts.microcompetencies?.payload)
    ? artifacts.microcompetencies.payload as Array<Record<string, unknown>>
    : [];
  const profile = objectValue(artifacts.pedagogical_profile?.payload);
  const dna = objectValue(artifacts.reasoning_blueprint?.payload);
  const flashcardPayload = objectValue(artifacts.flashcard_template?.payload);
  const flashcards = Array.isArray(flashcardPayload.cards)
    ? flashcardPayload.cards.map(objectValue)
    : [];
  const missing = new Set(learningPackage?.missing_artifacts ?? []);

  useEffect(() => {
    const requestId = request?.request_id;
    if (!requestId || !learningPackage) return;
    for (const artifactType of Object.keys(learningPackage.artifacts)) {
      void recordLearningPackageInteraction(token, requestId, {
        event_type: "artifact_viewed",
        artifact_type: artifactType,
      }).catch(() => undefined);
    }
    const presentedPayload = objectValue(
      learningPackage.artifacts.flashcard_template?.payload,
    );
    const presentedCards = Array.isArray(presentedPayload.cards)
      ? presentedPayload.cards.map(objectValue)
      : [];
    for (const card of presentedCards) {
      const templateId = String(card.template_id || "");
      if (templateId) {
        void recordLearningPackageInteraction(token, requestId, {
          event_type: "flashcard_template_presented",
          artifact_type: "flashcard_template",
          template_id: templateId,
        }).catch(() => undefined);
      }
    }
  }, [learningPackage, request?.request_id, token]);

  if (!available) return null;

  async function createRequest() {
    setBusy(true);
    setMessage(null);
    try {
      const created = await requestLearningPackage(
        token,
        sessionId,
        position,
        `learning-package:${sessionId}:${position}`,
      );
      setRequest(created);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível solicitar o pacote.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCard(card: Record<string, unknown>) {
    const templateId = String(card.template_id || "");
    if (!request || !templateId) return;
    setBusy(true);
    try {
      const note = await saveCanonicalFlashcard(token, request.request_id, templateId);
      setSaved((current) => ({ ...current, [templateId]: note }));
    } finally {
      setBusy(false);
    }
  }

  async function enrollCard(templateId: string) {
    const note = saved[templateId];
    if (!note) return;
    setBusy(true);
    try {
      const enrolled = await enrollCanonicalFlashcard(token, note.note_id);
      setSaved((current) => ({ ...current, [templateId]: enrolled }));
    } finally {
      setBusy(false);
    }
  }

  async function reportPackage() {
    if (!learningPackage) return;
    setBusy(true);
    try {
      await reportQuestionProblem(token, learningPackage.question_id, {
        report_type: "ai_correction_error",
        report_reason: "Aluno reportou erro na correção gerada por IA.",
        report_context: {
          surface: "learning_package_panel",
          question_version: learningPackage.question_version,
        },
      });
      setReported(true);
      setLearningPackage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar o report.");
    } finally {
      setBusy(false);
    }
  }

  function dismissCard(templateId: string) {
    if (!request) return;
    setDismissed((current) => new Set(current).add(templateId));
    void recordLearningPackageInteraction(token, request.request_id, {
      event_type: "dismissed",
      artifact_type: "flashcard_template",
      template_id: templateId,
    }).catch(() => undefined);
  }

  if (!request) {
    return (
      <section className="mt-5 rounded-surface border border-edge bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Pacote pedagógico</p>
        <h2 className="mt-1 font-serif text-xl font-semibold text-ink">Aprofundar esta questão</h2>
        <p className="mt-2 text-sm text-muted">Solicite correção comentada, microcompetências e flashcards. O conteúdo só aparece após revisão editorial.</p>
        <button type="button" disabled={busy} onClick={() => void createRequest()} className="mt-3 rounded-control border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk disabled:opacity-50">
          {busy ? "Solicitando…" : "Solicitar pacote"}
        </button>
        {message && <p className="mt-2 text-xs text-danger">{message}</p>}
      </section>
    );
  }

  return (
    <section className="mt-5 space-y-4 rounded-surface border border-edge bg-surface p-4" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Pacote pedagógico</p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-ink">{STATUS_LABELS[request.status] ?? request.status}</h2>
        </div>
        {learningPackage?.status === "partial" && <span className="rounded-control border border-edge px-2.5 py-1 text-xs text-muted">Parcial</span>}
      </div>

      {/* O gate era `clinical.explanation`, campo que não existe em
          `learning-package.v1` — o contrato traz `pedagogical_justification`.
          Como `undefined` é sempre falso, este bloco inteiro nunca renderizava,
          e com ele o `option_analysis`: o único lugar do produto onde aparece
          comentário por alternativa, inclusive o da correta. */}
      {hasClinicalResolution && (
        <div className="rounded-surface border border-edge bg-paper p-3">
          <h3 className="text-sm font-semibold text-ink">Correção revisada</h3>
          {Boolean(clinical.central_concept) && (
            <p className="mt-2 text-sm font-semibold text-ink">{String(clinical.central_concept)}</p>
          )}
          {Boolean(clinical.pedagogical_justification) && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
              {String(clinical.pedagogical_justification)}
            </p>
          )}
          {decisiveClues.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
              {decisiveClues.map((clue, index) => (
                <li key={`${clue}-${index}`}>{clue}</li>
              ))}
            </ul>
          )}
          {Object.keys(optionAnalysis).length > 0 && (
            <div className="mt-3 space-y-2 border-t border-edge pt-3">
              {Object.entries(optionAnalysis).map(([option, comment]) => (
                <p key={option} className="text-sm text-muted"><strong className="text-ink">{option}:</strong> {String(comment)}</p>
              ))}
            </div>
          )}
          {riskFlags.length > 0 && (
            <div className="mt-3 rounded-surface border border-warning/40 bg-[var(--amber-tint)] p-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-warning">Atenção clínica</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
                {riskFlags.map((flag, index) => (
                  <li key={`${flag}-${index}`}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {microcompetencies.length > 0 && (
        <div className="rounded-surface border border-edge bg-paper p-3">
          <h3 className="text-sm font-semibold text-ink">Microcompetências</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {microcompetencies.map((item, index) => <li key={`${String(item.name)}-${index}`}>{String(item.name || "")}</li>)}
          </ul>
        </div>
      )}

      {(Object.keys(profile).length > 0 || Object.keys(dna).length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {Object.keys(profile).length > 0 && <div className="rounded-surface border border-edge bg-paper p-3"><h3 className="text-sm font-semibold text-ink">Perfil pedagógico</h3><p className="mt-2 text-sm text-muted">{String(profile.learning_objective || "")}</p><p className="mt-2 text-xs text-muted">Erro comum: {String(profile.common_error || "")}</p></div>}
          {Object.keys(dna).length > 0 && <div className="rounded-surface border border-edge bg-paper p-3"><h3 className="text-sm font-semibold text-ink">DNA da questão</h3><p className="mt-2 text-sm text-muted">{String(dna.reasoning_pattern || "")}</p><p className="mt-2 text-xs text-muted">{strings(dna.discriminators).join(" · ")}</p></div>}
        </div>
      )}

      {flashcards.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink">Sugestões de flashcards</h3>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {flashcards.map((card) => {
              const templateId = String(card.template_id || "");
              if (dismissed.has(templateId)) return null;
              const note = saved[templateId];
              return <article key={templateId} className="rounded-surface border border-edge bg-paper p-3"><p className="text-sm font-semibold text-ink">{String(card.front || "")}</p><p className="mt-2 text-sm text-muted">{String(card.back || "")}</p><div className="mt-3 flex gap-2">{!note ? <button type="button" disabled={busy} onClick={() => void saveCard(card)} className="rounded-surface border border-ink px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50">Salvar</button> : note.srs_enrollment_state === "not_enrolled" ? <button type="button" disabled={busy} onClick={() => void enrollCard(templateId)} className="rounded-surface border border-primary px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50">Adicionar ao Turbo</button> : <span className="text-xs font-semibold text-success">No Turbo</span>}<button type="button" onClick={() => dismissCard(templateId)} className="px-2 py-1.5 text-xs text-muted">Dispensar</button></div></article>;
            })}
          </div>
        </div>
      )}

      {!learningPackage && <p className="text-sm text-muted">O pedido continuará sendo atualizado após a revisão médica.</p>}
      {learningPackage && missing.size > 0 && <p className="text-xs text-muted">Ainda em revisão: {Array.from(missing).join(", ")}.</p>}

      {/* Todo artefato entregue passou por revisão humana. O reporte cria uma
          trilha editorial sem desfazer silenciosamente a decisão do revisor. */}
      {learningPackage && (
        <div className="border-t border-edge pt-3">
          {reported ? (
            <p className="text-xs text-muted" role="status">
              Obrigado. O reporte foi enviado para triagem editorial.
            </p>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void reportPackage()}
              className="text-xs font-semibold text-muted underline underline-offset-2 hover:text-danger disabled:opacity-50"
            >
              Reportar erro nesta correção
            </button>
          )}
        </div>
      )}
    </section>
  );
}
