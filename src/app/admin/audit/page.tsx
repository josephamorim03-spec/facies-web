"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/useToast";
import { Button } from "@/components/ui/Button";
import {
  adminGetAuditLog,
  AuditEntry,
} from "@/lib/api/domains/access-keys";

// ─── Helpers ────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  key_created: "Chave criada",
  key_revoked: "Chave revogada",
  key_hard_deleted: "Chave excluída",
  key_extended: "Chave estendida",
  key_redeemed: "Chave resgatada",
};

const ACTION_ICONS: Record<string, string> = {
  key_created: "🟢",
  key_revoked: "🔴",
  key_hard_deleted: "🗑️",
  key_extended: "📅",
  key_redeemed: "🔵",
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function relativeTime(iso: string): string {
  try {
    const now = Date.now();
    const date = new Date(iso).getTime();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "ontem";
    if (diffDays < 30) return `há ${diffDays} dias`;
    return formatDateTime(iso);
  } catch {
    return formatDateTime(iso);
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminAuditPage() {
  const { showToast } = useToast();
  const router = useRouter();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetAuditLog({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        action: actionFilter || undefined,
      });
      setEntries(res.entries);
      setTotal(res.total);
    } catch (err: unknown) {
      const status = (err as { status: number })?.status;
      if (status === 401 || status === 403) {
        router.replace("/");
        return;
      }
      showToast("Erro ao carregar log de auditoria.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, showToast, router]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-paper px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">
            Log de Auditoria
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Registro de ações administrativas nas chaves de acesso
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          className="px-2.5 py-2 rounded-control border border-edge bg-paper text-ink text-sm focus:outline-none focus:ring-1 focus:ring-ink/20"
        >
          <option value="">Todas as ações</option>
          <option value="key_created">Criação</option>
          <option value="key_revoked">Revogação</option>
          <option value="key_hard_deleted">Exclusão</option>
          <option value="key_extended">Extensão</option>
        </select>

        <p className="text-xs text-muted self-center ml-auto">
          {total} registro{total !== 1 ? "s" : ""} no total
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-16 paper-skeleton"
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-edge ">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm text-muted">
            {actionFilter
              ? "Nenhum registro encontrado com esse filtro."
              : "Nenhum registro de auditoria ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border border-edge px-4 py-3 bg-surface hover:bg-surface transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-lg mt-0.5 shrink-0">
                    {ACTION_ICONS[entry.action] || "📌"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </p>
                    <p className="text-xs text-muted mt-0.5 break-all">
                      {entry.target_id && (
                        <span className="tabular-nums">
                          {entry.target_id.slice(0, 12)}…
                        </span>
                      )}
                      {entry.target_type && entry.target_id && " · "}
                      <span>{entry.target_type}</span>
                    </p>
                    {entry.metadata &&
                      Object.keys(entry.metadata).length > 0 && (
                        <p className="text-xs text-muted mt-1">
                          {Object.entries(entry.metadata).map(([k, v]) => (
                            <span key={k} className="mr-3">
                              <span className="text-muted">{k}:</span>{" "}
                              {String(v)}
                            </span>
                          ))}
                        </p>
                      )}
                  </div>
                </div>
                <span
                  className="text-xs text-muted shrink-0 whitespace-nowrap"
                  title={formatDateTime(entry.created_at)}
                >
                  {relativeTime(entry.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="ghost"
            size="xs"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Anterior
          </Button>
          <span className="text-xs text-muted">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="xs"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Próximo →
          </Button>
        </div>
      )}
    </div>
  );
}
