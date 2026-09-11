import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "xs" | "sm" | "md";

// Acao CHAPADA: borda de 1px e fundo, sem relevo.
//
// O chanfro de duas camadas do Win98 (`.chrome-raised`) saiu junto com a
// identidade que o justificava. Ele nao sobrevive a troca de paleta: um bevel
// e' uma simulacao de luz, e com penumbra difusa de verdade no sistema, duas
// fontes de luz na mesma tela brigam. Aqui a elevacao e' a sombra, e o botao e'
// area de cor com limite de 1px.
//
// `ghost` continua sendo a excecao — acao terciaria e' texto que responde ao
// hover, sem caixa.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border border-primary bg-primary text-primaryInk hover:bg-[var(--color-primary-strong)] hover:border-[var(--color-primary-strong)]",
  secondary: "border border-edge bg-surface text-ink hover:bg-surfaceMuted",
  outline: "border border-primary bg-transparent text-primary hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]",
  ghost: "border border-transparent text-muted hover:bg-surfaceMuted hover:text-ink",
  danger: "border border-danger bg-danger text-primaryInk hover:brightness-[0.94]",
  success: "border border-success bg-success text-primaryInk hover:brightness-[0.94]",
};

/*
 * ⚠️ O PESO MORA AQUI, e não no BASE, porque ele depende do tamanho.
 *
 * O botão era `font-semibold` nos três, o que pintava **14/600** (46x, o
 * degrau mais repetido do app) e **12/600** — nenhum dos dois existe nas 22
 * artboards. O desenho pesa 500 a partir de 13px e nunca pesa abaixo disso:
 * ele tem 14/500, 15/500 e 16/500, e 12 só em 400.
 *
 * O que segura a hierarquia do botão primário não é a gordura da letra — é o
 * retângulo teal preenchido, que continua igual. Medido com
 * `scripts/spec-do-app.mjs`.
 */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "min-h-8 text-xs px-2.5 py-1",
  sm: "min-h-10 text-sm font-medium px-3 py-2",
  md: "min-h-11 text-sm font-medium px-4 py-2.5",
};

// O colchete (`.chrome-bracket`) saiu daqui junto com a identidade KROS/DOS:
// `[ COMECAR BLOCO ]` e idioma de terminal, e nenhum token o alcancava — a
// troca de paleta passava por cima dele sem mudar nada. A classe continua no
// CSS e nos outros call sites, porque a marca usa o colchete como device dela.
//
// O caixa-alta saiu pelo mesmo motivo. Rotulo de acao em sentenca le como
// instrumento clinico; em versal espacada, le como console.
const BASE =
  "paper-control inline-flex items-center justify-center gap-1.5 tracking-[0.01em] leading-none " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  // Foco pontilhado POR DENTRO: o anel de 2px por fora encostava na borda dura
  // do vizinho e sumia. `outline-offset` negativo o traz para dentro do relevo,
  // que e exatamente onde o Win98 o desenhava.
  "active:translate-y-px disabled:active:translate-y-0 " +
  // Foco POR FORA e continuo, nao pontilhado por dentro: o pontilhado era a
  // convencao do Win95. A Facies usa `outline: 2px solid var(--marca)` com
  // offset positivo, e com raio no sistema ele acompanha a forma do controle.
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary";

/*
 * ⚠️ LARGURA TOTAL NO TELEMÓVEL, automática a partir daqui.
 *
 * O primitivo não tinha noção nenhuma de largura, então cada chamador
 * escrevia `w-full` à mão — e quem se esquecia ficava com a ação encostada à
 * esquerda. O operador reportou o sintoma em várias telas de uma vez; a causa
 * era esta lacuna, não desleixo de quem chamou.
 *
 * Vale para a ação SOLITÁRIA. Fileira de vários controlos tem resposta própria
 * e mais antiga — `.fileira-de-controles`, em `globals.css` —, que os põe numa
 * grade de colunas iguais no telemóvel; aplicar `bloco` a cada um deles
 * empilharia sete botões de largura total.
 *
 * ⚠️ VIRA EM `sm` (640px), E ISTO JÁ ERA O PADRÃO DA CASA — eu é que tinha
 * escolhido `md` sem olhar. O operador apontou o `Pesquisar` do Caderno como
 * a referência, e ele (com o `Salvar`, ao lado) escrevia à mão exatamente
 * `w-full sm:w-auto`, dentro de uma `BottomActionBar` cuja própria fileira
 * passa a linha em `sm:flex-row`. Virar em `md` punha o botão de largura
 * total numa barra que já era uma linha, entre 640 e 767px.
 *
 * Quem precisa de outro ponto passa a largura por `className` e diz porquê —
 * é o caso do CTA do Hoje, cujo cartão só vira em `md:flex-row`.
 */
const BLOCO = "w-full sm:w-auto";

type ReceitaDeBotao = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  bloco?: boolean;
  className?: string;
};

/**
 * As classes do botão, sem o botão.
 *
 * Existe porque nem toda ação é um `<button>`: o CTA do Hoje é um `<Link>` e
 * pintava a receita inteira à mão a 12 classes de distância desta. Duas cópias
 * do mesmo desenho divergem — foi assim que ele ficou `min-h-12` enquanto o
 * primitivo era `min-h-11`.
 */
export function classesDeBotao({
  variant = "secondary",
  size = "sm",
  bloco = false,
  className = "",
}: ReceitaDeBotao = {}): string {
  return [BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], bloco ? BLOCO : "", className]
    .filter(Boolean)
    .join(" ");
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & ReceitaDeBotao & {
  loading?: boolean;
  leftIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button({
  variant = "secondary",
  size = "sm",
  bloco = false,
  loading = false,
  leftIcon,
  disabled,
  children,
  className = "",
  ...rest
}, ref) {
  return (
    <button
      ref={ref}
      {...rest}
      disabled={disabled || loading}
      className={classesDeBotao({ variant, size, bloco, className })}
    >
      {loading ? (
        <span className="opacity-60">...</span>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
        </>
      )}
    </button>
  );
});
