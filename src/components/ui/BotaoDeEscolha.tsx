"use client";

import type { ReactNode } from "react";

/**
 * O BOTÃO DE ESCOLHA CANÔNICO — uma opção entre várias, do tamanho do polegar.
 *
 * ## Por que ele existe
 *
 * O operador pediu (2026-09-08) que os botões do app ficassem "similares aos
 * que estão no MAPA". A queixa é medível: o `/mapa` desenha as suas três abas
 * com `border-primary bg-washSelecao text-ink` sobre `border-rule`, e o Banco
 * desenhava a MESMA decisão — escolher um entre vários — com
 * `border-primary bg-surfaceMuted` sobre `border-edge`, sem altura mínima e com
 * outro raio.
 *
 * Não são variações de gosto; são três divergências que o olho lê como
 * "produtos diferentes":
 *
 * | | Mapa (a referência) | Banco (o que divergia) |
 * | --- | --- | --- |
 * | campo do escolhido | `bg-washSelecao` | `bg-surfaceMuted` |
 * | borda do não escolhido | `border-rule` | `border-edge` |
 * | alvo | `min-h-11` (44px) | sem piso |
 *
 * `wash-selecao` importa mais do que parece: é o mesmo campo do chip
 * (`.km-chip-active`), do `SegmentedToggle` e da etapa ativa do onboarding. Ele
 * é o "selecionado" desta identidade. `surfaceMuted` é o campo de SUPERFÍCIE —
 * usá-lo como estado faz o escolhido parecer um bloco de fundo, e contra
 * `surfaceMuted` o próprio `wash-selecao` mede 1,02:1, ou seja: onde a tela já
 * tem um fundo mudo, o escolhido desaparecia.
 *
 * ## Duas formas, um estado
 *
 * Sem `descricao` ele é a pastilha do Mapa: uma linha, centrada, para fileiras
 * de opções curtas. Com `descricao` ele é o cartão do Banco: alinhado à
 * esquerda, com a linha de apoio que diz o que a opção entrega. O ESTADO é o
 * mesmo nos dois, que é a única coisa que precisava de ser.
 *
 * ⚠️ `min-h-11` = 44px, o alvo mínimo de toque. Ele estava na pastilha e não no
 * cartão, o que é o inverso do que a ergonomia pede — o cartão é o que se
 * escolhe com o polegar em 390px.
 */

type Papel = "radio" | "aba";

type Props = {
  escolhido: boolean;
  onClick: () => void;
  children: ReactNode;
  /** A linha de apoio. Presente, o botão vira cartão; ausente, pastilha. */
  descricao?: ReactNode;
  /** Rodapé do cartão escolhido — o que vem a seguir, uma consequência. */
  rodape?: ReactNode;
  /**
   * `radio` para "escolha uma destas" (grupo com `role="radiogroup"`); `aba`
   * para alternar a leitura da mesma tela, onde a semântica correta é
   * `aria-pressed`.
   */
  papel?: Papel;
  disabled?: boolean;
  className?: string;
};

const BASE =
  "paper-control inline-flex min-h-11 items-center border transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary";

const ESCOLHIDO = "border-primary bg-washSelecao text-ink";
// `bg-transparent`, e não uma superfície própria: o botão herda o campo da
// secção onde está, e assim a mesma peça serve no papel e no bloco mudo.
const LIVRE = "border-rule bg-transparent text-ink hover:border-muted";

export function BotaoDeEscolha({
  escolhido,
  onClick,
  children,
  descricao,
  rodape,
  papel = "radio",
  disabled = false,
  className = "",
}: Props) {
  const forma = descricao
    ? "flex-col items-start gap-1 rounded-surface p-4 text-left"
    : "justify-center rounded-surface px-3.5 py-2 text-sm font-medium";
  const semantica =
    papel === "radio"
      ? ({ role: "radio", "aria-checked": escolhido } as const)
      : ({ "aria-pressed": escolhido } as const);

  return (
    <button
      type="button"
      {...semantica}
      disabled={disabled}
      onClick={onClick}
      className={`${BASE} ${forma} ${escolhido ? ESCOLHIDO : LIVRE} ${className}`.trim()}
    >
      {descricao ? (
        <>
          <span className="block text-sm font-medium">{children}</span>
          <span className="block text-xs leading-5 text-muted">{descricao}</span>
          {/* Só no escolhido, e por quem chama: anunciar a consequência nas
              três opções ao mesmo tempo transformaria a decisão numa tabela
              comparativa. */}
          {escolhido && rodape ? <span className="block">{rodape}</span> : null}
        </>
      ) : (
        children
      )}
    </button>
  );
}
