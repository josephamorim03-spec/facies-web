"use client";

import type { OperationalStreak } from "@/lib/api";

type Props = {
  streak: OperationalStreak | null;
  loading?: boolean;
};

/**
 * Constância: **quantos dos últimos 7 dias**, e quantos deles foram protegidos.
 *
 * Aqui vivia um contador ilimitado de dias seguidos, com quatro marcos (3/7/14/
 * 30), cor por tier e recorde pessoal. Ele já era o desenho sóbrio — sem chama,
 * sem vermelho, sem o `setInterval` que passadas as 20h dizia "estude hoje para
 * manter" — e mesmo assim é o mecanismo errado.
 *
 * O motivo é estrutural, não estético: **um contador que zera na primeira falta
 * tem todo o seu valor em não ser quebrado.** Isso é aversão à perda, por mais
 * discreto que seja o número, e o §9 lista o contador de dias perdidos entre o
 * que não existe neste produto. Os marcos e o recorde são a mesma família: um
 * recorde pessoal é um badge com outro nome.
 *
 * A janela de 7 dias não tem o que quebrar. Uma falta custa um dia em sete e a
 * semana seguinte não carrega a dívida — que é como constância funciona em quem
 * faz plantão.
 *
 * E os protegidos são a metade que sustenta a outra: sem eles, "2 de 7" lê como
 * cinco desistências, e duas delas eram 12h de hospital. A diferença entre
 * acusar o aluno e reconhecer onde ele estava é esse segundo número.
 */
const JANELA_DIAS = 7;

function Trilho({ estudados, protegidos }: { estudados: number; protegidos: number }) {
  // Sete blocos, um por dia da janela. Preenchido = estudou; contornado =
  // protegido; vazio = nem um nem outro. É a mesma leitura do número ao lado,
  // e é o desenho que o resto do sistema usa para medida (`paper-meter`).
  return (
    <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: JANELA_DIAS }, (_, i) => {
        const cheio = i < estudados;
        const protegido = !cheio && i < estudados + protegidos;
        return (
          <span
            key={i}
            className={`h-2.5 w-1.5 rounded-control border ${
              cheio
                ? "border-primary bg-primary"
                : protegido
                  ? "border-primary bg-transparent"
                  : "border-edge bg-transparent"
            }`}
          />
        );
      })}
    </span>
  );
}

export function CronogramaStreakCard({ streak, loading = false }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center" data-testid="streak-skeleton">
        <div className="paper-skeleton h-3 w-40" />
      </div>
    );
  }

  if (streak === null) return null;

  const estudados = Math.max(0, Math.min(JANELA_DIAS, streak.weekly_study_days));
  const protegidos = Math.max(
    0,
    Math.min(JANELA_DIAS - estudados, streak.weekly_protected_days),
  );

  if (estudados === 0 && protegidos === 0) {
    return (
      <div
        className="flex items-center justify-center gap-2 text-xs text-muted"
        data-streak-mode="empty"
      >
        <Trilho estudados={0} protegidos={0} />
        {/* Sem "comece sua sequência": não há sequência a começar, e a frase
            criava a coisa que este componente deixou de medir. */}
        <span>Nenhum dia estudado nos últimos {JANELA_DIAS}</span>
      </div>
    );
  }

  return (
    <div className="flex justify-center" data-streak-mode="active">
      <span
        data-streak-days={estudados}
        data-streak-protected={protegidos}
        className="inline-flex items-center gap-2 rounded-control border border-edge bg-surface px-3 py-1 text-xs text-ink"
      >
        <Trilho estudados={estudados} protegidos={protegidos} />
        <span>
          <span className="tabular-nums">{estudados}</span> de {JANELA_DIAS} dias
          {protegidos > 0 ? (
            <>
              {" · "}
              <span className="tabular-nums">{protegidos}</span>{" "}
              {protegidos === 1 ? "protegido" : "protegidos"}
            </>
          ) : null}
        </span>
      </span>
    </div>
  );
}
