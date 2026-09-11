"use client";

import type { ComponentType, SVGProps } from "react";

/**
 * Os dois campos que as preferências usam — e que agora vivem em DUAS telas.
 *
 * Eles nasceram dentro de `preferencias/page.tsx`, quando havia uma tela só.
 * A divisão em "Minha semana" (rotina, que é insumo da Conduta) e
 * "Preferências" (identidade, que é de Você) deixaria duas cópias divergindo —
 * e cópia gêmea que "deve" concordar por convenção é o defeito que este
 * repositório já pagou uma vez, quando havia um `AREA_HEX` paralelo ao
 * `AREA_VAR` e a mesma área saía com duas cores na mesma sessão.
 */

type IconeSVG = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * O cabeçalho de seção: ícone, título e a frase que diz o que a seção decide.
 *
 * A descrição não é enfeite — ela é o que permite ao aluno saber se a seção lhe
 * interessa antes de ler os controles.
 */
export function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: IconeSVG;
  title: string;
  description: string;
}) {
  return (
    <header className="grid gap-2 border-b border-edge pb-4 sm:grid-cols-[1.5rem_minmax(0,1fr)]">
      <Icon className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
      <div>
        {/* Sem `text-base`: `.tela-app hN` é (0,2,1) e vence qualquer `text-*`
            (0,1,0), então a classe não pintava nada. O tamanho vem do sistema. */}
        <h2 className="font-semibold text-ink">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
    </header>
  );
}

export type TogglePreferenciaProps = {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
};

/**
 * A chave liga/desliga.
 *
 * O `<input>` é `sr-only` e o desenho vem do `peer-checked`: o alvo de toque é
 * a `<label>` inteira, e não o quadradinho — quem lê com leitor de tela recebe
 * uma caixa de seleção de verdade, com rótulo e descrição associados.
 */
export function PreferenceToggle({
  checked,
  label,
  description,
  onChange,
}: TogglePreferenciaProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 border-b border-edge py-4 last:border-b-0">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-1 block max-w-2xl text-xs leading-5 text-muted">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-6 w-11 shrink-0 bg-edge transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
      >
        <span className="absolute left-1 top-1 h-4 w-4 bg-paper transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
