"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuthToken } from "@/lib/useAuthToken";
import { createDirectedStudy } from "@/lib/api";
import AreaDot from "@/components/AreaDot";
import { repairMojibake } from "@/lib/textEncoding";
import { useToast } from "@/lib/useToast";
import { LOG_LAST_AREA_KEY, logThemesKey } from "@/lib/storage-keys";

type Area = "GO" | "PD" | "MP" | "CG" | "CM" | "OU";
const AREAS: Area[] = ["GO", "PD", "MP", "CG", "CM", "OU"];

const WEIGHT_LABELS: Record<number, string> = { 1: "Baixo", 2: "Normal", 3: "Alto" };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadThemes(area: Area): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(logThemesKey(area)) ?? "[]");
    if (!Array.isArray(raw)) return [];
    const normalized = raw
      .map((item) => repairMojibake(String(item ?? "")).trim())
      .filter(Boolean);
    localStorage.setItem(logThemesKey(area), JSON.stringify(normalized));
    return normalized;
  } catch {
    return [];
  }
}

function saveTheme(area: Area, theme: string): void {
  const cleanTheme = repairMojibake(theme).trim();
  if (!cleanTheme) return;
  const existing = loadThemes(area);
  if (!existing.includes(cleanTheme)) {
    localStorage.setItem(logThemesKey(area), JSON.stringify([...existing, cleanTheme]));
  }
}

export default function LogPage() {
  const { token } = useAuthToken();
  const { showToast } = useToast();
  const [day, setDay] = useState(todayISO());
  const [area, setArea] = useState<Area | null>(null);
  const [theme, setTheme] = useState("");
  const [themes, setThemes] = useState<string[]>([]);
  const [total, setTotal] = useState<string>("30");
  const [correct, setCorrect] = useState<string>("");
  const [weight, setWeight] = useState(2);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOG_LAST_AREA_KEY);
      if (saved && (AREAS as string[]).includes(saved)) setArea(saved as Area);
    } catch {}
  }, []);

  useEffect(() => {
    if (area) {
      setThemes(loadThemes(area));
      try { localStorage.setItem(LOG_LAST_AREA_KEY, area); } catch {}
    }
  }, [area]);

  async function handleSubmit() {
    setError("");
    if (!area) {
      showToast("Selecione uma área.", "error");
      return;
    }
    if (!theme.trim()) {
      showToast("Informe o tema.", "error");
      return;
    }

    const totalQuestions = parseInt(total, 10);
    const correctQuestions = parseInt(correct, 10);
    if (isNaN(totalQuestions) || totalQuestions < 1) {
      showToast("Total de questões inválido.", "error");
      return;
    }
    if (isNaN(correctQuestions) || correctQuestions < 0 || correctQuestions > totalQuestions) {
      showToast("Acerto inválido.", "error");
      return;
    }

    setLoading(true);
    try {
      const out = await createDirectedStudy(token, {
        topic: { area, theme: theme.trim() },
        total_questions: totalQuestions,
        correct_questions: correctQuestions,
        user_weight: weight,
        performed_at: new Date(`${day}T12:00:00Z`).toISOString(),
      });

      saveTheme(area, theme.trim());
      setThemes(loadThemes(area));

      const firstTask = out.created_tasks[0];
      if (firstTask?.due_date) {
        const dueDate = firstTask.due_date;
        const dueLabel = `${dueDate.slice(8, 10)}/${dueDate.slice(5, 7)}`;
        showToast(`Estudo registrado. Próxima revisão: ${dueLabel}`, "success");
      } else {
        showToast("Estudo registrado.", "success");
      }

      setTheme("");
      setTotal("30");
      setCorrect("");
    } catch (e: unknown) {
      showToast(getErrorMessage(e, "Erro ao registrar."), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif">Registrar Estudo</h1>

      <div className="flex items-center gap-4">
        <label className="text-xs text-muted uppercase tracking-wide min-w-16">Data</label>
        <input
          type="date"
          className="w-36 text-sm border border-edge px-2 py-1.5 bg-paper"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted uppercase tracking-wide">Área</label>
        <div className="grid grid-cols-5 gap-2 w-full">
          {AREAS.map((entry) => (
            <button
              key={entry}
              className={`w-full flex items-center justify-center gap-1 min-w-0 text-xs sm:text-sm px-1 py-2 border ${
                area === entry ? "border-ink text-ink" : "border-edge text-muted"
              }`}
              onClick={() => setArea(entry)}
            >
              <AreaDot area={entry} />
              {entry}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted uppercase tracking-wide">Tema</label>
        <input
          list="theme-suggestions"
          type="text"
          className="w-full text-sm border border-edge px-2 py-1.5 bg-paper"
          placeholder="ex: Insuficiência Cardíaca"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        />
        <datalist id="theme-suggestions">
          {themes.map((entry) => (
            <option key={entry} value={entry} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted uppercase tracking-wide">Total</label>
          <input
            type="number"
            min={1}
            className="w-full text-sm border border-edge px-2 py-1.5 bg-paper"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
          <p className="text-xs text-muted">Mínimo recomendado: 30 questões.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted uppercase tracking-wide">Acertos</label>
          <input
            type="number"
            min={0}
            className="w-full text-sm border border-edge px-2 py-1.5 bg-paper"
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted uppercase tracking-wide">Peso</label>
        <div className="grid grid-cols-3 gap-2 w-full">
          {[1, 2, 3].map((entry) => (
            <button
              key={entry}
              className={`w-full text-sm text-center px-2 py-2 border ${
                weight === entry ? "border-ink text-ink" : "border-edge text-muted"
              }`}
              onClick={() => setWeight(entry)}
            >
              {WEIGHT_LABELS[entry]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        className="w-full text-sm border border-ink py-2 hover:bg-ink hover:text-paper transition-colors disabled:opacity-20"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Registrando..." : "Registrar"}
      </button>
    </div>
  );
}
