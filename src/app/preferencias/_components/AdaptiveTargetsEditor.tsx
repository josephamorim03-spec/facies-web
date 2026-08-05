"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Target, X } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  getMyAdaptiveTargets,
  listQuestionBankSourceEntities,
  replaceMyAdaptiveTargets,
  type AdaptiveTarget,
  type AdaptiveTargetKind,
  type QuestionBankSourceEntity,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";

const MAX_TARGETS = 3;

const KIND_LABEL: Record<AdaptiveTargetKind, string> = {
  institution: "Instituição",
  organizer: "Organizadora",
  selection_process: "Processo",
};

type Props = { token: string };

export function AdaptiveTargetsEditor({ token }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [catalog, setCatalog] = useState<QuestionBankSourceEntity[]>([]);
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [items, setItems] = useState<AdaptiveTarget[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const targets = await getMyAdaptiveTargets(token);
      setItems([...targets.items].sort((a, b) => a.priority - b.priority));
      setRevision(targets.selection_revision);
      setEnabled(true);
    } catch (cause) {
      if ((cause as { status?: number } | null)?.status === 404) {
        setEnabled(false);
        return;
      }
      setEnabled(true);
      setError(getErrorMessage(cause, "Não foi possível carregar suas metas prioritárias."));
      return;
    }

    // O catálogo é auxiliar: uma indisponibilidade do KBank não pode ocultar metas
    // já salvas nem impedir que o aluno as remova ou reordene.
    try {
      const sourceEntities = await listQuestionBankSourceEntities(token);
      setCatalog(sourceEntities.items);
      setCatalogUnavailable(false);
    } catch {
      setCatalog([]);
      setCatalogUnavailable(true);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const available = useMemo(() => {
    const selected = new Set(items.map((item) => item.entity_id));
    return catalog.filter((entity) => !selected.has(entity.entity_id));
  }, [catalog, items]);

  function mutate(next: AdaptiveTarget[]) {
    setItems(next.map((item, index) => ({ ...item, priority: index + 1 })));
    setSaved(false);
  }

  function add(entityId: string) {
    const entity = catalog.find((candidate) => candidate.entity_id === entityId);
    if (!entity || items.length >= MAX_TARGETS) return;
    mutate([
      ...items,
      {
        target_preference_id: `draft-${entity.entity_id}`,
        priority: items.length + 1,
        entity_id: entity.entity_id,
        entity_kind: entity.entity_kind,
        canonical_key: entity.canonical_key,
        label: entity.label,
        catalog_contract_version: "question-source-entities-v1",
        catalog_release: null,
        status: "active",
      },
    ]);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    mutate(next);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await replaceMyAdaptiveTargets(
        token,
        items.map((item) => item.entity_id),
        revision,
      );
      setItems([...result.items].sort((a, b) => a.priority - b.priority));
      setRevision(result.selection_revision);
      setSaved(true);
    } catch (cause) {
      const message = getErrorMessage(cause, "Não foi possível salvar suas metas prioritárias.");
      if ((cause as { status?: number } | null)?.status === 409) {
        await load();
        setError("Suas metas mudaram ou uma opção deixou de estar disponível. Recarregamos a lista.");
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (enabled !== true) return null;

  return (
    <section className="py-7">
      <header className="grid gap-2 border-b border-edge pb-4 sm:grid-cols-[1.5rem_minmax(0,1fr)]">
        <Target className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold text-ink">Metas prioritárias de conteúdo</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Instituições, organizadoras e processos cujo perfil histórico poderá orientar seu
            treino.
          </p>
        </div>
      </header>
      <div className="mt-4">
      {error ? (
        <Alert variant="danger" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <ol className="divide-y divide-edge" aria-label="Metas de conteúdo prioritárias">
        {items.map((item, index) => (
          <li key={item.entity_id} className="flex min-h-14 items-center gap-3 py-3">
            <span className="w-6 shrink-0 text-sm font-semibold text-muted">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {KIND_LABEL[item.entity_kind]}
                {item.status === "unavailable" ? " · opção em revisão" : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-muted hover:text-ink disabled:opacity-25"
              aria-label={`Subir meta ${item.label}`}
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === items.length - 1}
              className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-muted hover:text-ink disabled:opacity-25"
              aria-label={`Descer meta ${item.label}`}
            >
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => mutate(items.filter((_, itemIndex) => itemIndex !== index))}
              className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-muted hover:text-danger"
              aria-label={`Remover meta ${item.label}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>

      {items.length === 0 ? (
        <p className="text-sm text-muted">
          Nenhuma meta de conteúdo definida. Você pode salvar até três instituições ou
          organizadoras ou processos seletivos.
        </p>
      ) : null}

      {items.length < MAX_TARGETS && available.length > 0 ? (
        <label className="mt-4 block max-w-md">
          <span className="sr-only">Adicionar meta prioritária</span>
          <select
            value=""
            onChange={(event) => add(event.target.value)}
            className="paper-control min-h-11 w-full border border-edge bg-surface px-3 text-sm text-ink"
          >
            <option value="">Adicionar instituição, organizadora ou processo</option>
            {available.map((entity) => (
              <option key={entity.entity_id} value={entity.entity_id}>
                {entity.label} · {KIND_LABEL[entity.entity_kind]}
              </option>
            ))}
          </select>
        </label>
      ) : catalogUnavailable ? (
        <p className="mt-3 text-xs leading-5 text-muted">
          O catálogo está temporariamente indisponível. Suas metas salvas continuam visíveis e
          podem ser removidas ou reordenadas; novas opções voltarão quando o catálogo responder.
        </p>
      ) : catalog.length === 0 ? (
        <p className="mt-3 text-xs leading-5 text-muted">
          O catálogo canônico ainda está em preparação. Nenhuma string bruta será salva
          como meta enquanto a identidade não estiver revisada.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Salvando…" : "Salvar metas prioritárias"}
        </Button>
        {saved ? (
          <span className="text-xs text-positive" role="status">
            Metas salvas.
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-xs leading-5 text-muted">
        Esta etapa apenas registra suas preferências. Ela não filtra questões da mesma
        origem e ainda não altera o plano enquanto a política adaptativa estiver em validação.
      </p>
      </div>
    </section>
  );
}
