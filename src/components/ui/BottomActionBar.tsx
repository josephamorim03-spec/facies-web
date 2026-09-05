import { type CSSProperties, type ReactNode } from "react";

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

const MOBILE_BAR_STYLE: CSSProperties = {
  // Assenta ACIMA da barra de abas — e SEGUE ela quando some.
  //
  // ⚠️ A altura entra MULTIPLICADA pela visibilidade. A barra de abas se
  // esconde pela direcao do scroll (`translateY(110%)`), e o elemento continua
  // no layout: o token de ALTURA nao muda, entao esta barra ficava ancorada a
  // 106px do rodape com nada embaixo. Medido em `/preferencias`: rolando ate o
  // fim, a barra de abas ia para 855 (fora da tela) e o botao primario ficava
  // parado em 641–738, com uma faixa morta de 106px sob ele.
  //
  // O token efetivo vale zero quando a barra saiu, e a acao encosta no rodape,
  // que e onde o polegar espera encontra-la.
  bottom: "calc(var(--nav-stack-height) * var(--nav-stack-shown))",
  // A safe-area so entra quando NAO ha navegacao embaixo — com ela presente,
  // quem ja consumiu a safe-area foi a propria barra de abas, e somar de novo
  // abriria ~34px de vazio num aparelho com notch. Com a barra ESCONDIDA nao ha
  // mais quem a consuma, e a conta volta a incluir a safe-area sozinha.
  paddingBottom:
    "calc(0.75rem + max(0px, env(safe-area-inset-bottom, 0px) - var(--nav-stack-height) * var(--nav-stack-shown)))",
  // Acompanha a barra de abas: mesma duracao e mesma curva, senao o botao salta
  // enquanto a outra desliza. A regra global de `prefers-reduced-motion` zera
  // esta transicao — e nesse modo a barra nunca se esconde, entao nao ha o que
  // acompanhar.
  transition: "bottom var(--motion-base) var(--ease-paper)",
};

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
        // `bottom` vem do style, nao da classe: e o token que decide.
        "fixed inset-x-0 z-40 border-t border-edge bg-paper px-4 pt-3",
        "md:static md:border md:bg-surface md:p-3",
        hiddenOnMobile ? "hidden md:block" : "",
        className,
      ].filter(Boolean).join(" ")}
      style={MOBILE_BAR_STYLE}
    >
      <div
        className={[
          "mx-auto flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
          maxWidthClassName,
          contentClassName,
        ].filter(Boolean).join(" ")}
      >
        {status ? <div className="min-w-0 text-sm">{status}</div> : null}
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:ml-auto">{children}</div>
      </div>
    </div>
  );
}
