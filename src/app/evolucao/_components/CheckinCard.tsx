"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getTodayCheckin,
  saveCheckin,
  type RoutineCheckinPatch,
} from "@/lib/api/domains/routine";
import { useAuthToken } from "@/lib/useAuthToken";

/**
 * Registro do dia: sono e plantão.
 *
 * Eram três. A energia saiu porque mudou de dono — quem pergunta é a Rota, a
 * cada sessão, e o dia recebe a média das rotas INICIADAS. Sono e plantão ficam
 * aqui porque não mudam entre sessões do mesmo dia: são fatos do dia, não do
 * momento.
 *
 * Nunca foram seis: prontidão-para-foco é quase colinear com energia, e esforço
 * percebido é medida PÓS-esforço — perguntá-la no registro do dia não mede nada.
 * O que sustenta "leva alguns segundos" é o número de perguntas.
 *
 * Sem streak, sem alerta, sem cobrança: todo campo aceita ficar em branco, e
 * sair sem responder não produz consequência nenhuma.
 */

const SLEEP_OPTIONS = [
  { label: "menos de 4h", minutes: 210 },
  { label: "4–6h", minutes: 300 },
  { label: "6–8h", minutes: 420 },
  { label: "mais de 8h", minutes: 540 },
] as const;


function OptionButton({
  selected,
  onClick,
  children,
  ariaLabel,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`min-h-11 min-w-11 rounded-control border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        selected
          ? "border-primary bg-primary text-primaryInk"
          : "border-edge bg-paper text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function CheckinCard() {
  const { token, tokenResolved } = useAuthToken();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["routine", "checkin", "today"],
    queryFn: () => getTodayCheckin(token),
    enabled: tokenResolved,
    // A rota responde 404 com a flag de captura desligada. Nesse caso o cartão
    // simplesmente não existe — repetir a tentativa só geraria ruído no console.
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (patch: RoutineCheckinPatch) =>
      saveCheckin(token, query.data?.local_date ?? "", patch),
    onSuccess: (data) => {
      queryClient.setQueryData(["routine", "checkin", "today"], data);
      queryClient.invalidateQueries({ queryKey: ["student", "evolution"] });
    },
  });

  if (!tokenResolved || query.isPending) {
    return <div className="h-28 animate-pulse rounded-xl border border-edge bg-surface" />;
  }

  // Captura desligada (404) ou indisponível: a leitura abaixo continua valendo.
  if (query.isError || !query.data) return null;

  const { checkin, prefill } = query.data;
  const onCall = checkin?.on_call_unplanned
    ? true
    : checkin?.on_call_confirmed ?? null;

  return (
    <section
      aria-labelledby="checkin-title"
      className="rounded-xl border border-edge bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="checkin-title" className="text-sm font-semibold text-ink">
          Como foi o seu dia
        </h2>
        <p className="text-xs text-muted">
          {mutation.isPending
            ? "Salvando…"
            : checkin?.updated_at
              ? "Registrado"
              : "Opcional"}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Sono</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SLEEP_OPTIONS.map((option) => (
              <OptionButton
                key={option.label}
                selected={checkin?.sleep_minutes === option.minutes}
                onClick={() =>
                  mutation.mutate({
                    sleep_minutes:
                      checkin?.sleep_minutes === option.minutes ? null : option.minutes,
                  })
                }
              >
                {option.label}
              </OptionButton>
            ))}
          </div>
        </div>

        {/* A energia saiu daqui: quem pergunta agora é a Rota, e a cada rota
            INICIADA o dia recebe a média das declarações. Perguntar nos dois
            lugares criaria duas fontes da mesma verdade — e a daqui seria a pior
            das duas, porque um valor único do dia não descreve quem estuda de
            manhã focado e à noite exausto.

            `routine_daily_checkins.energy` continua sendo a autoridade e segue
            alimentando as correlações desta mesma tela; só mudou quem escreve.
            Sono e plantão ficam: esses não mudam entre sessões do mesmo dia. */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Plantão
          </p>
          {/* O calendário prevê; o aluno confirma. Tratar previsão como vivido
              faria a leitura medir o planejamento em vez da realidade. */}
          <p className="mt-1 text-xs text-muted">
            {prefill.on_call_expected
              ? "Seu calendário prevê plantão hoje. Confirma?"
              : "Houve plantão hoje?"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <OptionButton
              selected={onCall === true}
              onClick={() =>
                mutation.mutate(
                  prefill.on_call_expected
                    ? { on_call_confirmed: onCall === true ? null : true }
                    : { on_call_unplanned: onCall !== true },
                )
              }
            >
              Sim
            </OptionButton>
            <OptionButton
              selected={onCall === false}
              onClick={() =>
                mutation.mutate({
                  on_call_confirmed: onCall === false ? null : false,
                  on_call_unplanned: false,
                })
              }
            >
              Não
            </OptionButton>
          </div>
        </div>
      </div>

      {mutation.isError ? (
        <p role="status" className="mt-3 text-xs text-danger">
          Não foi possível salvar agora. Toque de novo em instantes.
        </p>
      ) : null}
    </section>
  );
}
