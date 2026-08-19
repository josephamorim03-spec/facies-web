"use client";

import { AreaIcon } from "@/components/AreaIcon";
import { Button } from "@/components/ui/Button";
import { displayAreaLabel, resolveDisplayArea } from "@/lib/areaDisplay";
import type { NavigationRoute, NavigationRouteStatus } from "@/lib/api";

/**
 * Reason codes viram frase aqui, e não no servidor.
 *
 * O servidor devolve código; a tela traduz. É o que impede a resposta "porque a
 * IA decidiu" de virar aceitável — se não existe frase para o código, ele
 * simplesmente não é exibido, em vez de vazar jargão para o aluno.
 */
const ROUTE_REASONS: Record<string, string> = {
  ENERGY_LOW: "Ajustada para energia baixa.",
  ENERGY_HIGH: "Aproveitando sua energia alta.",
  INTERRUPTION_RISK_ATOMIC_ONLY: "Só atividades que aguentam interrupção.",
  TRUNCATED_BY_TIME_BUDGET: "Algumas atividades não cabiam no tempo.",
  CANDIDATES_UNAVAILABLE: "Parte das suas atividades não pôde ser carregada agora.",
};

/**
 * Por que a rota saiu vazia. Uma causa só, e cada uma diz a verdade dela.
 *
 * Antes tudo caía em "nenhuma atividade cabe em 45 minutos" — frase que culpa o
 * tempo do aluno mesmo quando a causa era não haver atividade nenhuma, ou o
 * banco de questões estar fora do ar.
 */
const EMPTY_ROUTE_COPY: Record<string, { title: string; detail: string }> = {
  NO_CANDIDATES: {
    title: "Você está em dia.",
    detail: "Não há revisão vencida nem cartão no ponto agora.",
  },
  CANDIDATES_UNAVAILABLE: {
    title: "Não conseguimos montar sua rota agora.",
    detail: "Parte das suas atividades não pôde ser carregada. Tente de novo em instantes.",
  },
  NO_ATOMIC_ACTION_AVAILABLE: {
    title: "Nada que aguente interrupção por enquanto.",
    detail: "Suas atividades de agora pedem tempo contínuo. Marque que não vai ser interrompido para liberá-las.",
  },
};

const EMPTY_ROUTE_FALLBACK = {
  title: "Nenhuma atividade cabe nesse tempo.",
  detail: "Escolha um tempo maior para o Kros montar sua rota.",
};

const ACTION_REASONS: Record<string, string> = {
  LOW_ENERGY_FIT: "leve para agora",
  HIGH_ENERGY_FIT: "aproveita seu pico",
  SURVIVES_INTERRUPTION: "aguenta interrupção",
  CRITICAL_SIGNAL: "sinal crítico",
  CONTINUITY: "continua o que ficou aberto",
};

function translate(codes: string[], table: Record<string, string>): string[] {
  return codes.map((code) => table[code]).filter((text): text is string => Boolean(text));
}

type Props = {
  route: NavigationRoute;
  /** Ausente quando a rota não foi gravada — aí não há desfecho a registrar. */
  onResolve?: (status: NavigationRouteStatus) => void;
  resolving?: boolean;
  resolved?: NavigationRouteStatus | null;
};

export function NavigatorRoute({ route, onResolve, resolving, resolved }: Props) {
  const notes = translate(route.reason_codes, ROUTE_REASONS);

  if (route.actions.length === 0) {
    const cause = route.reason_codes.find((code) => code in EMPTY_ROUTE_COPY);
    const copy = cause ? EMPTY_ROUTE_COPY[cause] : EMPTY_ROUTE_FALLBACK;
    return (
      <section aria-label="Rota" className="border-y border-edge py-4">
        <p className="text-sm font-semibold text-ink">{copy.title}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{copy.detail}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="navigator-route-title" className="border-y border-edge py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="navigator-route-title" className="font-serif text-xl font-semibold text-ink">
          Sua rota
        </h2>
        <p className="text-sm text-muted">
          {route.total_minutes} de {route.available_minutes} min
        </p>
      </div>

      {notes.length > 0 ? (
        <p className="mt-1 text-sm leading-6 text-muted">{notes.join(" ")}</p>
      ) : null}

      <ol className="mt-4 divide-y divide-edge border-y border-edge">
        {route.actions.map((item, index) => {
          const area = resolveDisplayArea(
            null,
            item.action.title,
            item.action.rationale,
          );
          const why = translate(item.reason_codes, ACTION_REASONS);
          return (
            <li key={item.action.action_id ?? `${item.action.kind}-${index}`} className="py-3">
              <div className="flex items-start gap-3">
                <AreaIcon area={area} size={28} colored />
                <span className="sr-only">{displayAreaLabel(area)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{item.action.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {item.estimated_minutes} min
                    {why.length > 0 ? ` · ${why.join(" · ")}` : ""}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {onResolve && route.route_id ? (
        resolved ? (
          <p className="mt-4 text-sm text-muted">
            {resolved === "completed"
              ? "Rota concluída. O próximo cálculo já considera isso."
              : "Anotado. O próximo cálculo considera sua recusa."}
          </p>
        ) : (
          // Recusar fica lado a lado com concluir, e não escondido: uma rota
          // recusada com frequência é a evidência mais direta de que o montador
          // está errando, e esconder o botão esconderia justamente esse sinal.
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={resolving}
              onClick={() => onResolve("completed")}
            >
              Concluir rota
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={resolving}
              onClick={() => onResolve("rejected")}
            >
              Não serve agora
            </Button>
          </div>
        )
      ) : null}
    </section>
  );
}
