"use client";

import type { ReactNode } from "react";
import { IconChevron } from "./CadernoSkeletons";

interface CadernoHeaderProps {
  tab: "registro" | "pesquisar";
  onToggleTab: () => void;
  rightAction?: ReactNode;
}

export function CadernoHeader({ tab, onToggleTab, rightAction }: CadernoHeaderProps) {
  return (
    <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
      <div className="flex justify-start">
        <span className="block h-7 w-7" aria-hidden="true" />
      </div>
      <div data-caderno-tab-center="true" className="relative flex justify-center">
        <button
          type="button"
          data-caderno-tab-toggle="true"
          onClick={onToggleTab}
          className="inline-flex max-w-[min(78vw,22rem)] items-center justify-center gap-1.5 bg-transparent px-1 py-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-ink"
          aria-label="Alternar modo do caderno"
        >
          <span data-caderno-tab-label="true" className="truncate">
            {tab === "registro" ? "REGISTRAR" : "PESQUISAR"}
          </span>
          <IconChevron
            data-caderno-tab-chevron="true"
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${tab === "pesquisar" ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {rightAction ?? <span className="block h-7 w-7" aria-hidden="true" />}
    </div>
  );
}
