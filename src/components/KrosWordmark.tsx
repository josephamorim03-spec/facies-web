"use client";

type Props = {
  /** `lg` para a tela de acesso; `sm` para chrome. */
  size?: "sm" | "lg";
  className?: string;
};

/**
 * Marca do KROS/DOS — tipográfica, estática, sem asset.
 *
 * Substitui o `KrosIntro`, que era um sprite PNG de 75 quadros com
 * `drop-shadow` e `will-change`. Aquilo pertencia à identidade "premium"; num
 * sistema cuja regra é *zero decoração sem função*, uma animação de abertura de
 * 844ms é exatamente a decoração que a regra proíbe — e o aluno a via a cada
 * visita ao login.
 *
 * A marca agora é o que o sistema já é: mono, maiúscula, entre colchetes. Não
 * carrega imagem nenhuma, então não tem o que faltar, não pesa no primeiro
 * paint, e responde ao tema pelos tokens em vez de um `filter: invert()`.
 *
 * O nome vive num único `<span>` para o leitor de tela anunciar "KROSMED" de uma
 * vez; os colchetes são `::before`/`::after` do `.chrome-bracket`, que não entram
 * no nome acessível.
 */
export function KrosWordmark({ size = "lg", className = "" }: Props) {
  const scale =
    size === "lg"
      ? "text-2xl sm:text-3xl tracking-[0.3em]"
      : "text-xs tracking-[0.22em]";

  return (
    <span
      className={`chrome-bracket inline-flex items-baseline font-semibold uppercase text-ink ${scale} ${className}`.trim()}
    >
      <span>
        Kros<span className="text-primary">Med</span>
      </span>
    </span>
  );
}
