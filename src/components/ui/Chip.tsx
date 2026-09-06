import type { ReactNode } from "react";

type Props = {
  selected?: boolean;
  onClick?: () => void;
  /** Cor do ponto à esquerda (ex.: cor de área). */
  leftDot?: string;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
};

const BASE =
  "inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs transition " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Chip único (neutro e selecionável). Unifica `.km-chip`/pills ad-hoc. */
export function Chip({ selected = false, onClick, leftDot, ariaLabel, className = "", children }: Props) {
  const tone = selected ? "border-primary bg-primary text-primaryInk" : "border-edge bg-surface text-muted";
  const dot = leftDot ? (
    <span className="h-2 w-2 shrink-0" style={{ backgroundColor: leftDot }} aria-hidden="true" />
  ) : null;

  if (typeof onClick === "function") {
    return (
      <button
        type="button"
        aria-pressed={selected}
        aria-label={ariaLabel}
        onClick={onClick}
        className={`${BASE} ${tone} cursor-pointer hover:text-ink ${className}`.trim()}
      >
        {dot}
        {children}
      </button>
    );
  }
  return (
    <span className={`${BASE} ${tone} ${className}`.trim()}>
      {dot}
      {children}
    </span>
  );
}
