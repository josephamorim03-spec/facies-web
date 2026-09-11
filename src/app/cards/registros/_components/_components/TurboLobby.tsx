"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BOTTOM_ACTION_BAR_RESERVE_CLASS, BottomActionBar } from "@/components/ui/BottomActionBar";
import {
  type OperationalTurboOverview,
} from "@/lib/api";
import { AREA_COLORS, Area, rangeStyle } from "../../_lib/cadernoShared";

const ESTIMATED_MS_PER_CARD = 22000;
// Publicado pelo `AppShell`, que e quem decide o recuo do `<main>`. O
// fallback existe para quem renderizar isto fora do shell (um teste de
// componente, por exemplo) e nao para producao.
const TURBO_VIEWPORT_MIN_HEIGHT = "var(--app-content-height, calc(100svh - 5.5rem))";

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type TurboLobbyProps = {
  turboOverview?: OperationalTurboOverview | null;
  availableCount: number;
  isTurboMode: boolean;
  minCards?: number;
  onStartAction: (count: number) => void | Promise<void>;
};

export function TurboLobby({
  turboOverview,
  availableCount,
  isTurboMode,
  minCards = 20,
  onStartAction,
}: TurboLobbyProps) {
  const effectiveAvailableCount = turboOverview?.due_count ?? availableCount;
  const sliderMin = Math.max(1, Math.min(minCards, effectiveAvailableCount));
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

  return (
    // ⚠️ A RESERVA É OBRIGATÓRIA quando se monta uma `BottomActionBar`: no
    // telemóvel ela é `fixed`, sai do fluxo, e sem este recuo o fim do
    // conteúdo fica por baixo dela. É o mesmo que o `CadernoClientPage` faz.
    <div
      className={`flex flex-col ${BOTTOM_ACTION_BAR_RESERVE_CLASS}`}
      style={{ minHeight: TURBO_VIEWPORT_MIN_HEIGHT }}
    >

      {/* Button — absolutely centered in the full container */}
      <div className="flex flex-1 flex-col justify-center gap-5 py-6">
        {effectiveAvailableCount <= 0 ? (
          <div className="rounded-surface border border-edge bg-surface p-5 text-center ">
            <div className="space-y-2">
              <p className="paper-eyebrow">Tudo em dia</p>
              <p className="text-2xl text-ink">Nenhum card para revisar agora.</p>
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
              <div className="paper-surface px-5 py-6">
                <p className="paper-eyebrow">Cards para revisar agora</p>
                <p className="mt-2 text-5xl leading-none text-ink">{effectiveAvailableCount}</p>
                <p className="mt-2 text-sm text-muted">
                  {turboOverview?.estimated_minutes
                    ? `~${turboOverview.estimated_minutes} min de revisão`
                    : `~${fmtTime(questionCount * ESTIMATED_MS_PER_CARD)}`}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-control border border-edge bg-surface p-3 ">
                <p className="paper-eyebrow">Foco de agora</p>
                <div className="mt-2 space-y-1.5">
                  {topReasons.length > 0 ? topReasons.map((reason) => (
                    <div key={reason.reason} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-ink">{reason.label}</span>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-ink">{reason.count}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted">Cards novos ou na janela ideal de revisão.</p>
                  )}
                </div>
              </div>
              <div className="rounded-control border border-edge bg-surface p-3 ">
                <p className="paper-eyebrow">Distribuição por área</p>
                <div className="mt-2 space-y-1.5">
                  {topAreas.length > 0 ? topAreas.map((item) => {
                    const areaTone = AREA_COLORS[item.area as Area] ?? AREA_COLORS.OU;
                    return (
                      <div key={item.area} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 shrink-0" style={{ backgroundColor: areaTone }} />
                          <span className="font-semibold text-ink">{item.area}</span>
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
                <p className="paper-eyebrow">Próximos cards</p>
                <div className="space-y-1.5">
                  {previewCards.map((card) => {
                    const cardAreaColor = AREA_COLORS[card.area as Area] ?? AREA_COLORS.OU;
                    return (
                      <div key={card.note_id} className="border border-edge border-l-4 bg-surface px-3 py-2 text-sm " style={{ borderLeftColor: cardAreaColor }}>
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="text-micro leading-none text-ink">{card.area}</span>
                          <span className="border border-edge px-1.5 py-0.5 text-micro leading-none text-muted">{card.context.label}</span>
                        </div>
                        <p className="line-clamp-1 text-ink">{card.insight_question}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

      {effectiveAvailableCount > 0 && (
        /* ⚠️ ISTO É UMA `BottomActionBar`, e a mudança foi PEDIDA: o operador
           apontou que o arranque da revisão devia ser igual ao `Pesquisar` do
           Caderno, e que esse desenho se devia repetir em necessidade
           semelhante.

           O que estava aqui antes era um `sticky` COM CAIXA PRÓPRIA — borda,
           fundo e `-mx-1` — a fingir de barra dentro do cartão do lobby. Lia-se
           como um cartãozinho colado, e não como a ação da tela.

           A `BottomActionBar` traz de graça o que eu estava a remontar à mão:
           assenta acima da barra de abas e segue-a quando ela se esconde
           (`.acima-da-barra-de-abas`), vira estática no desktop, e a ação vai
           centrada abaixo de `sm`. */
        <BottomActionBar>
          <Button
            type="button"
            data-testid="turbo-start"
            variant="primary"
            size="md"
            bloco
            onClick={() => void onStartAction(questionCount)}
          >
            Iniciar revisão · {questionCount} cards
            {isTurboMode ? ` · ~${fmtTime(questionCount * ESTIMATED_MS_PER_CARD)}` : ""}
          </Button>
        </BottomActionBar>
      )}
    </div>
  );
}
