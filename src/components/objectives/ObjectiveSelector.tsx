"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Search, Close as X } from "pixelarticons/react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { getAPIErrorDetail } from "@/lib/api";
import {
  getMyObjectivesV2,
  replaceMyObjectivesV2,
  requestObjectiveCatalogItem,
  saveOnboardingObjectivesV2,
  searchObjectiveCatalogV2,
  type ObjectiveCatalogItemV2,
  type OnboardingState,
  type StudentObjectiveV2Input,
} from "@/lib/api/domains/study-plan";
import { getErrorMessage } from "@/lib/error-utils";

const MAX_OBJECTIVES = 3;

type SelectedObjective = StudentObjectiveV2Input & {
  catalog: ObjectiveCatalogItemV2 | null;
  status: "active" | "unavailable" | "retracted";
};

type Props = {
  token: string;
  mode: "preferences" | "onboarding";
  capabilityEnabled: boolean;
  capabilityReady: boolean;
  unavailableReason?: string | null;
  onOnboardingSaved?: (state: OnboardingState) => void;
};

function unavailableCopy(reason?: string | null): string {
  if (reason === "objective_catalog_stale") {
    return "O catálogo precisa de nova verificação editorial. Seus objetivos estão somente para leitura até a revisão.";
  }
  if (reason === "objective_catalog_not_ready") {
    return "Ainda não há uma edição futura completa, verificada e publicável no catálogo.";
  }
  return "A seleção canônica de objetivos ainda não está disponível.";
}

export function ObjectiveSelector({
  token,
  mode,
  capabilityEnabled,
  capabilityReady,
  unavailableReason,
  onOnboardingSaved,
}: Props) {
  const [selected, setSelected] = useState<SelectedObjective[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ObjectiveCatalogItemV2[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<"ready" | "empty" | "stale">("empty");
  const [loading, setLoading] = useState(capabilityEnabled);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [online, setOnline] = useState(true);
  const [requestLabel, setRequestLabel] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const load = useCallback(async () => {
    if (!capabilityEnabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const current = await getMyObjectivesV2(token);
      setSelected(
        [...current.items]
          .sort((a, b) => a.priority - b.priority)
          .map((item) => ({
            program_id: item.program_id,
            edition_id: item.edition_id,
            accept_estimated_participation: item.accept_estimated_participation,
            accept_estimated_date: item.accept_estimated_date,
            catalog: item.resolved,
            status: item.status,
          })),
      );
      setRevision(current.selection_revision);
      if (capabilityReady) {
        const catalog = await searchObjectiveCatalogV2(token);
        setResults(catalog.items);
        setCatalogStatus(catalog.catalog_status);
      }
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível carregar seus objetivos."));
    } finally {
      setLoading(false);
    }
  }, [capabilityEnabled, capabilityReady, token]);

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
    () => new Set(selected.map((item) => `${item.program_id}:${item.edition_id}`)),
    [selected],
  );

  async function search() {
    if (!capabilityReady || !online) return;
    setSearching(true);
    setError(null);
    try {
      const catalog = await searchObjectiveCatalogV2(token, query);
      setResults(catalog.items);
      setCatalogStatus(catalog.catalog_status);
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível pesquisar o catálogo."));
    } finally {
      setSearching(false);
    }
  }

  function add(item: ObjectiveCatalogItemV2) {
    const key = `${item.destination.program_id}:${item.planning_focus.edition_id}`;
    if (!item.selectable || selected.length >= MAX_OBJECTIVES || selectedKeys.has(key)) return;
    setSelected((current) => [
      ...current,
      {
        program_id: item.destination.program_id,
        edition_id: item.planning_focus.edition_id,
        accept_estimated_participation: false,
        accept_estimated_date: false,
        catalog: item,
        status: "active",
      },
    ]);
    setSaved(false);
  }

  function patch(index: number, value: Partial<SelectedObjective>) {
    setSelected((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    );
    setSaved(false);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    setSelected(next);
    setSaved(false);
  }

  const acceptsRequiredEstimates = selected.every((item) => {
    const participationAccepted =
      item.catalog?.participation.status !== "estimated" || item.accept_estimated_participation;
    const dateAccepted =
      item.catalog?.planning_date.status !== "estimated" || item.accept_estimated_date;
    return participationAccepted && dateAccepted;
  });

  async function save() {
    if (!selected.length || !acceptsRequiredEstimates || !online || saving) return;
    setSaving(true);
    setSaved(false);
    setConflict(false);
    setError(null);
    const payload = selected.map(({ program_id, edition_id, accept_estimated_date, accept_estimated_participation }) => ({
      program_id,
      edition_id,
      accept_estimated_date,
      accept_estimated_participation,
    }));
    try {
      if (mode === "onboarding") {
        const state = await saveOnboardingObjectivesV2(token, payload, revision);
        setRevision(state.objectives_revision);
        onOnboardingSaved?.(state);
      } else {
        const current = await replaceMyObjectivesV2(token, payload, revision);
        setRevision(current.selection_revision);
        setSelected(
          current.items.map((item) => ({
            program_id: item.program_id,
            edition_id: item.edition_id,
            accept_estimated_participation: item.accept_estimated_participation,
            accept_estimated_date: item.accept_estimated_date,
            catalog: item.resolved,
            status: item.status,
          })),
        );
      }
      setSaved(true);
    } catch (cause) {
      const detail = getAPIErrorDetail(cause);
      if (detail?.code === "objective_selection_revision_conflict") {
        setConflict(true);
        await load();
      } else {
        setError(getErrorMessage(cause, "Não foi possível salvar seus objetivos."));
      }
    } finally {
      setSaving(false);
    }
  }

  async function submitRequest() {
    if (!requestLabel.trim() || !online) return;
    setError(null);
    try {
      await requestObjectiveCatalogItem(token, requestLabel.trim());
      setRequestLabel("");
      setRequestSent(true);
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível enviar a solicitação."));
    }
  }

  if (loading) {
    return <p className="mt-4 text-sm text-muted" role="status">Carregando objetivos…</p>;
  }

  if (!capabilityEnabled) {
    return <Alert variant="info" className="mt-4">{unavailableCopy(unavailableReason)}</Alert>;
  }

  return (
    <div className="mt-4 space-y-5">
      {!online ? (
        <Alert variant="warning">Você está offline. Os objetivos ficam somente para leitura.</Alert>
      ) : null}
      {!capabilityReady ? (
        <Alert variant="info">{unavailableCopy(unavailableReason)}</Alert>
      ) : null}
      {catalogStatus === "stale" ? (
        <Alert variant="warning">Catálogo desatualizado; a edição fica bloqueada até nova verificação.</Alert>
      ) : null}
      {conflict ? (
        <Alert variant="warning" onDismiss={() => setConflict(false)}>
          Outra aba alterou os objetivos. Recarregamos a versão mais recente; confira antes de salvar.
        </Alert>
      ) : null}
      {error ? <Alert variant="danger" onDismiss={() => setError(null)}>{error}</Alert> : null}

      {selected.length ? (
        <ol className="divide-y divide-edge" aria-label="Objetivos de residência em ordem de prioridade">
          {selected.map((item, index) => {
            const catalog = item.catalog;
            return (
              <li key={`${item.program_id}:${item.edition_id}`} className="space-y-3 py-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 shrink-0 pt-0.5 text-sm font-semibold text-muted">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      {catalog
                        ? `${catalog.destination.institution_name} · ${catalog.destination.program_name}`
                        : `${item.program_id} · ${item.edition_id}`}
                    </p>
                    {catalog ? (
                      <>
                        <p className="mt-1 text-sm text-muted">{catalog.planning_focus.label}</p>
                        <p className="mt-1 text-sm text-muted">{catalog.planning_date.explanation}</p>
                        <a
                          href={catalog.source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {catalog.source.title}<ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-danger">Objetivo retirado ou indisponível no catálogo atual.</p>
                    )}
                  </div>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0 || !online} className="p-2 text-muted disabled:opacity-25" aria-label="Subir objetivo">
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === selected.length - 1 || !online} className="p-2 text-muted disabled:opacity-25" aria-label="Descer objetivo">
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => setSelected(selected.filter((_, itemIndex) => itemIndex !== index))} disabled={!online} className="p-2 text-muted hover:text-danger disabled:opacity-25" aria-label="Remover objetivo">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {catalog?.participation.status === "estimated" ? (
                  <label className="ml-9 flex items-start gap-2 text-sm text-ink">
                    <input type="checkbox" checked={item.accept_estimated_participation} onChange={(event) => patch(index, { accept_estimated_participation: event.target.checked })} />
                    Entendo que a participação deste programa ainda é uma estimativa editorial.
                  </label>
                ) : null}
                {catalog?.planning_date.status === "estimated" ? (
                  <label className="ml-9 flex items-start gap-2 text-sm text-ink">
                    <input type="checkbox" checked={item.accept_estimated_date} onChange={(event) => patch(index, { accept_estimated_date: event.target.checked })} />
                    Entendo que a data ainda é estimada e pode mudar.
                  </label>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted">Nenhum objetivo de residência selecionado.</p>
      )}

      {capabilityReady && selected.length < MAX_OBJECTIVES ? (
        <div className="space-y-3 border-t border-edge pt-4">
          <div className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void search(); }}
              placeholder="Busque instituição, programa ou especialidade"
              className="paper-control min-h-11 min-w-0 flex-1 border border-edge bg-surface px-3 text-sm text-ink"
            />
            <Button variant="outline" onClick={() => void search()} loading={searching} leftIcon={<Search className="h-4 w-4" />}>
              Buscar
            </Button>
          </div>
          {results.length ? (
            <ul className="divide-y divide-edge border-y border-edge">
              {results.map((item) => {
                const key = `${item.destination.program_id}:${item.planning_focus.edition_id}`;
                const alreadySelected = selectedKeys.has(key);
                return (
                  <li key={key} className="flex items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{item.destination.institution_name} · {item.destination.program_name}</p>
                      <p className="mt-1 text-xs text-muted">{item.planning_focus.label} — {item.planning_date.explanation}</p>
                    </div>
                    <Button size="sm" variant="outline" disabled={alreadySelected || !item.selectable} onClick={() => add(item)}>
                      {alreadySelected ? "Selecionado" : "Adicionar"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              {query.trim() ? "Nenhum destino encontrado para esta busca." : "O catálogo não possui destinos publicados no momento."}
            </p>
          )}
        </div>
      ) : null}

      <div className="border-t border-edge pt-4">
        <p className="text-sm font-semibold text-ink">Não encontrei minha prova</p>
        <p className="mt-1 text-xs text-muted">A solicitação vai para curadoria; ela não cria objetivo nem altera seu plano.</p>
        <div className="mt-2 flex gap-2">
          <input value={requestLabel} onChange={(event) => setRequestLabel(event.target.value)} placeholder="Nome da instituição ou processo" className="paper-control min-h-10 min-w-0 flex-1 border border-edge bg-surface px-3 text-sm text-ink" />
          <Button size="sm" variant="outline" disabled={!capabilityEnabled || !online || requestLabel.trim().length < 3} onClick={() => void submitRequest()}>Enviar</Button>
        </div>
        {requestSent ? <p className="mt-2 text-xs text-positive" role="status">Solicitação enviada para análise editorial.</p> : null}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => void save()} loading={saving} disabled={!capabilityReady || !online || selected.length === 0 || !acceptsRequiredEstimates}>
          {mode === "onboarding" ? "Salvar e continuar" : "Salvar objetivos"}
        </Button>
        {saved ? <span className="text-xs text-positive" role="status">Objetivos salvos.</span> : null}
      </div>
    </div>
  );
}
