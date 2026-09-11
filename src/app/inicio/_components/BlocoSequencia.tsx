"use client";

import type { OperationalStreak } from "@/lib/api";
import { Cartao, Numero } from "@/app/evolucao/_components/Cartao";
import { vozDaSequencia } from "../_lib/ordem";

/**
 * A SEQUÊNCIA — e a proteção do plantão, dita em voz alta.
 *
 * ## Uma regra que foi revertida, e o registo da reversão
 *
 * Este produto PROIBIA sequência que quebra, em texto e com argumento
 * (`Webapp - telas.dc.html:714`): *"o que existe aqui so acumula, nunca zera.
 * Sem sequencia que quebra, sem dia vermelho [...] um app que castiga isso e'
 * abandonado na terceira semana"*.
 *
 * O operador reverteu em 2026-09-10, escolhendo entre três opções a que dizia:
 * *"não quebrar em dia de plantão, mas ficar claro isso no front para o aluno,
 * deixar claro que aquele dia tá protegido"*. A reversão fica escrita aqui,
 * junto com a razão da regra antiga, para que a próxima leitura não a
 * "conserte" de volta sem saber que houve decisão.
 *
 * O argumento antigo continua verdadeiro para o caso que ele descrevia — a
 * sequência que quebra por ter dado plantão de 24h. É esse caso que a proteção
 * resolve, e é por isso que a proteção precisa de ser VISÍVEL: uma sequência
 * que não cai sem dizer por quê ensina que o número é decorativo, e na primeira
 * vez que ele cair o aluno vai achar que é defeito.
 *
 * ## Nada aqui é calculado
 *
 * `streak_days`, `weekly_study_days`, `weekly_protected_days`,
 * `active_protection` e `streak_at_risk` vêm todos do contrato — o motor é
 * `app/services/streaks.py`, que já sabe de dias protegidos desde antes desta
 * tela existir. O que faltava era a frase.
 */
export function BlocoSequencia({ streak }: { streak: OperationalStreak }) {
  const voz = vozDaSequencia({
    diaProtegido: streak.active_protection,
    sequenciaEmRisco: streak.streak_at_risk,
    diasProtegidosNaSemana: streak.weekly_protected_days,
  });

  // ⚠️ "5 de 7" LÊ COMO DUAS FALTAS quando duas delas foram plantão protegido.
  // O contrato traz `weekly_protected_days` na MESMA janela justamente para
  // isto — o comentário no tipo já o dizia, e nenhuma tela o usava.
  const cumpridos = streak.weekly_study_days + streak.weekly_protected_days;

  return (
    <Cartao
      pergunta="A sua sequência"
      medida="dias seguidos · semana atual"
      nota={voz.frase}
    >
      <div className="flex items-end gap-6">
        <Numero valor={streak.streak_days} unidade={streak.streak_days === 1 ? "dia" : "dias"} />
        <div className="min-w-0">
          <p className="font-mono text-dado-menor tabular-nums text-ink">
            {cumpridos}
            <span className="text-muted">/7</span>
          </p>
          <p className="paper-eyebrow mt-1">nesta semana</p>
        </div>
      </div>
      {/* ⚠️ O estado tem MARCA VISUAL, e não só a frase. A frase explica; a
          marca é o que se vê sem ler. Sem ela, o dia protegido e o dia em risco
          desenham exatamente igual — que é o mesmo que não ter proteção.

          🚨 **A PRIMEIRA VERSÃO PINTOU `bg-washSelecao` AQUI, e o guard
          reprovou-a com razão de fundo.** Este sistema tem DOIS washes, e os
          dois têm significado: seleção (frio) quer dizer *este aqui está
          escolhido*, atenção (quente) quer dizer *cuidado*. Um dia protegido
          não é nenhuma das duas coisas — pintá-lo de seleção seria dizer que o
          aluno o escolheu.

          Então: o risco leva o wash de ATENÇÃO, que é exatamente o que ele é. A
          proteção leva borda e tinta da marca, SEM preenchimento — marca, e não
          seleção. Não há wash de "tranquilize-se" neste sistema, e inventar um
          terceiro para uma tela seria criar um token com dois significados, que
          é como metade dos call sites passa a estar errada.

          A borda carrega o estado, e não o peso da fonte: abaixo de 13px este
          desenho nunca pesa (a regra está em `ui/Tabs.tsx`, com a medida). */}
      {voz.estado !== "firme" ? (
        <p
          className={[
            "mt-3 inline-flex items-center gap-2 rounded-control border px-3 py-1.5 text-xs",
            voz.estado === "protegida"
              ? "border-primary text-primary"
              : "border-warning bg-washAtencao text-ink",
          ].join(" ")}
        >
          {voz.estado === "protegida" ? "Dia protegido" : "Falta hoje"}
        </p>
      ) : null}
    </Cartao>
  );
}
