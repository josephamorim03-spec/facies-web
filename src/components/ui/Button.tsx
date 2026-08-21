import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "xs" | "sm" | "md";

// Sem `border`: o relevo e' desenhado por `inset box-shadow` DENTRO da caixa
// (ver `.chrome-raised`), entao uma borda por cima viraria contorno duplo.
//
// `ghost` e a excecao — acao terciaria nao se aperta, entao nao ganha relevo
// nem colchete; e' texto que responde ao hover.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "chrome-raised bg-primary text-primaryInk hover:brightness-[1.04]",
  secondary: "chrome-raised bg-surfaceMuted text-ink hover:brightness-[0.97]",
  outline: "chrome-raised bg-surface text-primary hover:bg-surfaceMuted",
  ghost: "text-muted hover:bg-surfaceMuted hover:text-ink",
  danger: "chrome-raised bg-danger text-primaryInk hover:brightness-[1.04]",
  success: "chrome-raised bg-success text-primaryInk hover:brightness-[1.04]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "min-h-8 text-xs px-2.5 py-1",
  sm: "min-h-10 text-xs px-3 py-2",
  md: "min-h-11 text-sm px-4 py-2.5",
};

// Os colchetes sao `::before`/`::after` (ver `.chrome-bracket` em globals.css),
// nunca texto: conteudo gerado nao entra no nome acessivel, entao o leitor de
// tela continua anunciando "Iniciar" e nao "colchete Iniciar colchete".
//
// `ghost` fica de fora — e o tratamento para acao terciaria, onde o colchete
// competiria com o botao primario ao lado.
const BASE =
  "paper-control inline-flex items-center justify-center gap-1.5 font-semibold uppercase tracking-[0.11em] leading-none " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  // Foco pontilhado POR DENTRO: o anel de 2px por fora encostava na borda dura
  // do vizinho e sumia. `outline-offset` negativo o traz para dentro do relevo,
  // que e exatamente onde o Win98 o desenhava.
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-dotted " +
  "focus-visible:[outline-offset:-4px] focus-visible:outline-current";

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
      className={`${BASE} ${variant === "ghost" ? "" : "chrome-bracket"} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
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
