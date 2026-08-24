type Props = {
  size?: "lg" | "sm";
  className?: string;
};

/**
 * A marca: **o acento agudo é o logotipo** (§3.4).
 *
 * A palavra em serifada de tela, o acento em petróleo e o resto em tinta. O
 * acento isolado vira o ícone — favicon, marcador de seção, sinal que precede
 * toda nota do sistema. É o menor elemento gráfico possível que ainda é
 * específico da palavra e do português, e continua legível a 16px, o que nenhum
 * ícone ilustrativo consegue.
 *
 * O que mudou em relação à marca anterior, e por quê:
 *
 * - **Sai o caixa-alta espaçado.** `KROSMED` com tracking de 0,3em é idioma de
 *   terminal; a marca nova é uma palavra escrita como palavra.
 * - **Saem os colchetes.** `[ KROSMED ]` era o device do KROS/DOS. O colchete
 *   morre com a identidade que o justificava.
 * - **Entra a serifada.** A mesma do enunciado clínico: a marca pertence ao
 *   repertório de impresso médico, não ao de console.
 *
 * O nome fica num único elemento de texto para o leitor de tela anunciar
 * "Fácies" de uma vez; o `<i>` do acento é puramente visual e não quebra a
 * leitura, porque navegadores concatenam texto de elementos inline.
 */
export function FaciesWordmark({ size = "lg", className = "" }: Props) {
  // O TAMANHO ESCOLHE O TOKEN, e nao o contrario.
  //
  // A 24-30px semibold o acento e TEXTO GRANDE pela WCAG (piso 3:1), e ai cabe
  // o `marcaDisplay`, que separa da tinta 4,41:1 em vez de 2,91:1. A 14px o
  // piso volta a 4,5:1 e o mesmo hex viraria violacao — por isso o `sm` fica
  // no `marca`. O calculo esta em globals.css; o guard que impede a troca
  // errada e o check-retro-geometry.
  const escala = size === "lg" ? "text-2xl sm:text-3xl" : "text-sm";
  const acento = size === "lg" ? "text-marcaDisplay" : "text-marca";

  return (
    <span
      className={`inline-flex items-baseline whitespace-nowrap font-serif font-semibold tracking-[-0.012em] text-ink ${escala} ${className}`.trim()}
    >
      F<i className={`not-italic ${acento}`}>á</i>cies
    </span>
  );
}

/**
 * A marca quando só cabe um caractere — a sidebar recolhida, por exemplo.
 *
 * É o `á` sozinho, e não uma inicial. A inicial de "Fácies" seria `F`, que não
 * é de ninguém; o acento é o que a §3.4 chama de logotipo, e é específico desta
 * palavra e desta língua. Aqui estava um `K` de KrosMed, sobrevivente da marca
 * anterior num canto que a varredura não alcançou.
 *
 * `aria-hidden` porque a marca completa já é anunciada pelo `<FaciesWordmark>`
 * do estado expandido, e a home tem seu próprio nome acessível na navegação.
 */
export function FaciesMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`font-serif text-base font-semibold leading-none text-marca ${className}`.trim()}
    >
      á
    </span>
  );
}
