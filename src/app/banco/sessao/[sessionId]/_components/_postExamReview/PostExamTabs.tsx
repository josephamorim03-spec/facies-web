"use client";

import type { PostExamReviewTab } from "./types";
import { cx } from "./utils";

type PostExamTabsProps = {
  tabs: { id: PostExamReviewTab; label: string; count?: number }[];
  activeTab: PostExamReviewTab;
  onSelect: (tab: PostExamReviewTab) => void;
};

export function PostExamTabs({ tabs, activeTab, onSelect }: PostExamTabsProps) {
  return (
    <div className="border-b border-edge">
      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={cx(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded-control bg-surfaceMuted px-1.5 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
