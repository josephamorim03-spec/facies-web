import type { LucideIcon } from "lucide-react";

/**
 * As duas pecas de chrome desta tela: o interruptor de preferencia e o titulo
 * de seccao.
 *
 * Sairam da pagina porque nao tem nada a ver com preferencias -- sao forma. A
 * pagina passou dos mil linhas, e o invariante de tamanho existe justamente
 * para forcar esta separacao antes que ela fique cara: o que e' apresentacao
 * pura sai primeiro, e o que fica e' o comportamento.
 */

type ToggleProps = {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
};

export function PreferenceToggle({ checked, label, description, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 border-b border-edge py-4 last:border-b-0">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
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

export function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <header className="grid gap-2 border-b border-edge pb-4 sm:grid-cols-[1.5rem_minmax(0,1fr)]">
      <Icon className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      </div>
    </header>
  );
}

/**
 * O índice da tela — as gavetas à vista, antes do primeiro rolar.
 *
 * ⚠️ ESTA PÁGINA TEM SETE SEÇÕES e chama-se "Minha semana" no menu. Quem entra
 * por ali não tem como saber que a prova-alvo, os alertas e os Cards moram na
 * mesma página, abaixo de ~500px de formulário de rotina — e por isso o resto
 * do produto passou a apontar para cá com âncora (`#prova-alvo`), o que é o
 * sintoma, não a cura: uma âncora conserta UM caminho e deixa os outros seis.
 *
 * O índice é a cura barata: as sete existem, têm nome, e chegam a um toque. É
 * o mesmo recurso que as Definições do sistema usam quando a lista cresce.
 */
export function IndiceDaTela({
  secoes,
}: {
  secoes: { id: string; rotulo: string }[];
}) {
  return (
    <nav aria-label="Seções desta página" className="flex flex-wrap gap-2 py-4">
      {secoes.map((secao) => (
        <a
          key={secao.id}
          href={`#${secao.id}`}
          className="paper-control inline-flex min-h-9 items-center rounded-control border border-edge bg-surface px-3 text-nota text-muted transition-colors hover:text-ink"
        >
          {secao.rotulo}
        </a>
      ))}
    </nav>
  );
}
