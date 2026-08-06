import type { StudentAgendaItem } from "@/lib/api";

export function uniqueAgendaItems(
  items: StudentAgendaItem[],
  excludedOccurrenceId: string | null = null,
): StudentAgendaItem[] {
  const unique = new Map<string, StudentAgendaItem>();
  for (const item of items) {
    if (item.occurrence_id === excludedOccurrenceId) continue;
    if (!unique.has(item.occurrence_id)) unique.set(item.occurrence_id, item);
  }
  return [...unique.values()];
}
