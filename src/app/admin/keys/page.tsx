"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/useToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import {
  AccessKeyOut,
  adminCreateBatch,
  adminExtendKey,
  adminHardDeleteKey,
  adminListKeys,
  adminRevokeKey,
} from "@/lib/api/domains/access-keys";

const PAGE_SIZE = 50;

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AccessKeyOut["status"], string> = {
  available: "Disponível",
  redeemed: "Resgatada",
  expired: "Expirada",
  revoked: "Revogada",
};

const STATUS_BADGE: Record<AccessKeyOut["status"], string> = {
  available: "bg-surfaceMuted text-success ring-1 ring-success",
  redeemed: "bg-surfaceMuted text-info ring-1 ring-info",
  expired: "bg-surface text-ink ring-1 ring-edge",
  revoked: "bg-surfaceMuted text-danger ring-1 ring-danger",
};

const STATUS_ICON: Record<AccessKeyOut["status"], string> = {
  available: "🟢",
  redeemed: "🔵",
  expired: "⚪",
  revoked: "🔴",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function relativeDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const now = Date.now();
    const date = new Date(iso).getTime();
    const diffMs = date - now;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const abs = Math.abs(diffDays);
      if (abs === 0) return "expirada hoje";
      if (abs === 1) return "expirada ontem";
      return `expirada há ${abs} dias`;
    }
    if (diffDays === 0) return "expira hoje";
    if (diffDays === 1) return "expira amanhã";
    if (diffDays <= 30) return `expira em ${diffDays} dias`;
    if (diffDays <= 365) {
      const months = Math.round(diffDays / 30);
      return `expira em ~${months} mês${months > 1 ? "es" : ""}`;
    }
    return `expira em ${formatDate(iso)}`;
  } catch {
    return formatDate(iso);
  }
}

function extractEmail(userId: string | null): string {
  if (!userId) return "—";
  // Tenta extrair email do user_id (que pode ser um email ou UUID)
  if (userId.includes("@")) return userId;
  return userId.length > 12 ? `${userId.slice(0, 8)}…` : userId;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AccessKeyOut["status"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-control font-medium ${STATUS_BADGE[status]}`}
    >
      <span>{STATUS_ICON[status]}</span>
      <span>{STATUS_LABELS[status]}</span>
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-edge last:border-0 animate-pulse">
      <td className="px-3 py-3"><div className="h-3 w-32 bg-surfaceMuted rounded" /></td>
      <td className="px-3 py-3"><div className="h-3 w-20 bg-surfaceMuted rounded" /></td>
      <td className="px-3 py-3"><div className="h-3 w-28 bg-surfaceMuted rounded" /></td>
      <td className="px-3 py-3"><div className="h-3 w-16 bg-surfaceMuted rounded" /></td>
      <td className="px-3 py-3"><div className="h-3 w-24 bg-surfaceMuted rounded" /></td>
      <td className="px-3 py-3"><div className="h-3 w-20 bg-surfaceMuted rounded" /></td>
    </tr>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

type ConfirmAction =
  | { type: "revoke"; keyId: string; label: string }
  | { type: "hard-delete"; keyId: string; label: string }
  | null;

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminKeysPage() {
  const { showToast } = useToast();
  const router = useRouter();

  const [keys, setKeys] = useState<AccessKeyOut[]>([]);
  const [createdKeys, setCreatedKeys] = useState<AccessKeyOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLabel, setFilterLabel] = useState("");
  const [hideInactive, setHideInactive] = useState(false);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLabel, setCreateLabel] = useState("");
  const [createQty, setCreateQty] = useState(5);
  const [createDays, setCreateDays] = useState(90);
  const [createCustomDays, setCreateCustomDays] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  const [reloadCount, setReloadCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);

  // Actions
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [extendKeyId, setExtendKeyId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [extendBusy, setExtendBusy] = useState(false);

  const DURATION_OPTIONS = [30, 60, 90, 180, 365, 0];

  // ─── Data fetching ──────────────────────────────────────────────────────

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListKeys(filterLabel || undefined);
      setKeys(res.keys);
    } catch (err: unknown) {
      const status = (err as { status: number })?.status;
      if (status === 401 || status === 403) {
        router.replace("/");
        return;
      }
      showToast("Erro ao carregar chaves.", "error");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [filterLabel, showToast, router]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys, reloadCount]);

  // ─── Derived data ───────────────────────────────────────────────────────

  const distinctLabels = useMemo(
    () => [...new Set(keys.map((k) => k.mentor_label))].sort(),
    [keys],
  );

  const filteredKeys = useMemo(() => {
    let result = keys;

    // Filtro por mentoria
    if (filterLabel) {
      result = result.filter((k) => k.mentor_label === filterLabel);
    }

    // Busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (k) =>
          k.key_code_masked.toLowerCase().includes(q) ||
          k.mentor_label.toLowerCase().includes(q) ||
          (k.redeemed_by && k.redeemed_by.toLowerCase().includes(q)),
      );
    }

    // Ocultar inativas
    if (hideInactive) {
      result = result.filter(
        (k) => k.status === "available" || k.status === "redeemed",
      );
    }

    return result;
  }, [keys, filterLabel, searchQuery, hideInactive]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedKeys = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredKeys.slice(start, start + PAGE_SIZE);
  }, [filteredKeys, safePage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterLabel, hideInactive]);

  const stats = useMemo(
    () => ({
      total: keys.length,
      available: keys.filter((k) => k.status === "available").length,
      redeemed: keys.filter((k) => k.status === "redeemed").length,
      inactive: keys.filter(
        (k) => k.status === "expired" || k.status === "revoked",
      ).length,
    }),
    [keys],
  );

  // ─── Handlers ───────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createLabel.trim()) return;
    const days =
      createDays === 0 ? parseInt(createCustomDays, 10) : createDays;
    if (!days || days < 1 || days > 730) {
      showToast("Duração inválida (1–730 dias).", "error");
      return;
    }
    setCreateBusy(true);
    try {
      const res = await adminCreateBatch({
        mentor_label: createLabel.trim(),
        quantity: createQty,
        duration_days: days,
      });
      setCreatedKeys(res.keys);
      showToast(`${res.keys.length} chave(s) criada(s) com sucesso.`, "success");
      setShowCreateForm(false);
      setCreateLabel("");
      setCreateQty(5);
      setReloadCount((n) => n + 1);
    } catch {
      showToast("Erro ao criar chaves.", "error");
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleRevoke() {
    if (!confirmAction || confirmAction.type !== "revoke") return;
    try {
      await adminRevokeKey(confirmAction.keyId);
      showToast("Chave revogada.", "success");
      setKeys((prev) =>
        prev.map((k) =>
          k.key_id === confirmAction.keyId
            ? { ...k, status: "revoked" as const, is_active: false }
            : k,
        ),
      );
    } catch {
      showToast("Erro ao revogar.", "error");
    } finally {
      setConfirmAction(null);
    }
  }

  async function handleHardDelete() {
    if (!confirmAction || confirmAction.type !== "hard-delete") return;
    try {
      await adminHardDeleteKey(confirmAction.keyId);
      showToast("Chave excluída permanentemente.", "success");
      setKeys((prev) => prev.filter((k) => k.key_id !== confirmAction.keyId));
    } catch {
      showToast("Erro ao excluir chave.", "error");
    } finally {
      setConfirmAction(null);
    }
  }

  async function handleExtend(keyId: string) {
    if (!extendDays || extendDays < 1) return;
    setExtendBusy(true);
    try {
      const res = await adminExtendKey(keyId, extendDays);
      showToast(`Chave estendida por ${extendDays} dia(s).`, "success");
      setKeys((prev) =>
        prev.map((k) => (k.key_id === keyId ? res.key : k)),
      );
      setExtendKeyId(null);
    } catch {
      showToast("Erro ao estender.", "error");
    } finally {
      setExtendBusy(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copiado!", "success");
    } catch {
      showToast("Não foi possível copiar.", "error");
    }
  }

  function exportCSV() {
    const header = "Código,Mentoria,Usuário,Duração (dias),Status,Criada em,Resgatada em,Expira em";
    const rows = filteredKeys.map((k) =>
      [
        String(k.key_code_masked),
        String(k.mentor_label),
        String(k.redeemed_by || ""),
        String(k.duration_days),
        String(STATUS_LABELS[k.status]),
        k.created_at ? new Date(k.created_at).toISOString().slice(0, 10) : "",
        k.redeemed_at ? new Date(k.redeemed_at).toISOString().slice(0, 10) : "",
        k.expires_at ? new Date(k.expires_at).toISOString().slice(0, 10) : "",
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["\uFEFF" + header + "\n" + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chaves-acesso-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportado com sucesso.", "success");
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-paper px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Chaves de Acesso</h1>
          <p className="text-xs text-muted mt-0.5">
            Gerencie as chaves de ativação do sistema
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateForm((v) => !v)}
        >
          {showCreateForm ? "Fechar" : "+ Novo Lote"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-ink" },
          { label: "Disponíveis", value: stats.available, color: "text-success" },
          { label: "Resgatadas", value: stats.redeemed, color: "text-info" },
          { label: "Inativas", value: stats.inactive, color: "text-muted" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="border border-edge rounded-surface px-4 py-3 text-center bg-surface/50"
          >
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="border border-edge rounded-surface p-4 mb-6 space-y-3 bg-surface/50"
        >
          <h2 className="text-sm font-semibold text-ink mb-1">
            Gerar novo lote
          </h2>
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Mentoria</label>
              <input
                type="text"
                value={createLabel}
                onChange={(e) => setCreateLabel(e.target.value)}
                placeholder="Nome da mentoria"
                required
                list="mentor-labels"
                className="w-full px-2.5 py-2 rounded-control border border-edge bg-paper text-ink text-sm focus:outline-none focus:ring-1 focus:ring-ink/20"
              />
              <datalist id="mentor-labels">
                {distinctLabels.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Quantidade
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={createQty}
                onChange={(e) => setCreateQty(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-control border border-edge bg-paper text-ink text-sm focus:outline-none focus:ring-1 focus:ring-ink/20"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Duração</label>
              <select
                value={createDays}
                onChange={(e) => setCreateDays(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-control border border-edge bg-paper text-ink text-sm focus:outline-none focus:ring-1 focus:ring-ink/20"
              >
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
                <option value={180}>180 dias</option>
                <option value={365}>1 ano</option>
                <option value={0}>Personalizado</option>
              </select>
              {createDays === 0 && (
                <input
                  type="number"
                  min={1}
                  max={730}
                  value={createCustomDays}
                  onChange={(e) => setCreateCustomDays(e.target.value)}
                  placeholder="Nº de dias"
                  className="w-full mt-1.5 px-2.5 py-2 rounded-control border border-edge bg-paper text-ink text-sm focus:outline-none focus:ring-1 focus:ring-ink/20"
                />
              )}
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={createBusy}
                disabled={createBusy}
                className="w-full"
              >
                Gerar Chaves
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Created keys banner */}
      {createdKeys.length > 0 && (
        <div className="border border-success bg-surfaceMuted rounded-surface p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-success">
              🎉 Chaves criadas — copie agora (só aparecem uma vez)
            </h2>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="xs"
                onClick={() =>
                  copyToClipboard(
                    createdKeys
                      .map((key) => key.key_code)
                      .filter(Boolean)
                      .join("\n"),
                  )
                }
              >
                📋 Copiar lote
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setCreatedKeys([])}
              >
                ✕ Fechar
              </Button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {createdKeys.map((key) => (
              <button
                key={key.key_id}
                type="button"
                onClick={() => key.key_code && copyToClipboard(key.key_code)}
                className="text-left font-mono text-xs rounded border border-success bg-paper px-2.5 py-2 text-ink hover:border-success hover:bg-surfaceMuted transition-colors cursor-pointer"
                title="Copiar chave"
              >
                {key.key_code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-sm">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, mentoria ou usuário..."
            className="w-full pl-8 pr-3 py-2 rounded-control border border-edge bg-paper text-ink text-sm focus:outline-none focus:ring-1 focus:ring-ink/20"
          />
        </div>

        {/* Mentor label filter */}
        {distinctLabels.length > 1 && (
          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            className="px-2.5 py-2 rounded-control border border-edge bg-paper text-ink text-sm focus:outline-none focus:ring-1 focus:ring-ink/20"
          >
            <option value="">Todas mentorias</option>
            {distinctLabels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        )}

        {/* Hide inactive toggle */}
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none whitespace-nowrap px-2.5 py-2 rounded-control border border-edge bg-paper hover:bg-edge/10 transition-colors">
          <input
            type="checkbox"
            checked={hideInactive}
            onChange={(e) => setHideInactive(e.target.checked)}
            className="rounded border-edge text-ink focus:ring-ink/20"
          />
          Ocultar inativas
        </label>
      </div>

      {/* Table */}
      {initialLoading ? (
        <div className="overflow-x-auto rounded-surface border border-edge">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge bg-edge/30 text-left">
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Código</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Mentoria</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Usuário</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Duração</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Status</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Expiração</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredKeys.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-edge rounded-surface">
          <p className="text-3xl mb-2">🔑</p>
          <p className="text-sm text-muted">
            {searchQuery || filterLabel || hideInactive
              ? "Nenhuma chave encontrada com esses filtros."
              : "Nenhuma chave cadastrada ainda."}
          </p>
          {!searchQuery && !filterLabel && !hideInactive && (
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => setShowCreateForm(true)}
            >
              + Criar primeira chave
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-surface border border-edge">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge bg-edge/30 text-left">
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Código</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Mentoria</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Usuário</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Duração</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Status</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Expiração</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedKeys.map((key) => (
                <tr
                  key={key.key_id}
                  className="border-b border-edge last:border-0 hover:bg-edge/10 transition-colors"
                >
                  {/* Code */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-ink">
                        {key.key_code_masked}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            key.key_code ?? key.key_code_masked,
                          )
                        }
                        className="text-muted hover:text-ink transition-colors"
                        title="Copiar"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>

                  {/* Mentor label */}
                  <td className="px-3 py-2.5 text-xs text-ink">
                    {key.mentor_label}
                  </td>

                  {/* User */}
                  <td className="px-3 py-2.5 text-xs text-muted max-w-[160px] truncate" title={key.redeemed_by_email ?? key.redeemed_by ?? ""}>
                    {key.redeemed_by_email || extractEmail(key.redeemed_by)}
                  </td>

                  {/* Duration */}
                  <td className="px-3 py-2.5 text-xs text-muted">
                    {key.duration_days}d
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5">
                    <StatusBadge status={key.status} />
                  </td>

                  {/* Expiration */}
                  <td className="px-3 py-2.5 text-xs text-muted">
                    <span title={key.expires_at ? formatDate(key.expires_at) : ""}>
                      {key.status === "available"
                        ? `${key.duration_days}d após ativação`
                        : relativeDate(key.expires_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5">
                    {extendKeyId === key.key_id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={730}
                          value={extendDays}
                          onChange={(e) =>
                            setExtendDays(Number(e.target.value))
                          }
                          className="w-16 px-1.5 py-1 text-xs rounded border border-edge bg-paper text-ink focus:outline-none"
                        />
                        <Button
                          size="xs"
                          variant="primary"
                          loading={extendBusy}
                          disabled={extendBusy}
                          onClick={() => handleExtend(key.key_id)}
                        >
                          +dias
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setExtendKeyId(null)}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {key.status === "redeemed" && (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => {
                              setExtendKeyId(key.key_id);
                              setExtendDays(30);
                            }}
                          >
                            Estender
                          </Button>
                        )}
                        {(key.status === "available" ||
                          key.status === "redeemed") && (
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() =>
                              setConfirmAction({
                                type: "revoke",
                                keyId: key.key_id,
                                label: key.key_code_masked,
                              })
                            }
                          >
                            Revogar
                          </Button>
                        )}
                        {(key.status === "available" || key.status === "revoked") && (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-danger hover:text-danger hover:bg-surfaceMuted"
                            onClick={() =>
                              setConfirmAction({
                                type: "hard-delete",
                                keyId: key.key_id,
                                label: key.key_code_masked,
                              })
                            }
                          >
                            Excluir
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination + CSV export */}
      {filteredKeys.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted">
            Mostrando {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredKeys.length)} de{" "}
            {filteredKeys.length} chave{filteredKeys.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              onClick={exportCSV}
              title="Exportar CSV"
            >
              📥 CSV
            </Button>
            {totalPages > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Anterior
                </Button>
                <span className="text-xs text-muted px-1">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próximo →
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmAction?.type === "revoke"}
        title="Revogar chave"
        message={`Revogar a chave "${confirmAction?.label}"? O usuário perderá o acesso imediatamente.`}
        confirmLabel="Revogar"
        cancelLabel="Cancelar"
        onConfirm={handleRevoke}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction?.type === "hard-delete"}
        title="Excluir chave permanentemente"
        message={`Excluir permanentemente a chave "${confirmAction?.label}"? Esta ação não pode ser desfeita. A chave será removida do banco de dados.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleHardDelete}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
