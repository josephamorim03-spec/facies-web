"use client";

import { useEffect, useState } from "react";
import type { OperationalStreak } from "@/lib/api";

type Props = {
  streak: OperationalStreak | null;
  loading?: boolean;
};

// Constância: o anel preenche até o próximo marco e muda de cor por tier,
// reforçando o hábito diário sem virar um card que compete com o calendário.
const STREAK_MILESTONES = [3, 7, 14, 30];
const RISK_WARNING_HOUR = 20;
const CLOCK_TICK_MS = 30000;

function streakTier(days: number): number {
  let tier = 0;
  for (let i = 0; i < STREAK_MILESTONES.length; i += 1) {
    if (days >= STREAK_MILESTONES[i]) tier = i + 1;
  }
  return tier;
}

function tierColor(days: number, atRisk: boolean): string {
  if (atRisk) return "var(--color-danger)";
  const tier = streakTier(days);
  if (tier === 0) return "var(--color-muted)";
  if (tier >= 3) return "var(--color-accent)";
  return "var(--color-primary)";
}

function StreakRing({ days, atRisk, size = 18 }: { days: number; atRisk: boolean; size?: number }) {
  const tier = streakTier(days);
  const lo = tier === 0 ? 0 : STREAK_MILESTONES[tier - 1];
  const hi = STREAK_MILESTONES[tier] ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const frac =
    tier >= STREAK_MILESTONES.length ? 1 : Math.max(0.1, Math.min(1, (days - lo) / (hi - lo)));
  const color = tierColor(days, atRisk);
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
  const [afterRiskHour, setAfterRiskHour] = useState(false);

  useEffect(() => {
    const update = () => setAfterRiskHour(new Date().getHours() >= RISK_WARNING_HOUR);
    update();
    const timer = window.setInterval(update, CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

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
  const atRisk = Boolean(streak.streak_at_risk) && afterRiskHour && !protection;

  if (days === 0) {
    return (
      <div
        className="flex items-center justify-center gap-2 text-xs text-muted"
        data-streak-mode="empty"
      >
        <StreakRing days={0} atRisk={false} />
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
    atRisk ? "em risco — estude hoje para manter" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const toneClass = atRisk ? "text-danger" : protection ? "text-info" : "text-ink";
  const tint = atRisk ? "var(--color-danger)" : protection ? "var(--color-info)" : "var(--color-primary)";

  return (
    <div className="flex justify-center" data-streak-mode="ring">
      <span
        title={detailTitle}
        data-streak-days={days}
        data-streak-at-risk={atRisk ? "true" : undefined}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${toneClass}`}
        style={{ backgroundColor: `color-mix(in srgb, ${tint} 9%, transparent)` }}
      >
        <StreakRing days={days} atRisk={atRisk} />
        <span>
          <span className="font-semibold">{days}</span> {dayLabel}
          {atRisk ? " · em risco" : protection ? " · protegida" : ""}
        </span>
      </span>
    </div>
  );
}
