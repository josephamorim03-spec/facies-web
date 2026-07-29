export const REVIEW_ROUTES = {
  activeReview: "/cards",
  adaptiveCards: "/cards",
  notebook: "/cards/registros",
  sessionHistory: "/evolucao",
  // Nome antigo ("revisão turbo"): mantido só como deep-link, redireciona
  // para adaptiveCards.
  turboCompatibility: "/revisao-turbo",
} as const;
