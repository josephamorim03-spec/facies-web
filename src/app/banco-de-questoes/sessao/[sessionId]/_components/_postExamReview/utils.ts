import type { QuestionBankSessionItem } from "@/lib/api";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function microNodes(item: QuestionBankSessionItem) {
  return item.knowledge_nodes.filter((node) =>
    String(node.node_type ?? "").toLowerCase().includes("micro")
    || String(node.role ?? "").toLowerCase().includes("micro")
  );
}

export function formatAccuracy(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function accuracyColor(accuracy: number): string {
  return accuracy >= 0.7 ? "var(--color-success)" : accuracy >= 0.5 ? "var(--color-warning)" : "var(--color-danger)";
}
