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

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "min-h-8 text-xs px-2.5 py-1",
  sm: "min-h-10 text-sm px-3 py-2",
  md: "min-h-11 text-sm px-4 py-2.5",
};

// O colchete (`.chrome-bracket`) saiu daqui junto com a identidade KROS/DOS:
// `[ COMECAR BLOCO ]` e idioma de terminal, e nenhum token o alcancava — a
// troca de paleta passava por cima dele sem mudar nada. A classe continua no
// CSS e nos outros call sites, porque a marca usa o colchete como device dela.
//
// O caixa-alta saiu pelo mesmo motivo. Rotulo de acao em sentenca le como
// instrumento clinico; em versal espacada, le como console.
const BASE =
  "paper-control inline-flex items-center justify-center gap-1.5 font-semibold tracking-[0.01em] leading-none " +
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

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button({
  variant = "secondary",
  size = "sm",
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
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
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
