import { type ReactNode } from "react";

export const BOTTOM_ACTION_BAR_RESERVE_CLASS =
  "pb-[calc(var(--nav-stack-height)_+_var(--bottom-action-bar-space)_+_1rem)] md:pb-0";

type BottomActionBarProps = {
  children: ReactNode;
  status?: ReactNode;
  maxWidthClassName?: string;
  className?: string;
  contentClassName?: string;
  hiddenOnMobile?: boolean;
};

/**
 * ⚠️ O `bottom`, o `padding-bottom` e a transição SAÍRAM daqui.
 *
 * Eram um `style` embutido, e por isso o contrato só valia nesta barra: os
 * botões flutuantes das outras telas escreviam o seu próprio `bottom` e
 * ignoravam a navegação. Agora são `.acima-da-barra-de-abas` em `globals.css`,
 * com a medição toda escrita lá, e este componente é o primeiro consumidor —
 * o refactor sem mudança de comportamento que prova que a extração é fiel.
 */

export function BottomActionBar({
  children,
  status,
  maxWidthClassName = "max-w-lg",
  className = "",
  contentClassName = "",
  hiddenOnMobile = false,
}: BottomActionBarProps) {
  return (
    <div
      data-bottom-action-bar="true"
      className={[
        "acima-da-barra-de-abas acima-da-barra-de-abas--faixa",
        "fixed inset-x-0 z-40 border-t border-edge bg-paper px-4 pt-3",
        // ⚠️ `md:static` VENCE o `bottom` da classe: utilitário do Tailwind
        // está numa camada posterior a `components` — e um elemento `static`
        // ignora `bottom` de qualquer forma. O `md:p-3` idem.
        "md:static md:border md:bg-surface md:p-3",
        hiddenOnMobile ? "hidden md:block" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div
        className={[
          "mx-auto flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
          maxWidthClassName,
          contentClassName,
        ].filter(Boolean).join(" ")}
      >
        {status ? <div className="min-w-0 text-sm">{status}</div> : null}
        {/* ⚠️ CENTRADO ABAIXO DE `sm`, e o motivo é do operador: no telemóvel a
            ação encostada à esquerda fica pior de ler e pior de clicar. Acima
            de `sm` o `ml-auto` volta a atirá-la para a direita, ao lado do
            estado — ali há largura para os dois. */}
        <div className="flex min-w-0 shrink-0 items-center justify-center gap-2 sm:ml-auto sm:justify-start">
          {children}
        </div>
      </div>
    </div>
  );
}
