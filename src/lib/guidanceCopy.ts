// Camada pura de tradução pedagógica.
//
// Converte sinais e métricas internas do KrosMed (jargão: "readiness",
// "health score", "retention", enums de answer_status) em linguagem do
// estudante, em tom de tutor. Sem React, sem fetch, sem cor literal.
//
// É a fonte ÚNICA do vocabulário voltado ao aluno: as telas importam daqui em
// vez de escrever frases soltas, para a "voz do sistema" ficar consistente.
// Cada função é pura e testável isoladamente.

import type {
  QuestionBankAnswerStatus,
  QuestionBankResolutionMode,
} from "@/lib/api";

/** Carga semântica de uma orientação — a tela mapeia para token de cor/estado. */
export type GuidanceTone = "neutral" | "positive" | "attention" | "critical";

export type ReadinessLevel = "consolidando" | "atencao" | "critico";

export type GuidanceLabel = {
  /** Rótulo curto, para chip/eyebrow. */
  label: string;
  /** Frase em tom de tutor, para prosa (font-serif na UI). */
  phrase: string;
  tone: GuidanceTone;
};

const READINESS: Record<ReadinessLevel, GuidanceLabel> = {
  consolidando: {
    label: "Firme",
    phrase: "Consolidando esta área.",
    tone: "positive",
  },
  atencao: {
    label: "Pede atenção",
    phrase: "Começando a escapar — revisite.",
    tone: "attention",
  },
  critico: {
    label: "Frágil",
    phrase: "Área frágil — foco rende mais aqui.",
    tone: "critical",
  },
};

/** Prontidão por área ("readiness/level") → rótulo e frase do estudante. */
export function readinessLabel(level: ReadinessLevel): GuidanceLabel {
  return READINESS[level];
}

export type CognitiveAutopsyCopy = GuidanceLabel & {
  forcingQuestion: string;
  rule: string;
};

const COGNITIVE_AUTOPSY: Record<string, CognitiveAutopsyCopy> = {
  impulsive_haste: {
    label: "Respondeu rápido demais",
    phrase: "O erro parece ter vindo de pressa antes de completar a leitura.",
    forcingQuestion: "Qual dado do enunciado você ainda precisava conferir?",
    rule: "Antes de marcar, releia idade, tempo de evolução, negações e exceções.",
    tone: "attention",
  },
  premature_closure: {
    label: "Fechou cedo",
    phrase: "Você provavelmente aceitou uma hipótese atraente cedo demais.",
    forcingQuestion: "Que achado faria você abandonar essa primeira hipótese?",
    rule: "Obrigue uma alternativa contrária antes de confirmar a resposta.",
    tone: "attention",
  },
  distractor_seduction: {
    label: "Caiu no distrator",
    phrase: "A alternativa escolhida parecia boa, mas desviava do alvo da questão.",
    forcingQuestion: "O que essa alternativa explicava e o que ela deixava sem explicar?",
    rule: "Compare a alternativa com o dado central, não apenas com um detalhe familiar.",
    tone: "attention",
  },
  fine_discrimination_gap: {
    label: "Faltou discriminação fina",
    phrase: "Você chegou perto, mas faltou separar duas alternativas parecidas.",
    forcingQuestion: "Qual diferença mínima separava as duas finalistas?",
    rule: "Nomeie o critério que desempata antes de marcar.",
    tone: "attention",
  },
  overconfident: {
    label: "Confiou demais",
    phrase: "A confiança veio maior que a evidência disponível.",
    forcingQuestion: "O que justificava tanta confiança nessa escolha?",
    rule: "Se a justificativa não couber em uma frase, reduza a confiança.",
    tone: "attention",
  },
  knowledge_gap: {
    label: "Faltou base",
    phrase: "O erro aponta uma base que ainda não estava firme o suficiente.",
    forcingQuestion: "Qual conceito-base precisava estar automático aqui?",
    rule: "Revise o conceito curto antes de buscar questões mais difíceis.",
    tone: "critical",
  },
  implementation_gap: {
    label: "Faltou aplicar",
    phrase: "Você reconhecia a base, mas ela não virou decisão na hora da questão.",
    forcingQuestion: "Em que passo a teoria deixou de virar conduta?",
    rule: "Treine casos irmãos para transformar conhecimento em decisão.",
    tone: "attention",
  },
};

export function cognitiveAutopsyCopy(tag: string | null | undefined): CognitiveAutopsyCopy | null {
  const key = String(tag ?? "").trim();
  if (!key || key === "unclassified") return null;
  return COGNITIVE_AUTOPSY[key] ?? null;
}

export function cognitivePatternSummary(
  tag: string | null | undefined,
  count: number,
): GuidanceLabel | null {
  const copy = cognitiveAutopsyCopy(tag);
  if (!copy) return null;
  return {
    label: copy.label,
    phrase: `${copy.phrase} Esse padrão apareceu ${count} vezes nesta sessão.`,
    tone: copy.tone,
  };
}

/** "health_score_pct" (0–100) → estado legível, sem medidor de dashboard. */
export function healthStatement(pct: number | null | undefined): GuidanceLabel {
  if (pct == null || Number.isNaN(pct)) {
    return {
      label: "Sem base ainda",
      phrase: "Ainda não há estudo suficiente para avaliar sua consistência.",
      tone: "neutral",
    };
  }
  if (pct >= 75) {
    return {
      label: "Consistente",
      phrase: "Estudo consistente.",
      tone: "positive",
    };
  }
  if (pct >= 50) {
    return {
      label: "No ritmo",
      phrase: "Bom ritmo, com pontos a reforçar.",
      tone: "attention",
    };
  }
  return {
    label: "Irregular",
    phrase: "Estudo irregular — firme a rotina.",
    tone: "critical",
  };
}

/** "retention" (0–1) → frase de memória ("sua memória deste tema caiu"). */
export function memoryPhrase(retention: number | null | undefined): GuidanceLabel {
  if (retention == null || Number.isNaN(retention)) {
    return {
      label: "Sem leitura",
      phrase: "Ainda sem leitura de memória neste tema.",
      tone: "neutral",
    };
  }
  if (retention < 0.4) {
    return {
      label: "Memória caiu",
      phrase: "Memória caiu — revise agora.",
      tone: "critical",
    };
  }
  if (retention < 0.65) {
    return {
      label: "Começando a esquecer",
      phrase: "Começando a esquecer.",
      tone: "attention",
    };
  }
  return {
    label: "Memória firme",
    phrase: "Memória firme.",
    tone: "positive",
  };
}

const ANSWER_STATUS: Record<QuestionBankAnswerStatus, string> = {
  unanswered: "Questões novas",
  answered: "Já respondidas",
  correct: "Que acertei",
  wrong: "Que errei",
  all: "Todas",
  unanswered_or_wrong: "Novas e erradas",
  needs_review: "Para revisar",
  near_miss: "Quase acertei",
};

/** Enum de filtro de respostas → rótulo do estudante (não o termo técnico). */
export function answerStatusLabel(status: QuestionBankAnswerStatus): string {
  return ANSWER_STATUS[status] ?? "Todas";
}

/** Modo de resolução → rótulo claro (sem "resolution_mode"). */
export function resolutionModeLabel(mode: QuestionBankResolutionMode): string {
  return mode === "simulation" ? "Simulado" : "Treino com correção";
}

/** Contagem de revisões no ponto → frase com plural correto. */
export function dueCountPhrase(count: number): string {
  if (count <= 0) return "Nada vencido por agora";
  if (count === 1) return "1 questão no ponto de revisão";
  return `${count} questões no ponto de revisão`;
}

/** Atraso de uma revisão (dias) → frase de orientação, não rótulo seco. */
export function overduePhrase(days: number): string {
  if (days <= 0) return "No ponto de hoje";
  if (days === 1) return "Passou do ponto ontem";
  return `Passou do ponto há ${days} dias`;
}
