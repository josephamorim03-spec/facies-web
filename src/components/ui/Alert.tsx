import type { ReactNode } from "react";
import { TONE_ALERT, type Tone } from "@/lib/toneClasses";

export type AlertVariant = "danger" | "warning" | "success" | "info";

// Nomes legados do Alert → tom canônico (fonte única em lib/toneClasses).
const VARIANT_TONE: Record<AlertVariant, Tone> = {
  danger: "critical",
  warning: "attention",
  success: "positive",
  info: "info",
};

type AlertProps = {
  variant?: AlertVariant;
  /** Optional leading icon (already sized/colored to currentColor). */
  icon?: ReactNode;
  /** Optional trailing action (e.g. a "Tentar novamente" button). */
  action?: ReactNode;
  /**
   * Atalho para a acao mais comum: tentar de novo.
   *
   * ⚠️ EXISTE PORQUE O ERRO SEM SAIDA ERA A REGRA, nao a excecao. Seis
   * `<Alert variant="danger">` de tela de aluno diziam "Nao consegui carregar"
   * e ofereciam ZERO acoes -- o unico retry do app inteiro estava escrito a
   * mao dentro dos Graficos. Deixar a saida a cargo de quem chama garante que
   * ela sera esquecida; um atalho de uma prop garante que ela e barata.
   *
   * `action` continua existindo para o caso que precisa de outra coisa (um
   * link, um botao com outro verbo). Passar os dois usa `action`.
   */
  onRetry?: () => void;
  /** When provided, renders a dismiss (×) button that calls this. */
  onDismiss?: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * Theme-safe inline message box. Uses semantic border/text tokens over `bg-surface`
 * so it works in light and dark — replacing scattered `border-danger bg-surfaceMuted` patterns.
 */
export function Alert({ variant = "info", icon, action, onRetry, onDismiss, children, className = "" }: AlertProps) {
  const acao =
    action ??
    (onRetry ? (
      <button
        type="button"
        onClick={onRetry}
        className="rounded-control border border-edge bg-paper px-3 py-2 text-xs text-ink transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Tentar de novo
      </button>
    ) : null);
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 border bg-surface px-4 py-3 text-sm ${TONE_ALERT[VARIANT_TONE[variant]]} ${className}`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 text-ink">{children}</div>
      {acao && <div className="shrink-0">{acao}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar"
          className="-mr-1 -mt-0.5 shrink-0 p-1 text-muted transition-colors hover:bg-surfaceMuted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className="h-4 w-4" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
