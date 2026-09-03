"use client";

import { useQuery } from "@tanstack/react-query";

import { getNavigationPrompt, type NavigationPrompt } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

/**
 * O tamanho do dia, e de onde ele veio.
 *
 * Isto substitui a pergunta de tempo e energia que vivia na aba Rota. A troca é
 * a tese do produto: comportamento observado vale mais que relatado. O
 * calendário sabe quantos minutos sobram; as rotas iniciadas sabem com que
 * energia o aluno de fato estuda. Perguntar custava um toque por sessão e
 * devolvia o palpite de quem ainda não tinha começado.
 *
 * Duas regras de exibição, e a segunda é a que sustenta a primeira:
 *
 * 1. **Uma linha por padrão.** A Home é de densidade BAIXA (§8.3) e tem uma
 *    decisão só: começar. O dimensionamento é contexto da decisão, não uma
 *    segunda decisão competindo com ela.
 * 2. **A evidência fica a um toque.** Número inferido exibido sem a conta é
 *    decreto com cara de dado — o aluno não tem como saber se "96 min" veio do
 *    calendário dele ou de um default. A conta abre; ela não se impõe.
 *
 * Silêncio quando não há o que dizer: sem calendário e sem previsão, "0h / —"
 * é ruído com aparência de medida.
 */
export function TodayDimensioning() {
  const { token, tokenResolved } = useAuthToken();
  const { data: prompt } = useQuery({
    queryKey: ["navigation", "prompt"],
    queryFn: () => getNavigationPrompt(token),
    enabled: tokenResolved,
    staleTime: 60_000,
  });

  if (!prompt) return null;
  // Sem previsão E sem calendário não há dimensionamento — só o piso de 45 que
  // `suggested_minutes` usa quando não soube prever. Afirmar "45 min hoje" ali
  // seria apresentar a ignorância do sistema como leitura do dia.
  if (prompt.predicted_minutes <= 0 && prompt.blocked_hours_today <= 0) return null;

  const previu = prompt.predicted_minutes > 0;
  const minutos = previu ? prompt.predicted_minutes : prompt.suggested_minutes;

  return (
    <section aria-label="Dimensionamento de hoje" className="border-y border-edge">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {/* Mono, e nao sans negrito: minuto e DADO.

                A celula CARGA que ficava logo abaixo saiu junto com a faixa de
                tres numeros, entao "disponiveis" perdeu o par com quem se
                confundia. A palavra fica: previsao de capacidade e outra coisa
                de tempo planejado, e o til diz que e previsao. */}
            <span className="font-mono tabular-nums text-ink">
              {/* "disponíveis" não é enfeite: a célula CARGA logo abaixo mostra
                  os minutos PLANEJADOS, e sem a palavra os dois números leem
                  como duas medidas da mesma coisa que discordam.

                  O til é honesto: previsão de capacidade não é cronômetro. */}
              ≈ {minutos} min disponíveis
            </span>
            <span className="font-mono text-micro text-muted">{procedencia(prompt)}</span>
          </span>
          <span
            className="shrink-0 text-muted transition group-open:rotate-90"
            aria-hidden="true"
          >
            ›
          </span>
        </summary>

        <dl className="flex flex-col gap-0.5 border-t border-edge py-3 text-xs">
          {prompt.blocked_hours_today > 0 ? (
            <Linha
              rotulo="Horas bloqueadas"
              valor={`${prompt.blocked_hours_today}h`}
              alerta={prompt.interruption_risk}
            />
          ) : null}
          {previu ? (
            <Linha rotulo="Capacidade prevista" valor={`${prompt.predicted_minutes} min`} />
          ) : null}
          <Linha
            rotulo="Energia"
            valor={
              prompt.energy_source === "daily_checkin"
                ? `${ENERGIA[prompt.suggested_energy]} · você declarou hoje`
                : `${ENERGIA[prompt.suggested_energy]} · observada`
            }
          />
          <Linha
            rotulo="Risco de interrupção"
            valor={prompt.interruption_risk ? "Alto" : "Baixo"}
            alerta={prompt.interruption_risk}
          />
        </dl>
      </details>
    </section>
  );
}

const ENERGIA: Record<NavigationPrompt["suggested_energy"], string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
};

function procedencia(prompt: NavigationPrompt): string {
  if (prompt.interruption_risk) {
    return `plantão detectado · ${prompt.blocked_hours_today}h bloqueadas`;
  }
  if (prompt.predicted_minutes > 0) return "detectado pelo seu calendário";
  return "estimado";
}

function Linha({
  rotulo,
  valor,
  alerta = false,
}: {
  rotulo: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="shrink-0 text-muted">{rotulo}</dt>
      {/* Régua em CSS, nunca em caractere: um leitor de tela leria uma fileira
          de pontos como pontuação. */}
      <span className="paper-leader" aria-hidden="true" />
      <dd
        className={`shrink-0 font-semibold tabular-nums ${
          alerta ? "text-warning" : "text-ink"
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}
