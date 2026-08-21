"use client";

import { TAB_LIST_CLASS, TAB_TRIGGER_CLASS, TabCount, TabsScrollArea } from "@/components/ui/Tabs";

import type { PostExamReviewTab } from "./types";

type PostExamTabsProps = {
  tabs: { id: PostExamReviewTab; label: string; count?: number }[];
  activeTab: PostExamReviewTab;
  onSelect: (tab: PostExamReviewTab) => void;
};

/**
 * Filtro do conjunto revisado: erros, acertos, marcadas, descartadas.
 *
 * Reusa as classes do sistema de abas em vez do sublinhado proprio que morava
 * aqui — a mesma pilula do resto do app, com alvo de 44px no celular e a borda
 * em fade quando ha aba fora da tela. O estado ativo passa a ser ANUNCIADO:
 * antes so existia como cor de borda, e quem usa leitor de tela ouvia cinco
 * botoes iguais sem saber qual conjunto estava vendo.
 */
export function PostExamTabs({ tabs, activeTab, onSelect }: PostExamTabsProps) {
  return (
    <TabsScrollArea className="w-full">
      {({ ref, onScroll }) => (
        <div
          ref={ref}
          onScroll={onScroll}
          role="group"
          aria-label="Filtrar questões revisadas"
          className={TAB_LIST_CLASS}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={TAB_TRIGGER_CLASS}
            >
              {tab.label}
              {tab.count !== undefined && <TabCount>{tab.count}</TabCount>}
            </button>
          ))}
        </div>
      )}
    </TabsScrollArea>
  );
}
