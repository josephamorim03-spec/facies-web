export const queryKeys = {
  studentToday: ["student", "today"] as const,
  studentAgendaAll: ["student", "agenda"] as const,
  studentAgenda: (dateFrom: string, dateTo: string) =>
    ["student", "agenda", dateFrom, dateTo] as const,
  questionBankPerformance: ["question-bank", "performance"] as const,
  questionBankSessions: (status?: string) =>
    ["question-bank", "sessions", status ?? "all"] as const,
  // Dado de referência: muda quando ingerimos uma banca nova, não por sessão.
  questionBankBoards: ["question-bank", "boards"] as const,
  cardsOverview: (area?: string) => ["cards", "overview", area ?? "all"] as const,
  planning: ["planning"] as const,
  // O objetivo do aluno muda quando ele o troca, nao durante a sessao — por
  // isso chave propria e `staleTime` longo em quem consulta.
  studentObjectives: ["student", "objectives"] as const,
  // A prova-alvo (`institution_key`) e o objetivo (`institution_id`) sao coisas
  // diferentes: a primeira e a chave que casa com a facies, a segunda e o
  // programa no catalogo. Chave propria porque quem precisa de uma raramente
  // precisa da outra.
  studentTargetExam: ["student", "target-exam"] as const,
  faciesDaBanca: (chave: string) => ["facies", "banca", chave] as const,
};

export const questionBankInvalidationKeys = [
  queryKeys.studentToday,
  queryKeys.studentAgendaAll,
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
