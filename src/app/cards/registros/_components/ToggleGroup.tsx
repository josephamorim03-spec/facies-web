import { SegmentedToggle } from "@/components/ui/SegmentedToggle";

/**
 * Rótulo + controle segmentado, na horizontal.
 *
 * ⚠️ ISTO É UM ENVELOPE, e o controle é o `SegmentedToggle` canônico. O que
 * vivia aqui era um par de botões próprios que pintava o escolhido com
 * `border-primary bg-primary text-primaryInk` — o teal cheio que saiu das abas
 * em 2026-09-06 —, tinha alvo de ~22px (`py-0.5`) e nem `type="button"`, o que
 * o faria submeter qualquer formulário que o envolvesse.
 *
 * O envelope fica porque o rótulo visível ("Tempo:", "Peso:") é dele, não do
 * primitivo; os dois consumidores não mudam.
 */
export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  // O rótulo visível traz dois-pontos; o nome acessível não os quer.
  const nome = label.endsWith(":") ? label.slice(0, -1) : label;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="paper-eyebrow whitespace-nowrap">{label}</p>
      <SegmentedToggle<T>
        value={value}
        onChange={onChange}
        options={options}
        ariaLabel={nome}
        size="md"
      />
    </div>
  );
}
