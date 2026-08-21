"use client";

import type { NavigationPrompt } from "@/lib/api";

/**
 * O que o Kros leu do calendário antes de perguntar qualquer coisa.
 *
 * Dois motivos para existir, e o segundo é o que importa:
 *
 * 1. A tela tinha espaço morto — duas perguntas curtas e meia página vazia.
 * 2. O aviso de plantão aparecia como afirmação sem evidência ("Você marcou
 *    plantão"), e o aluno não tinha como saber de onde aquilo veio. Aqui ele vê
 *    a conta: 12h bloqueadas no calendário, capacidade prevista de 60 min, o que
 *    ele declarou, e o risco que sai disso.
 *
 * O formato é o do POST de BIOS — rótulo, régua pontilhada, valor à direita —
 * porque é a forma que o sistema já usa para "isto foi verificado".
 *
 * Só aparece quando há o que mostrar: sem calendário e sem previsão, um bloco
 * de quatro linhas dizendo "0h / — / — " é ruído com aparência de dado.
 */
export function KrosDetected({
  prompt,
  declaredMinutes,
  riskActive,
}: {
  prompt: NavigationPrompt;
  declaredMinutes: number;
  riskActive: boolean;
}) {
  const blocked = prompt.blocked_hours_today;
  const predicted = prompt.predicted_minutes;
  if (blocked <= 0 && predicted <= 0) return null;

  const onCall = blocked >= 10;

  return (
    <section
      aria-label="Detectado pelo seu calendário"
      className="mt-6 border-y border-ink py-3"
    >
      <p className="text-nano font-semibold uppercase tracking-[0.16em] text-muted">
        Detectado pelo seu calendário
      </p>

      <dl className="mt-2 flex flex-col gap-0.5 text-xs">
        {blocked > 0 ? (
          <Row
            label="Plantão hoje"
            value={onCall ? `Sim · ${blocked}h bloqueadas` : `Não · ${blocked}h bloqueadas`}
            tone={onCall ? "warning" : "muted"}
          />
        ) : null}
        {predicted > 0 ? (
          <Row label="Capacidade prevista" value={`${predicted} min`} />
        ) : null}
        <Row label="Você declarou" value={`${declaredMinutes} min`} />
        <Row
          label="Risco de interrupção"
          value={riskActive ? "Alto" : "Baixo"}
          tone={riskActive ? "warning" : "muted"}
        />
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "muted" | "warning";
}) {
  const toneClass =
    tone === "warning" ? "text-warning" : tone === "muted" ? "text-muted" : "text-ink";
  return (
    <div className="flex items-baseline gap-3">
      <dt className="shrink-0 text-ink">{label}</dt>
      {/* Régua em CSS, nunca em caractere: um leitor de tela leria uma fileira
          de pontos como pontuação. */}
      <span className="chrome-leader" aria-hidden="true" />
      <dd className={`shrink-0 font-semibold tabular-nums ${toneClass}`}>{value}</dd>
    </div>
  );
}
