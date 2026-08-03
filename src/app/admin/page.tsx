"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminGetStats, AdminStats } from "@/lib/api/domains/access-keys";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Colors ────────────────────────────────────────────────────────────────

const COLORS = {
  green: "#22c55e",
  blue: "#3b82f6",
  gray: "#9ca3af",
  red: "#ef4444",
  ink: "#1f2937",
  muted: "#6b7280",
  edge: "#e5e7eb",
};

const PIE_COLORS = [COLORS.green, COLORS.blue, COLORS.gray, COLORS.red];

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: number | string;
  sub?: string;
  trend?: { direction: "up" | "down" | "neutral"; label: string };
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {sub && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
      )}
      {trend && (
        <p
          className={`text-xs mt-1.5 flex items-center gap-1 ${
            trend.direction === "up"
              ? "text-green-600"
              : trend.direction === "down"
                ? "text-red-500"
                : "text-gray-400"
          }`}
        >
          <span>
            {trend.direction === "up"
              ? "↑"
              : trend.direction === "down"
                ? "↓"
                : "→"}
          </span>
          <span>{trend.label}</span>
        </p>
      )}
    </div>
  );
}

// ─── Section Title ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
      {children}
    </h2>
  );
}

// ─── Mini Bar Chart ─────────────────────────────────────────────────────────

function ReviewsChart({
  data,
}: {
  data: { date: string; reviews: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Sem dados de revisão nos últimos 14 dias.
      </div>
    );
  }

  const maxReviews = Math.max(...data.map((d) => d.reviews), 1);

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: COLORS.muted }}
            tickFormatter={(val: string) => {
              const d = new Date(val + "T00:00:00");
              return d.toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "numeric",
              });
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: COLORS.muted }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={[0, Math.max(5, maxReviews)]}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: `1px solid ${COLORS.edge}`,
            }}
            labelFormatter={(val) => {
              if (typeof val !== "string") return String(val ?? "");
              const d = new Date(val + "T00:00:00");
              return d.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "short",
              });
            }}
          />
          <Bar
            dataKey="reviews"
            fill={COLORS.blue}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Key Distribution Pie ───────────────────────────────────────────────────

function KeyDistributionChart({
  available,
  active,
  expired,
  revoked,
}: {
  available: number;
  active: number;
  expired: number;
  revoked: number;
}) {
  const data = [
    { name: "Disponíveis", value: available, color: COLORS.green },
    { name: "Ativas", value: active, color: COLORS.blue },
    { name: "Expiradas", value: expired, color: COLORS.gray },
    { name: "Revogadas", value: revoked, color: COLORS.red },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Nenhuma chave cadastrada.
      </div>
    );
  }

  return (
    <div className="h-56 flex items-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: `1px solid ${COLORS.edge}`,
            }}
            formatter={(value, name) => [value, name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: COLORS.muted }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Top Users Table ────────────────────────────────────────────────────────

function TopUsersTable({
  users,
}: {
  users: { user_id: string; email: string | null; reviews: number }[];
}) {
  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        Sem atividade nos últimos 30 dias.
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
            <th className="pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              #
            </th>
            <th className="pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Usuário
            </th>
            <th className="pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">
              Revisões
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr
              key={u.user_id}
              className="border-b border-gray-100 dark:border-gray-800/50 last:border-0"
            >
              <td className="py-2 pr-2 text-xs text-gray-400 w-6">{i + 1}</td>
              <td className="py-2 text-xs text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                {u.email || u.user_id.slice(0, 12) + "…"}
              </td>
              <td className="py-2 text-xs text-gray-700 dark:text-gray-300 text-right font-medium">
                {u.reviews}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mentor Label Breakdown ─────────────────────────────────────────────────

function MentorBreakdown({
  data,
}: {
  data: AdminStats["access_keys"]["by_mentor_label"];
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-gray-400">
        Nenhuma mentoria cadastrada.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
            <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Mentoria
            </th>
            <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">
              Total
            </th>
            <th className="pb-2 pr-3 text-xs font-semibold text-green-600 uppercase tracking-wide text-right">
              Disp.
            </th>
            <th className="pb-2 pr-3 text-xs font-semibold text-blue-600 uppercase tracking-wide text-right">
              Ativas
            </th>
            <th className="pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">
              Inat.
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr
              key={m.label}
              className="border-b border-gray-100 dark:border-gray-800/50 last:border-0"
            >
              <td className="py-1.5 pr-3 text-xs text-gray-700 dark:text-gray-300">
                {m.label}
              </td>
              <td className="py-1.5 pr-3 text-xs text-gray-700 dark:text-gray-300 text-right">
                {m.total}
              </td>
              <td className="py-1.5 pr-3 text-xs text-green-700 text-right">
                {m.available}
              </td>
              <td className="py-1.5 pr-3 text-xs text-blue-700 text-right">
                {m.active}
              </td>
              <td className="py-1.5 text-xs text-gray-400 text-right">
                {m.expired + m.revoked}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGetStats()
      .then(setStats)
      .catch((err: { status: number; message?: string; details?: unknown }) => {
        if (err?.status === 401 || err?.status === 403) {
          router.replace("/");
          return;
        }
        const code = typeof err?.details === "object" && err.details !== null
          ? (err.details as Record<string, unknown>).code ?? ""
          : "";
        setError(`Erro ${err?.status ?? "?"}: ${code || err?.message || "Não foi possível carregar as métricas."}`);
      });
  }, [router]);

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <p className="text-xs text-gray-400">Verifique os logs do Railway para mais detalhes.</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm text-gray-400 dark:text-gray-600 animate-pulse">
          Carregando métricas…
        </span>
      </div>
    );
  }

  const { users, access_keys: keys, review_activity: activity, storage } = stats;

  return (
    <div className="space-y-8">
      {/* ── Top-level summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Usuários"
          value={users.total}
          sub={`${users.last_7_days} novos esta semana`}
          trend={
            users.last_7_days > 0
              ? { direction: "up", label: `${users.last_7_days} novos nos últimos 7 dias` }
              : undefined
          }
        />
        <StatCard
          label="Revisões Hoje"
          value={activity.today}
          sub={`${activity.last_7_days} nos últimos 7 dias`}
          trend={
            activity.today > 0
              ? { direction: "up", label: `${activity.active_users_last_7_days} alunos ativos` }
              : undefined
          }
        />
        <StatCard
          label="Chaves Ativas"
          value={keys.active}
          sub={`${keys.available} disponíveis · ${keys.redeemed_last_30_days} resgatadas (30d)`}
          trend={
            keys.active > 0
              ? { direction: "up", label: `média ${keys.avg_duration_days} dias` }
              : undefined
          }
        />
      </div>

      {/* ── Users section ───────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Usuários</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total registrados" value={users.total} />
          <StatCard
            label="Com chave ativa"
            value={users.with_active_key}
            sub="acesso liberado"
          />
          <StatCard
            label="Sem chave"
            value={users.without_key}
            sub="nunca resgataram"
          />
          <StatCard
            label="Chave expirada"
            value={users.expired_key}
            sub="acesso bloqueado"
          />
        </div>
      </div>

      {/* ── Access Keys section ─────────────────────────────────────────── */}
      <div>
        <SectionTitle>Chaves de Acesso</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Disponíveis"
            value={keys.available}
            sub={`de ${keys.total} total`}
          />
          <StatCard label="Ativas" value={keys.active} sub="em uso" />
          <StatCard label="Expiradas" value={keys.expired} />
          <StatCard label="Revogadas" value={keys.revoked} />
        </div>
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review activity chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <SectionTitle>Atividade de Revisões (14 dias)</SectionTitle>
          <ReviewsChart data={activity.daily_last_14_days} />
        </div>

        {/* Key distribution pie */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <SectionTitle>Distribuição de Chaves</SectionTitle>
          <KeyDistributionChart
            available={keys.available}
            active={keys.active}
            expired={keys.expired}
            revoked={keys.revoked}
          />
        </div>
      </div>

      {/* ── Bottom row: Top users + Mentor breakdown ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top users */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <SectionTitle>Top Alunos (30 dias)</SectionTitle>
          <TopUsersTable users={activity.top_users_last_30_days} />
        </div>

        {/* Mentor breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <SectionTitle>Chaves por Mentoria</SectionTitle>
          <MentorBreakdown data={keys.by_mentor_label} />
        </div>
      </div>

      {/* ── Storage section ─────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Armazenamento</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Questões analisadas" value={storage.total_questions} />
          <StatCard label="Itens de estudo" value={storage.total_study_items} />
        </div>
      </div>
    </div>
  );
}
