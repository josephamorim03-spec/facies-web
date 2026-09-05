import Link from "next/link";

import { AREA_BORDER_CLASS, type DisplayArea } from "@/lib/areaIdentity";
import type { DiaRevisao, PaginaEducativa, TemaRevisao } from "@/lib/revisao";

/**
 * A navegação de um material de 42 assuntos numa página só.
 *
 * ## Por que ela precisou existir
 *
 * Enquanto eram 7 assuntos, rolar era navegação suficiente. Com 42 páginas
 * completas — cada uma com prosa, tabela, figura e checklist — a página passa de
 * quarenta telas de altura, e rolar deixou de dizer onde se está e quanto falta.
 *
 * ## Por que não tem JavaScript
 *
 * Tudo aqui é âncora e link renderizado no servidor. Um índice que destaca a
 * seção atual exigiria observar o scroll no cliente, e isso custaria hidratação
 * numa página que é lida em conexão ruim na véspera da prova — além de sumir na
 * impressão, que é justamente como boa parte deste material é consumida.
 *
 * O preço é honesto: o índice não sabe onde você está. Em troca, ele funciona
 * com JavaScript desligado, no papel e no leitor de tela, e o passo a passo do
 * rodapé cobre o "e agora?" que o destaque resolveria.
 */

export type EloDeAssunto = {
  posicao: number;
  subtema: string;
  area: DisplayArea;
};

/** A âncora de um assunto. Uma função só, para o índice e o rodapé nunca
 *  apontarem para ids diferentes — foi assim que um sumário anterior ficou com
 *  links que rolavam para o topo da página em silêncio. */
export function ancoraDoAssunto(posicao: number): string {
  return `tema-${posicao}`;
}

/**
 * O índice completo: sete dias, seis assuntos cada.
 *
 * Ele fica escondido na impressão porque no papel o sumário útil é o do começo
 * do documento, e um segundo índice no meio só gasta folha.
 */
export function IndiceDaRevisao({
  dias,
}: {
  dias: {
    dia: DiaRevisao;
    temas: { tema: TemaRevisao; pagina: PaginaEducativa }[];
  }[];
}) {
  return (
    <nav className="mt-6 print:hidden" aria-label="Índice dos assuntos">
      <ol className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {dias.map(({ dia, temas }) => (
          <li key={dia.dia}>
            <p className="paper-eyebrow">
              dia {dia.dia} · {temas.reduce((n, t) => n + t.tema.questoes.length, 0)} questões
            </p>
            <ol className="mt-2 space-y-1">
              {temas.map(({ tema, pagina }) => (
                <li key={tema.subtema}>
                  <Link
                    href={`#${ancoraDoAssunto(tema.posicao_previsao)}`}
                    className={`flex gap-2 border-l-2 py-0.5 pl-2 text-sm text-muted transition hover:text-ink ${
                      AREA_BORDER_CLASS[(pagina.area ?? "OU") as DisplayArea]
                    }`}
                  >
                    <span className="font-mono text-xs tabular-nums">
                      {tema.posicao_previsao}
                    </span>
                    <span className="min-w-0">{tema.subtema}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * O passo a passo no rodapé de cada assunto.
 *
 * Ele nomeia o destino em vez de dizer só "próximo": num material de véspera a
 * decisão de continuar depende de saber o que vem, e um rótulo genérico obriga a
 * rolar para descobrir — que é exatamente o trabalho que a navegação deveria
 * poupar.
 */
export function PassoAPasso({
  anterior,
  proximo,
  totalDeAssuntos,
  posicao,
}: {
  anterior: EloDeAssunto | null;
  proximo: EloDeAssunto | null;
  totalDeAssuntos: number;
  posicao: number;
}) {
  return (
    <nav
      className="mt-8 border-t border-edge pt-4 print:hidden"
      aria-label="Navegação entre assuntos"
    >
      <div className="flex flex-wrap items-stretch justify-between gap-3">
        {anterior ? (
          <Link
            href={`#${ancoraDoAssunto(anterior.posicao)}`}
            className="paper-control group min-w-0 max-w-[46%] rounded-control border border-edge px-3 py-2 transition hover:bg-surfaceMuted"
          >
            <span className="paper-eyebrow">anterior</span>
            <span className="mt-0.5 block truncate text-sm text-ink">
              {anterior.subtema}
            </span>
          </Link>
        ) : (
          <span />
        )}

        <Link
          href="#dias"
          className="paper-control self-center rounded-control border border-rule px-3 py-2 text-sm text-muted transition hover:text-ink"
        >
          <span className="font-mono tabular-nums">
            {posicao}/{totalDeAssuntos}
          </span>{" "}
          — voltar ao índice
        </Link>

        {proximo ? (
          <Link
            href={`#${ancoraDoAssunto(proximo.posicao)}`}
            className="paper-control group min-w-0 max-w-[46%] rounded-control border border-edge px-3 py-2 text-right transition hover:bg-surfaceMuted"
          >
            <span className="paper-eyebrow">próximo</span>
            <span className="mt-0.5 block truncate text-sm text-ink">
              {proximo.subtema}
            </span>
          </Link>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}
