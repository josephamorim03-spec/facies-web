import type {
  QuestionBankFinalizeResult,
  QuestionBankSession,
} from "@/lib/api";

export type NodeDiagnosis = {
  knowledge_node_id: string;
  node_name: string | null;
  node_type?: string | null;
  correct: number;
  wrong: number;
  accuracy: number;
};

export type SessionDiagnosis = {
  session_id: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  nodes: NodeDiagnosis[];
  weak_node_ids: string[];
  charge_pattern_breakdown: Record<string, number>;
  answer_type_breakdown: Record<string, number>;
  reasoning_type_breakdown: Record<string, number>;
  error_reasons: Record<string, number>;
  cognitive_breakdown?: Record<string, number>;
  dominant_cognitive_tag?: string | null;
  confident_and_wrong: number;
  doubtful_and_wrong: number;
  metacognitive_accuracy: number | null;
  impulsive_count: number;
  overconfident_count: number;
};

export type PostExamReviewTab = "resumo" | "erros" | "acertos" | "marcadas" | "descartadas";

export type PostExamReviewProps = {
  session: QuestionBankSession;
  finalizeOut?: QuestionBankFinalizeResult | null;
  busy?: boolean;
  onFinalize?: () => void;
  onSessionChange?: (session: QuestionBankSession) => void;
};
