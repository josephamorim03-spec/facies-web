"use client";

import { SegmentedToggle } from "@/components/ui/SegmentedToggle";

type CadernoHeaderProps = {
  tab: "registro" | "pesquisar";
  onEnterSearch: () => void;
  onExitSearch: () => void;
};

const OPTIONS = [
  { value: "registro" as const, label: "Novo registro" },
  { value: "pesquisar" as const, label: "Pesquisar registros" },
];

/**
 * Os dois modos de Registros ficam sempre visíveis. O controle anterior era
 * assimétrico -- lupa sem rótulo para entrar, seta com rótulo para voltar --
 * o que escondia metade da tela atrás de um ícone.
 */
export function CadernoHeader({ tab, onEnterSearch, onExitSearch }: CadernoHeaderProps) {
  return (
    <div className="flex min-h-11 items-center justify-center gap-3 border-y border-edge py-2">
      <SegmentedToggle
        value={tab}
        onChange={(next) => (next === "pesquisar" ? onEnterSearch() : onExitSearch())}
        options={OPTIONS}
        ariaLabel="Modo dos registros"
        size="md"
      />
    </div>
  );
}
