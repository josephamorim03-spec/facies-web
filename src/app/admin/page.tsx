"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { adminGetStats, AdminStats } from "@/lib/api/domains/admin";
import { LoadingLine } from "@/components/ui/LoadBar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Colors ────────────────────────────────────────────────────────────────

// Hexes fixos não seguem o tema: os gráficos do admin ficavam com a paleta clara
// desenhada sobre o fundo escuro. Apontando para as variáveis, o mesmo gráfico
// serve os dois temas — e passa a obedecer o contraste que o gate verifica.
const COLORS = {
  green: "var(--color-success)",
  blue: "var(--color-info)",
  gray: "var(--color-muted)",
  red: "var(--color-danger)",
  ink: "var(--color-ink)",
  muted: "var(--color-muted)",
  edge: "var(--color-edge)",
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
    <div className="bg-surface border border-edge p-5">
      <p className="paper-eyebrow mb-1">
        {label}
      </p>
      <p className="text-3xl font-bold text-ink">
        {value}
      </p>
      {sub && (
        <p className="text-sm text-muted mt-1">{sub}</p>
      )}
      {trend && (
        <p
          className={`text-xs mt-1.5 flex items-center gap-1 ${
            trend.direction === "up"
              ? "text-success"
              : trend.direction === "down"
                ? "text-danger"
                : "text-muted"
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
    <h2 className="paper-eyebrow mb-3">
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
      <div className="flex items-center justify-center h-48 text-sm text-muted">
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
              borderRadius: 0,
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
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Situacao dos acessos ───────────────────────────────────────────────────

function KeyDistributionChart({
  active,
  expired,
  revoked,
}: {
  active: number;
  expired: number;
  revoked: number;
}) {
  const data = [
    { name: "Ativos", value: active, color: COLORS.blue },
    { name: "Vencidos", value: expired, color: COLORS.gray },
    { name: "Revogados", value: revoked, color: COLORS.red },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted">
        Nenhum acesso concedido ainda.
      </div>
    );
  }

  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    // Lista de medidores, nao rosca. Quatro categorias com contagem exata se
    // leem comparando COMPRIMENTOS alinhados a um eixo comum; num anel elas
    // viram arcos, que ninguem compara de olho — e a legenda com bolinha
    // ("iconType: circle") era a ultima forma redonda do painel.
    <dl className="flex h-56 flex-col justify-center gap-3">
      {data.map((entry) => (
        <div key={entry.name} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
          <dt className="paper-eyebrow">
            {entry.name}
          </dt>
          <div className="paper-meter h-3" aria-hidden="true">
            <div
              style={{
                width: `${total > 0 ? (entry.value / total) * 100 : 0}%`,
                ["--meter-color"]: entry.color,
              } as CSSProperties}
            />
          </div>
          <dd className="text-right text-sm font-semibold tabular-nums text-ink">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
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
      <div className="flex items-center justify-center h-32 text-sm text-muted">
        Sem atividade nos últimos 30 dias.
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-edge text-left">
            <th className="paper-eyebrow pb-2">
              #
            </th>
            <th className="paper-eyebrow pb-2">
              Usuário
            </th>
            <th className="paper-eyebrow pb-2 text-right">
              Revisões
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr
              key={u.user_id}
              className="border-b border-edge/50 last:border-0"
            >
              <td className="py-2 pr-2 text-xs text-muted w-6">{i + 1}</td>
              <td className="py-2 text-xs text-ink truncate max-w-[180px]">
                {u.email || u.user_id.slice(0, 12) + "…"}
              </td>
              <td className="py-2 text-xs text-ink text-right font-medium">
                {u.reviews}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

//: `source_kind` do backend em português. `access_key` e' legado: nada novo
//: nasce assim, e some quando os direitos migrados vencerem.
const ROTULO_ORIGEM: Record<string, string> = {
  subscription: "Assinatura",
  admin_grant: "Cortesia",
  access_key: "Chave (legado)",
};

// ─── Acesso por origem ──────────────────────────────────────────────────────

/** De onde vem o acesso: assinatura, cortesia do admin, ou chave migrada. */
function AcessoPorOrigem({
  data,
}: {
  data: AdminStats["access"]["by_source"];
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted">
        Nenhum acesso concedido ainda.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-edge text-left">
            <th className="paper-eyebrow pb-2 pr-3">
              Origem
            </th>
            <th className="paper-eyebrow pb-2 pr-3 text-right">
              Total
            </th>
            <th className="paper-eyebrow pb-2 pr-3 text-info text-right">
              Ativos
            </th>
            <th className="paper-eyebrow pb-2 text-right">
              Inat.
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr
              key={m.source}
              className="border-b border-edge/50 last:border-0"
            >
              <td className="py-1.5 pr-3 text-xs text-ink">
                {ROTULO_ORIGEM[m.source] ?? m.source}
              </td>
              <td className="py-1.5 pr-3 text-xs text-ink text-right">
                {m.total}
              </td>
              <td className="py-1.5 pr-3 text-xs text-info text-right">
                {m.active}
              </td>
              <td className="py-1.5 text-xs text-muted text-right">
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
        <p className="text-sm text-danger">{error}</p>
        <p className="text-xs text-muted">Verifique os logs do Railway para mais detalhes.</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingLine>Carregando métricas</LoadingLine>
      </div>
    );
  }

  const { users, access: acesso, review_activity: activity, storage } = stats;

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
          label="Acessos Ativos"
          value={acesso.active}
          sub={`${acesso.granted_last_30_days} concedidos (30d)`}
        />
      </div>

      {/* ── Users section ───────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Usuários</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total registrados" value={users.total} />
          <StatCard
            label="Com acesso ativo"
            value={users.with_active_access}
            sub="podem entrar"
          />
          <StatCard
            label="Nunca tiveram"
            value={users.never_had_access}
            sub="sem direito emitido"
          />
          <StatCard
            label="Acesso vencido"
            value={users.expired_access}
            sub="tiveram e perderam"
          />
        </div>
      </div>

      {/* ── Acesso ──────────────────────────────────────────────────────── */}
      <div>
        <SectionTitle>Acesso</SectionTitle>
        {/* Sem "Disponíveis": chave podia existir sem dono — estoque a
            distribuir — e direito é sempre de alguém. */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Ativos" value={acesso.active} sub={`de ${acesso.total} total`} />
          <StatCard label="Vencidos" value={acesso.expired} />
          <StatCard label="Revogados" value={acesso.revoked} />
        </div>
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review activity chart */}
        <div className="bg-surface border border-edge p-5">
          <SectionTitle>Atividade de Revisões (14 dias)</SectionTitle>
          <ReviewsChart data={activity.daily_last_14_days} />
        </div>

        {/* Distribuição do acesso */}
        <div className="bg-surface border border-edge p-5">
          <SectionTitle>Situação dos acessos</SectionTitle>
          <KeyDistributionChart
            active={acesso.active}
            expired={acesso.expired}
            revoked={acesso.revoked}
          />
        </div>
      </div>

      {/* ── Bottom row: Top users + Mentor breakdown ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top users */}
        <div className="bg-surface border border-edge p-5">
          <SectionTitle>Top Alunos (30 dias)</SectionTitle>
          <TopUsersTable users={activity.top_users_last_30_days} />
        </div>

        {/* Acesso por origem */}
        <div className="bg-surface border border-edge p-5">
          <SectionTitle>Acesso por origem</SectionTitle>
          <AcessoPorOrigem data={acesso.by_source} />
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
