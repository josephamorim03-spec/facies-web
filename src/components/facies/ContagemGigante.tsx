"use client";

import { useSyncExternalStore } from "react";

/**
 * A contagem regressiva a 132px — a `.gigante` da v7.
 *
 * É o elemento mais alto da faixa petróleo, e o que dá urgência à seção da
 * aposta sem uma linha de texto: o número cresce de tamanho na mesma medida em
 * que o prazo encolhe. Trocá-lo por uma frase, como eu tinha feito, entrega a
 * informação e perde a função.
 *
 * ## O NÚMERO ENTRA DEPOIS DA HIDRATAÇÃO, e a data fica no servidor
 *
 * Esta página é estática e servida de CDN por semanas. `dias = alvo − hoje`
 * calculado no render congela no dia do build, e a tela passaria a dizer
 * "faltam 22 dias" para sempre — número errado numa página que vende medição é
 * pior que número nenhum.
 *
 * `useSyncExternalStore` é a ferramenta exata: snapshot do servidor é `null`,
 * o do cliente é a conta com o relógio dele, e o React não acusa divergência de
 * hidratação. Enquanto o número não chega, o que aparece é a DATA — que é fato
 * imutável e não depende do relógio de ninguém. O mesmo padrão de
 * `facies/Contagem.tsx`.
 *
 * `aria-hidden` no bloco todo: quem ouve recebe a frase completa logo abaixo
 * ("até a prova, em 13 de setembro"), e ouvir "63 dias" solto antes dela seria
 * um número sem sujeito.
 */

const MS_POR_DIA = 86_400_000;

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function porExtenso(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return iso;
  return `${dia} de ${MESES[mes - 1]}`;
}

export function ContagemGigante({ alvoIso }: { alvoIso: string }) {
  const dias = useSyncExternalStore(
    () => () => {},
    () => {
      const alvo = new Date(`${alvoIso}T00:00:00`);
      if (Number.isNaN(alvo.getTime())) return null;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      return Math.round((alvo.getTime() - hoje.getTime()) / MS_POR_DIA);
    },
    () => null,
  );

  const contando = dias !== null && dias > 0;

  return (
    <div>
      {/* 64px no celular e 132px a partir de 760px. O valor da v7 é 132; no
          celular ele estouraria a goteira de 20px com três algarismos. */}
      <p
        aria-hidden="true"
        className="font-mono text-[64px] leading-none tabular-nums sm:text-[132px]"
      >
        {contando ? dias : "—"}
        {/* `small` a .3em e 55% de opacidade — a unidade acompanha sem disputar
            com o número. Aqui a opacidade é legítima: é texto DECORATIVO que
            repete o que a frase abaixo diz por extenso. */}
        <span className="text-[0.3em] opacity-55"> dias</span>
      </p>
      <p className="apoio mt-4 max-w-[42ch] text-base">
        {contando ? (
          <>até a prova, em {porExtenso(alvoIso)}.</>
        ) : (
          <>A prova é em {porExtenso(alvoIso)}.</>
        )}{" "}
        Deixe seu e-mail e receba a leitura no dia seguinte ao gabarito, junto com o
        resultado da nossa aposta.
      </p>
    </div>
  );
}
