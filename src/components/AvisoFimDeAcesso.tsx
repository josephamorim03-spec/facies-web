"use client";

/**
 * O aviso de que o acesso está perto de acabar.
 *
 * ## Por que ele aparece TARDE, e não sempre
 *
 * A limitação é dita uma vez, na home: "o primeiro mês é por nossa conta". Um
 * contador permanente no topo do app diria a mesma coisa cinquenta vezes, e
 * transformaria a ferramenta de estudo num lembrete de cobrança — para alguém
 * que está estudando para uma prova, e cuja atenção é o produto.
 *
 * Então o produto fica quieto até faltar pouco. `DIAS_DE_AVISO` é a fronteira.
 *
 * ## Por que ele não é dispensável
 *
 * Um "x" transformaria o aviso em algo que o aluno some por reflexo, e ele
 * descobriria o fim do acesso ao topar no portão. Perto do fim, o aviso é
 * informação que ele precisa ter — a mesma razão pela qual ele não aparece
 * antes.
 *
 * ## A aritmética é de DIA, não de milissegundo
 *
 * "Faltam 3 dias" tem de virar "amanhã" e "hoje" nos dias certos. Comparar
 * instantes faria "faltam 0 dias" aparecer durante 24 horas antes do fim, e
 * `Math.ceil` sobre a diferença bruta diria "1 dia" para algo que vence em dez
 * minutos. Por isso a conta é feita sobre datas normalizadas à meia-noite local.
 */

import Link from "next/link";
import { useMemo } from "react";

/** A partir de quantos dias restantes o aviso aparece. */
export const DIAS_DE_AVISO = 7;

function diasRestantes(expiraEm: string): number | null {
  const fim = new Date(expiraEm);
  if (Number.isNaN(fim.getTime())) return null;
  const hoje = new Date();
  const fimDoDia = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  const hojeDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round((fimDoDia.getTime() - hojeDoDia.getTime()) / MS_POR_DIA);
}

function frase(dias: number): string {
  if (dias <= 0) return "Seu acesso termina hoje.";
  if (dias === 1) return "Seu acesso termina amanhã.";
  return `Seu acesso termina em ${dias} dias.`;
}

export function AvisoFimDeAcesso({ expiraEm }: { expiraEm?: string | null }) {
  const dias = useMemo(() => (expiraEm ? diasRestantes(expiraEm) : null), [expiraEm]);

  if (dias === null || dias > DIAS_DE_AVISO || dias < 0) return null;

  return (
    <div
      role="status"
      className="border-b border-edge bg-surfaceMuted px-4 py-2.5 text-sm text-ink"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold">{frase(dias)}</span>
        <span className="text-muted">
          As assinaturas ainda não abriram — avisamos você antes, e nada é cobrado sem
          você contratar.
        </span>
        <Link
          href="/conta"
          className="ml-auto underline underline-offset-4 hover:text-ink"
        >
          Minha conta
        </Link>
      </div>
    </div>
  );
}
