"use client";

import { useSyncExternalStore } from "react";

/**
 * A contagem regressiva numa página ESTÁTICA.
 *
 * A armadilha: `dias = alvo - hoje` calculado no servidor congela no dia do
 * build. A página é gerada uma vez e servida de CDN por semanas — o contador
 * mostraria "faltam 22 dias" para sempre, e um número errado numa tela que vende
 * precisão é pior que nenhum número.
 *
 * Por isso a DATA é renderizada no servidor, onde é fato imutável, e a contagem
 * entra depois da hidratação. Enquanto ela não chega, a tela já está completa e
 * correta: quem tem JavaScript desligado lê a data, que é a informação que
 * importa.
 */

const MS_POR_DIA = 86_400_000;

function formatar(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const nomes = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${dia} de ${nomes[mes - 1]} de ${ano}`;
}

export function Contagem({
  sigla,
  aplicacao,
  cadernos,
  aplicacoesDiretas,
}: {
  sigla: string;
  aplicacao: string;
  cadernos: string;
  /** Quantas edições da PRÓPRIA prova já entraram na base. */
  aplicacoesDiretas: number;
}) {
  // `useSyncExternalStore` e nao `useEffect` + `setState`: e a ferramenta feita
  // exatamente para um valor que difere entre servidor e cliente. O snapshot do
  // servidor e `null` (a data basta), o do cliente e a conta com o relogio dele,
  // e o React nao acusa divergencia de hidratacao nem re-renderiza a toa.
  const dias = useSyncExternalStore(
    () => () => {},
    () => {
      const alvo = new Date(`${aplicacao}T00:00:00`);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      return Math.round((alvo.getTime() - hoje.getTime()) / MS_POR_DIA);
    },
    () => null,
  );

  return (
    <section className="mt-10 grid gap-6 rounded-surface border border-edge bg-surfaceMuted p-6 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="flex flex-col gap-1">
        {dias !== null && dias > 0 ? (
          <>
            <span className="font-mono text-5xl leading-none text-ink">{dias}</span>
            <span className="paper-eyebrow">
              dias até o {sigla}
            </span>
          </>
        ) : (
          <span className="paper-eyebrow">
            {sigla} · {formatar(aplicacao)}
          </span>
        )}
      </div>
      {/* A frase anterior — "a fácies desta edição é publicada aqui assim que a
          rotulagem fechar" — contradizia a página inteira. A fácies é a leitura
          da SÉRIE, e ela está logo acima, sobre 2.034 questões. Uma edição não
          tem fácies própria: ela confirma ou desloca a da série.

          O que acontece de fato é mais forte, e é o que o produto vende: a
          leitura de hoje repousa sobre uma aplicação direta, e em setembro
          passa a ter uma segunda para conferir se acertou. */}
      <p className="max-w-[52ch] text-base text-ink">
        A prova é em <b>{formatar(aplicacao)}</b>; os cadernos e gabaritos saem em{" "}
        <b>{formatar(cadernos)}</b>. Esta leitura foi feita sobre{" "}
        <b>
          {aplicacoesDiretas} aplicação
          {aplicacoesDiretas === 1 ? "" : "ões"} direta
          {aplicacoesDiretas === 1 ? "" : "s"}
        </b>{" "}
        do {sigla}; quando a rotulagem desta edição fechar,{" "}
        {aplicacoesDiretas === 1 ? "serão duas" : `serão ${aplicacoesDiretas + 1}`} — e
        dá para conferir aqui se ela acertou.
      </p>
    </section>
  );
}
