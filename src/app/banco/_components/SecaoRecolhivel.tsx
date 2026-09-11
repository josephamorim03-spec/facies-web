"use client";

import type { ReactNode } from "react";

import { IconChevronRight } from "./iconesDoBanco";

/**
 * Um passo do montador de sessão, recolhido por omissão.
 *
 * ## O que isto resolve
 *
 * ⚠️ **O Banco abria num formulário.** A 390px, os chips de área, a busca e uma
 * caixa de árvore de 512px comiam a dobra inteira, e "Começar N questões" ficava
 * ~2.000px abaixo. A tela cuja função é pôr o médico a responder abria pedindo
 * que ele configurasse.
 *
 * É divulgação progressiva, e a regra é da NN/g: adiar as opções secundárias
 * para focar a atenção nas primárias. Quem não quer filtrar nunca vê um filtro —
 * e quem quer, abre o passo e encontra tudo onde estava.
 *
 * ## O sumário carrega o estado
 *
 * Recolher só é honesto se o rótulo disser o que está lá dentro. Por isso o
 * `detail` não é enfeite: é o resumo do que aquele passo tem escolhido agora
 * ("Não feitas · Acesso Direto · todas as UF"). Sem ele, recolher esconde.
 *
 * ## O chevron
 *
 * `IconChevronRight` com `group-open:rotate-90` — traço reto de 2px, a mesma
 * linguagem do resto. Substitui o caractere `⌄` que o passo 2 usava sozinho:
 * um glifo de fonte não é um ícone do sistema, e girava 180° em vez de 90°.
 */
export function SecaoRecolhivel({
  id,
  step,
  title,
  detail,
  children,
}: {
  id: string;
  step: string;
  title: string;
  /** O que está escolhido aqui dentro, para o recolhido não esconder. */
  detail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details id={id} className="scroll-alvo group p-4 md:p-5">
      <summary className="paper-control min-h-11 cursor-pointer list-none marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <IconChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
            <div>
              <p className="paper-eyebrow text-primary">{step}</p>
              <h3 className="mt-0.5 font-semibold leading-tight text-ink">{title}</h3>
            </div>
          </div>
          {detail ? <p className="max-w-md text-right text-sm text-muted">{detail}</p> : null}
        </div>
      </summary>

      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}
