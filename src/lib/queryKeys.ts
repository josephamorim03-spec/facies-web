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
  // O INDICE (nome + chave das 138), nao a leitura de nenhuma delas. Chave
  // separada de `faciesDaBanca` porque sao volumes de ordem diferente: 27,2 KB
  // o indice inteiro contra 3,7 KB de mediana por banca (medidos sobre o
  // dataset das 138), e quem precisa da lista raramente ja tem a banca.
  indiceDeBancas: ["facies", "bancas"] as const,
  competencyMastery: ["student", "competency-mastery"] as const,
  // O plano vigente. Chave propria e `staleTime` longo: ele muda quando a
  // rotina muda ou quando o Hoje regenera, e nao a cada navegacao.
  studyPlanCurrent: ["study-plan", "current"] as const,
  // O trio que sustenta o cartao "a sua rotina" do `9c`. Uma chave so' porque as
  // tres viajam juntas e sozinhas nao dizem nada.
  rotinaDoPlano: ["study-plan", "rotina"] as const,
  // Log de auditoria: pagina e filtro entram na CHAVE, e nao numa dependencia
  // de `useCallback`. Com isso o react-query refaz a busca sozinho quando um
  // dos dois muda, e devolve do cache quando o operador volta para a pagina
  // anterior — que e' o gesto mais comum aqui.
  adminAuditLog: (page: number, action: string) =>
    ["admin", "audit-log", page, action || "todas"] as const,
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
