"use client";

import React, { useState } from "react";
import {
  type OperationalTurboOverview,
} from "@/lib/api";
import { AREA_COLORS, Area, rangeStyle } from "../../_lib/cadernoShared";

const ESTIMATED_MS_PER_CARD = 22000;
const TURBO_VIEWPORT_MIN_HEIGHT = "calc(100svh - 5.5rem)";

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type TurboLobbyProps = {
  turboOverview?: OperationalTurboOverview | null;
  availableCount: number;
  isTurboMode: boolean;
  lobbyAccentColor?: string;
  onStartAction: (count: number) => void | Promise<void>;
};

export function TurboLobby({
  turboOverview,
  availableCount,
  isTurboMode,
  lobbyAccentColor,
  onStartAction,
}: TurboLobbyProps) {
  const effectiveAvailableCount = turboOverview?.due_count ?? availableCount;
  const sliderMin = Math.max(1, Math.min(20, effectiveAvailableCount));
  const sliderMax = Math.max(sliderMin, Math.min(100, effectiveAvailableCount));
  const defaultCount = Math.max(
    sliderMin,
    Math.min(turboOverview?.suggested_target_cards ?? 60, sliderMax),
  );
  const [rawQuestionCount, setQuestionCount] = useState(defaultCount);
  const questionCount = Math.max(
    sliderMin,
    Math.min(Number.isFinite(rawQuestionCount) ? rawQuestionCount : defaultCount, sliderMax),
  );

  const topReasons = turboOverview?.reason_counts.slice(0, 2) ?? [];
  const topAreas = turboOverview?.by_area.filter((item) => item.due_count > 0).slice(0, 3) ?? [];
  const previewCards = turboOverview?.priority_preview.slice(0, 3) ?? [];
  const accentColor = lobbyAccentColor ?? "var(--color-ink)";

  return (
    <div className="flex flex-col font-sans" style={{ minHeight: TURBO_VIEWPORT_MIN_HEIGHT }}>

      {/* Button — absolutely centered in the full container */}
      <div className="flex flex-1 flex-col justify-center gap-5 py-6">
        {effectiveAvailableCount <= 0 ? (
          <div className="rounded-lg border border-edge bg-surface p-5 text-center shadow-sm">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted">Tudo em dia</p>
              <p className="text-2xl font-serif text-ink">Nenhum card para revisar agora.</p>
              <p className="mx-auto max-w-sm text-sm text-muted">
                A fila adaptativa não encontrou cards vencidos ou novos elegíveis neste momento.
              </p>
            </div>
            {turboOverview?.total_eligible ? (
              <p className="mt-3 text-xs text-muted">
                {turboOverview.total_eligible} cards elegíveis seguem guardados para a próxima janela.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <p className="text-xs uppercase tracking-widest text-muted">Cards para revisar agora</p>
              <p className="font-serif text-5xl leading-none text-ink">{effectiveAvailableCount}</p>
              <p className="text-sm text-muted">
                {turboOverview?.estimated_minutes
                  ? `~${turboOverview.estimated_minutes} min de revisão`
                  : `~${fmtTime(questionCount * ESTIMATED_MS_PER_CARD)}`}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-edge bg-surface p-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-widest text-muted">Por que entrou</p>
                <div className="mt-2 space-y-1.5">
                  {topReasons.length > 0 ? topReasons.map((reason) => (
                    <div key={reason.reason} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-ink">{reason.label}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{reason.count}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted">Cards novos ou na janela ideal de revisão.</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-edge bg-surface p-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-widest text-muted">Áreas mais presentes</p>
                <div className="mt-2 space-y-1.5">
                  {topAreas.length > 0 ? topAreas.map((item) => {
                    const areaTone = AREA_COLORS[item.area as Area] ?? "#888";
                    return (
                      <div key={item.area} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: areaTone }} />
                          <span className="font-semibold" style={{ color: areaTone }}>{item.area}</span>
                        </div>
                        <span className="text-xs tabular-nums text-muted">
                          {item.due_count} agora
                          {item.overdue_count > 0 ? `, ${item.overdue_count} atrasados` : ""}
                        </span>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-muted">Sem concentração por área.</p>
                  )}
                </div>
              </div>
            </div>

            {previewCards.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted">Primeiros da fila</p>
                <div className="space-y-1.5">
                  {previewCards.map((card) => {
                    const cardAreaColor = AREA_COLORS[card.area as Area] ?? "#888";
                    return (
                      <div key={card.note_id} className="rounded-lg border border-edge border-l-4 bg-surface px-3 py-2 text-sm shadow-sm" style={{ borderLeftColor: cardAreaColor }}>
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="text-[9px] font-semibold leading-none" style={{ color: cardAreaColor }}>{card.area}</span>
                          <span className="rounded-full border border-edge px-1.5 py-0.5 text-[9px] leading-none text-muted">{card.context.label}</span>
                        </div>
                        <p className="line-clamp-1 text-ink">{card.insight_question}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              type="button"
              data-testid="turbo-start"
              onClick={() => void onStartAction(questionCount)}
              className="inline-flex h-12 w-12 items-center justify-center self-center rounded-full border text-paper shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor, borderColor: accentColor }}
              aria-label="Iniciar revisão"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <polygon points="6,4 20,12 6,20" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Slider — pinned to bottom */}
      {effectiveAvailableCount > 1 && sliderMax > sliderMin && (
        <div className="pb-6 space-y-2">
          <p className="text-center text-xs text-muted tabular-nums">
            <span className="text-ink font-semibold">{questionCount}</span> cards
            {isTurboMode && (
              <span className="ml-2">- ~{fmtTime(questionCount * ESTIMATED_MS_PER_CARD)}</span>
            )}
          </p>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            style={rangeStyle(questionCount, sliderMin, sliderMax)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
