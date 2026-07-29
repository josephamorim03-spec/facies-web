"use client";

import { ArrowLeft, Search } from "lucide-react";

type CadernoHeaderProps = {
  tab: "registro" | "pesquisar";
  onEnterSearch: () => void;
  onExitSearch: () => void;
};

export function CadernoHeader({ tab, onEnterSearch, onExitSearch }: CadernoHeaderProps) {
  if (tab === "pesquisar") {
    return (
      <div className="flex min-h-11 items-center justify-center gap-3 border-y border-edge py-2">
        <button
          type="button"
          onClick={onExitSearch}
          aria-label="Voltar para registrar"
          className="paper-control inline-flex min-h-10 items-center gap-2 px-3 text-sm font-semibold text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Registrar
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-11 items-center justify-center gap-3 border-y border-edge py-2">
      <button
        type="button"
        onClick={onEnterSearch}
        aria-label="Pesquisar registros"
        className="paper-control inline-flex min-h-10 min-w-10 items-center justify-center text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
