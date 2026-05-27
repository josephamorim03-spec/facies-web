"use client";

import { useMemo, useState } from "react";

import { DirectedStudyListItem, ReviewTask } from "@/lib/api";

type UseCronogramaSearchFiltersParams = {
  tasks: ReviewTask[];
  doneTasks: ReviewTask[];
  studies: DirectedStudyListItem[];
};

export function useCronogramaSearchFilters({
  tasks,
  doneTasks,
  studies,
}: UseCronogramaSearchFiltersParams) {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const allThemes = useMemo(() => {
    const set = new Set<string>();
    for (const s of studies) set.add(s.theme);
    for (const t of [...tasks, ...doneTasks]) set.add(t.theme);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [studies, tasks, doneTasks]);

  const searchSuggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    return allThemes
      .filter((theme) => {
        const themeWords = theme.toLowerCase().split(/\s+/);
        return words.every((qw) => themeWords.some((tw) => tw.startsWith(qw)));
      })
      .slice(0, 8);
  }, [searchInput, allThemes]);

  const filteredTasksForDisplay = tasks;

  function handleSearchInputChange(value: string): void {
    setSearchInput(value);
    setSearchQuery("");
  }

  function clearSearch(): void {
    setSearchInput("");
    setSearchQuery("");
  }

  function selectSearchSuggestion(theme: string): void {
    setSearchInput(theme);
    setSearchQuery(theme.toLowerCase());
  }

  return {
    searchInput,
    searchQuery,
    searchSuggestions,
    filteredTasksForDisplay,
    handleSearchInputChange,
    clearSearch,
    selectSearchSuggestion,
  };
}
