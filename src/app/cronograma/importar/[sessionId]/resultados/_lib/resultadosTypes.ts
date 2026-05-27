import type {
  AnalyzeSimulationErrorsProgressiveStatusItem,
  QuestionCognitiveAnalysis,
  StudyImportQuestion,
  WrongQuestionSummary,
} from "@/lib/api";

export type OptionLetter = "A" | "B" | "C" | "D" | "E";
export type CorrectionFilter = "all" | "correct" | "wrong";
export type CorrectionStatus = "correct" | "wrong";

export type NormalizedAnalysis = {
  essence: string | null;
  microDrillPrompt: string | null;
  microDrillAnswer: string | null;
  mainClue: string | null;
  killerDetail: string | null;
  errorsByLevel: {
    beginner: string | null;
    intermediate: string | null;
    advanced: string | null;
    byHaste: string | null;
    byOverconfidence: string | null;
  };
  reasoningLadder: string[];
  atomicEssentials: Array<{
    conceptId: string;
    label: string;
    transferStatement: string | null;
    priority: number | null;
    actionVerb: string | null;
    failureMode: string | null;
  }>;
};

export type CorrectionQuestion = {
  question_number: number;
  stem: string;
  options: Record<string, string>;
  status: CorrectionStatus;
  marked_option: OptionLetter | null;
  correct_option: OptionLetter | null;
  has_image: boolean;
  image_attachment_refs: string[];
  option_image_attachment_refs: Partial<Record<OptionLetter, string[]>>;
};

export type AnalysisQuestionInput = {
  question_number: number;
  question_id: string;
  stem: string;
  options: Record<string, string>;
  marked_option: OptionLetter | null;
  correct_option: OptionLetter | null;
  specialty?: string;
  theme?: string;
  source_exam?: string;
  instruction?: string;
  image_attachment_refs?: string[];
  has_image: boolean;
};

export type PendingExitTarget = {
  href: string;
};

export type ProgressiveAnalyzeMode = "single" | "batch";

export type ProgressiveSummary = {
  total: number;
  processing: number;
  analysis_ready: number;
  completed: number;
  failed: number;
  done: boolean;
};

export type ProgressiveByQuestion = Record<string, AnalyzeSimulationErrorsProgressiveStatusItem>;

export type AnalysisQuestionStatus =
  | "idle"
  | "processing"
  | "analysis_ready"
  | "completed"
  | "failed"
  | "ineligible";

export type AnalysisSelectionItem = {
  questionId: string;
  questionNumber: number;
  eligible: boolean;
  selected: boolean;
  runnable: boolean;
  status: AnalysisQuestionStatus;
  statusLabel: string;
  helperText: string;
};

export type BuildCorrectionQuestionArgs = {
  question: StudyImportQuestion;
  wrongSummary: WrongQuestionSummary | undefined;
};

export type NormalizeAnalysisInput = QuestionCognitiveAnalysis | null | undefined;
