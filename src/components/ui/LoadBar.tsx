"use client";

type LoadBarProps = {
  /**
   * Percentual conhecido (0–100). Sem ele a barra fica indeterminada e os
   * blocos marcham — o que e honesto: nao ha progresso para mostrar.
   */
  value?: number;
  /** Rotulo lido por leitor de tela. Obrigatorio: a barra sozinha nao diz o que carrega. */
  label: string;
  className?: string;
};

/**
 * Barra de progresso segmentada — a UNICA linguagem de carregamento do app.
 *
 * Antes conviviam quatro: 204 skeletons pulsantes, 25 `animate-pulse`, um
 * quadrado girando e meia duzia de textos "carregando...". Quatro dialetos para
 * a mesma frase, e nenhum deles existia na epoca que a interface cita.
 *
 * O desenho vem do 98.css: blocos de 12px com 2px de folga, feitos com um
 * `linear-gradient` repetido — sem imagem, sem sprite, e escala em qualquer
 * largura.
 *
 * `role="progressbar"` com `aria-valuenow` so quando ha valor: anunciar 0% numa
 * espera indeterminada e pior do que nao anunciar nada.
 */
export function LoadBar({ value, label, className = "" }: LoadBarProps) {
  const determinate = typeof value === "number" && Number.isFinite(value);
  const pct = determinate ? Math.min(100, Math.max(0, value)) : 100;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={determinate ? Math.round(pct) : undefined}
      className={`load-bar ${className}`}
    >
      <span
        className={`load-bar__fill ${determinate ? "" : "load-bar__fill--indeterminate"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

type LoadingLineProps = {
  /** O que esta carregando, na voz do aluno: "Montando sua sessao". */
  children: React.ReactNode;
  className?: string;
};

/**
 * Espera curta em uma linha: rotulo + cursor de bloco piscando.
 *
 * Para quando reservar area seria mentira sobre o layout que vem — um botao
 * enviando, uma lista curta buscando. Espera longa ou area grande usa `LoadBar`.
 *
 * `aria-live="polite"`: quem nao ve a barra precisa saber que algo esta em
 * curso, mas nunca ao ponto de interromper o que esta sendo lido.
 */
export function LoadingLine({ children, className = "" }: LoadingLineProps) {
  return (
    <p
      aria-live="polite"
      className={`flex items-center text-sm text-muted ${className}`}
    >
      <span>{children}</span>
      {/* Barra fina no lugar do cursor de bloco piscando. O cursor era teatro de
          terminal; a barra e o mesmo sinal no vocabulario do sistema. */}
      <span className="load-bar ml-2 w-8 shrink-0" aria-hidden="true">
        <span className="load-bar__fill load-bar__fill--indeterminate" />
      </span>
    </p>
  );
}
