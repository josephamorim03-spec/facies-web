export const queryKeys = {
  studentToday: ["student", "today"] as const,
  questionBankPerformance: ["question-bank", "performance"] as const,
  questionBankSessions: (status?: string) =>
    ["question-bank", "sessions", status ?? "all"] as const,
  cardsOverview: (area?: string) => ["cards", "overview", area ?? "all"] as const,
  planning: ["planning"] as const,
};

export const questionBankInvalidationKeys = [
  queryKeys.studentToday,
  queryKeys.questionBankPerformance,
  queryKeys.questionBankSessions(),
  queryKeys.questionBankSessions("active"),
  queryKeys.questionBankSessions("finalized"),
  queryKeys.planning,
] as const;

export async function invalidateLearningQueries(
  queryClient: { invalidateQueries: (filters: { queryKey: readonly unknown[] }) => Promise<unknown> },
) {
  await Promise.all(
    questionBankInvalidationKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
