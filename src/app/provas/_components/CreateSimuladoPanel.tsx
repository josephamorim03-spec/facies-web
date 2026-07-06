"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createQuestionBankSession } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { useToast } from "@/lib/useToast";

const AREAS: { code: string; label: string }[] = [
  { code: "", label: "Todas as áreas" },
  { code: "CM", label: "Clínica Médica" },
  { code: "GO", label: "Ginecologia/Obstetrícia" },
  { code: "PD", label: "Pediatria" },
  { code: "CG", label: "Cirurgia" },
  { code: "MP", label: "Medicina Preventiva" },
  { code: "OU", label: "Outras" },
];

/**
 * Lean "Novo simulado" form for /provas. Reuses createQuestionBankSession with
 * resolution_mode="simulation" (so the session shows in the provas list via
 * isExamLike) — no parallel creation flow. Starting the simulado still lives in
 * the same session runner (imersivo).
 */
export function CreateSimuladoPanel() {
  const router = useRouter();
  const { token, tokenResolved } = useAuthToken();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState("");
  const [limit, setLimit] = useState(30);
  const [timeLimit, setTimeLimit] = useState<number | "">("");
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!tokenResolved || busy) return;
    setBusy(true);
    try {
      const created = await createQuestionBankSession(token, {
        mode: "adaptive",
        resolution_mode: "simulation",
        study_kind: "topic",
        only_unanswered: true,
        limit: Math.max(1, Math.min(120, limit)),
        ...(area ? { area } : {}),
        ...(typeof timeLimit === "number" && timeLimit > 0 ? { time_limit_minutes: timeLimit } : {}),
      });
      router.push(`/banco-de-questoes/sessao/${created.session_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível iniciar o simulado.";
      showToast(message, "error");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primaryInk hover:brightness-105"
      >
        Novo simulado
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <p className="mb-3 text-sm font-semibold text-ink">Novo simulado</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-muted">
          Área
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="mt-1 w-full rounded-lg border border-edge bg-paper px-3 py-2 text-sm text-ink"
          >
            {AREAS.map((a) => (
              <option key={a.code} value={a.code}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Questões
          <input
            type="number"
            min={1}
            max={120}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-edge bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Tempo (min, opcional)
          <input
            type="number"
            min={1}
            max={600}
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-edge bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-primaryInk disabled:opacity-60"
        >
          {busy ? "Iniciando…" : "Iniciar simulado"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex items-center justify-center rounded-lg border border-edge px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
