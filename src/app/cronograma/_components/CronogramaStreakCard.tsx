"use client";

import type { OperationalStreak } from "@/lib/api";

type Props = {
  streak: OperationalStreak | null;
  loading?: boolean;
};

// Constância: o anel preenche até o próximo marco e muda de cor por tier,
// reforçando o hábito diário sem virar um card que compete com o calendário.
//
// A constância é AUTORREFERENTE — você contra você, nunca contra outro aluno.
// O aviso de "em risco" que existia aqui foi removido de propósito: um
// `setInterval` vigiava o relógio para, passadas as 20h, pintar de vermelho e
// dizer "estude hoje para manter". Isso é aversão à perda, e o produto se
// posiciona explicitamente contra mecânica que gera ansiedade
// (`docs/product/positioning.md`). O dado `streak_at_risk` continua existindo na
// API; o que não existe mais é a interface transformá-lo em urgência.
const STREAK_MILESTONES = [3, 7, 14, 30];

function streakTier(days: number): number {
  let tier = 0;
  for (let i = 0; i < STREAK_MILESTONES.length; i += 1) {
    if (days >= STREAK_MILESTONES[i]) tier = i + 1;
  }
  return tier;
}

function tierColor(days: number): string {
  const tier = streakTier(days);
  if (tier === 0) return "var(--color-muted)";
  if (tier >= 3) return "var(--color-accent)";
  return "var(--color-primary)";
}

function StreakRing({ days, size = 18 }: { days: number; size?: number }) {
  const tier = streakTier(days);
  const lo = tier === 0 ? 0 : STREAK_MILESTONES[tier - 1];
  const hi = STREAK_MILESTONES[tier] ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const frac =
    tier >= STREAK_MILESTONES.length ? 1 : Math.max(0.1, Math.min(1, (days - lo) / (hi - lo)));
  const color = tierColor(days);
  const center = size / 2;
  const radius = size * 0.36;
  const circumference = 2 * Math.PI * radius;
  const dot = 0.9 + tier * 0.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx={center} cy={center} r={radius} stroke="var(--color-edge)" strokeWidth={1.6} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - frac)}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.35s ease" }}
      />
      <circle cx={center} cy={center} r={dot} fill={color} />
    </svg>
  );
}

export function CronogramaStreakCard({ streak, loading = false }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center" data-testid="streak-skeleton">
        <div className="h-3 w-40 animate-pulse rounded-full bg-edge" />
      </div>
    );
  }

  if (streak === null) return null;

  const days = streak.streak_days;
  const best = streak.streak_max ?? 0;
  const protection = Boolean(streak.active_protection);

  if (days === 0) {
    return (
      <div
        className="flex items-center justify-center gap-2 text-xs text-muted"
        data-streak-mode="empty"
      >
        <StreakRing days={0} />
        <span>Comece sua sequência hoje{best > 0 ? ` · recorde ${best}` : ""}</span>
      </div>
    );
  }

  const dayLabel = days === 1 ? "dia seguido" : "dias seguidos";
  const detailTitle = [
    `${days} ${dayLabel}`,
    `recorde ${best}`,
    `${streak.streak_reviews} revisões`,
    `${streak.streak_flashcards_seen} cards`,
    protection ? "sequência protegida" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const toneClass = protection ? "text-info" : "text-ink";
  const tint = protection ? "var(--color-info)" : "var(--color-primary)";

  return (
    <div className="flex justify-center" data-streak-mode="ring">
      <span
        title={detailTitle}
        data-streak-days={days}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${toneClass}`}
        style={{ backgroundColor: `color-mix(in srgb, ${tint} 9%, transparent)` }}
      >
        <StreakRing days={days} />
        <span>
          <span className="font-semibold">{days}</span> {dayLabel}
          {protection ? " · protegida" : ""}
        </span>
      </span>
    </div>
  );
}
