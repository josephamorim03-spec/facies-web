// Re-exports from domain modules
// This barrel file ensures zero breaking changes for existing imports.
// New code should import directly from "./api/domains/<domain>".

export {
  api,
  authHeader,
  getAPIErrorCode,
  getAPIErrorDetail,
  getAPIErrorMessage,
} from "./api/shared/http";
export type { APIError, ClientCachePolicy } from "./api/shared/http";

// Shared types
export type { FsrsReviewRating, StudyKind, FullExamType } from "./api/types";

// Auth domain
export {
  signupLocalAccount,
  loginLocalAccount,
  verifyLocalEmail,
  forgotLocalPassword,
  resendLocalVerification,
  resetLocalPassword,
} from "./api/domains/auth";
export type {
  AuthSignupResponse,
  AuthLoginResponse,
  AuthVerifyEmailResponse,
  AuthForgotPasswordResponse,
  AuthResendVerificationResponse,
  AuthResetPasswordResponse,
} from "./api/domains/auth";

// Operational domain
export {
  createOperationalNote,
  listOperationalNotes,
  getTurboAreaStats,
  getOperationalTurboOverview,
  getOperationalStreak,
  fetchTurboIntervalPreview,
  startOperationalTurboSession,
  submitOperationalTurboSessionAction,
  navigateOperationalTurboSession,
  repeatOperationalTurboSession,
  getOperationalTurboSessionDailyCompletedCards,
  presignOperationalAttachment,
  putOperationalAttachmentBinary,
  resolveOperationalAttachmentDisplayUrl,
  deleteOperationalNote,
  updateOperationalNote,
  inferOperationalAttachmentContentType,
} from "./api/domains/operational";
export type {
  OperationalSourceType,
  OperationalQuestionOutcome,
  OperationalSort,
  OperationalAreaCode,
  OperationalTurboResult,
  OperationalNoteItem,
  OperationalStreak,
  OperationalTurboAreaStatsItem,
  OperationalTurboAreaStats,
  OperationalTurboReasonCode,
  OperationalTurboReasonCount,
  OperationalTurboAreaSummaryItem,
  OperationalTurboCardContext,
  OperationalTurboPriorityPreviewItem,
  OperationalTurboOverview,
  OperationalTurboReviewOut,
  OperationalTurboReviewChange,
  OperationalTurboSessionSnapshot,
  OperationalTurboSessionDailyCardsItem,
  OperationalTurboSessionDailyCards,
  OperationalAttachmentPresignOut,
  TurboIntervalPreview,
  OperationalNoteUpdatePayload,
} from "./api/domains/operational";

// Misc domain
export {
  getFsrsConfig,
  putFsrsConfig,
  getWeeklyTimeline,
} from "./api/domains/misc";
export type {
  FsrsConfig,
  WeeklyTimelineArea,
  WeeklyTimelineWeek,
  WeeklyTimeline,
} from "./api/domains/misc";

// Notifications domain
export {
  getVapidPublicKey,
  saveNotificationSubscription,
  deleteNotificationSubscription,
  getNotificationSettings,
  updateNotificationSettings,
} from "./api/domains/notifications";
export type { NotificationSettings } from "./api/domains/notifications";

// Starter domain
//
// `listItems`, `createItem`, `submitReview` e `seedDemo` sairam: nenhum call
// site em `web/src`, `web/tests` ou `web/scripts`. Eram o andaime do starter
// (`/items`, `/reviews`, `/demo/seed`), e a URL de `listItems` tinha o `?`
// trocado por um `o` acentuado — quebrada havia tempo bastante para provar que
// ninguem a chamava. Ver `scripts/check-mojibake.mjs`, que hoje pega a classe.
export { me } from "./api/domains/starter";

// Study Import domain
export {
  getProfile,
  updateProfile,
  listDirectedStudies,
  updateDirectedStudy,
  deleteDirectedStudy,
  getStudyImportSession,
  listStudyImportSessionQuestions,
  updateStudyImportQuestionState,
  finalizeStudyImportSession,
  getSessionOverrides,
  setQuestionOverride,
  deleteQuestionOverride,
  listReviewTasks,
  getReviewAgenda,
  updateReviewTask,
  autoRescheduleReviewTask,
  previewAutoRescheduleReviewTask,
} from "./api/domains/study-import";
export type {
  UserProfile,
  ImportSessionStatus,
  ImportQuestionOption,
  StudyImportQuestionState,
  StudyImportQuestion,
  StudyImportQuestionPage,
  StudyImportSession,
  BackgroundJob,
  BackgroundJobAccepted,
  BackgroundJobStatus,
  StudyImportSessionCreateResult,
  WrongQuestionSummary,
  ReviewTask,
  ReviewAgenda,
  FinalizationResult,
  DirectedStudyOut,
  QuestionOverrideResult,
  SessionOverridesResult,
  DirectedStudyListItem,
  DirectedStudyEditImpactPreview,
  StudyTopicConsistency,
} from "./api/domains/study-import";

// Question Bank domain
export {
  browseQuestionBankTopics,
  browseQuestionBankQuestions,
  setQuestionBankBookmark,
  createQuestionTextHighlight,
  deleteQuestionTextHighlight,
  getQuestionBankBootstrap,
  listQuestionBankBoards,
  listQuestionBankInstitutions,
  listQuestionBankFacets,
  previewQuestionBankAvailability,
  createQuestionBankSession,
  previewKros,
  deleteQuestionBankSession,
  listQuestionBankSessions,
  getQuestionBankSession,
  setQuestionBankSessionFeedbackPolicy,
  getQuestionBankLongitudinalDiagnosis,
  getSessionCorrections,
  recordQuestionBankAttempt,
  recordQuestionBankEvents,
  getQuestionBankGuidedReview,
  submitQuestionBankGuidedReview,
  recordQuestionBankCorrection,
  revealAllQuestionBankFeedback,
  revealQuestionBankItemFeedback,
  getQuestionBankReasoningReview,
  answerQuestionBankReasoningCheckpoint,
  attributeQuestionBankReasoningReview,
  reportQuestionBankSessionItem,
  setQuestionBankSessionItemExclusion,
  finalizeQuestionBankSession,
  reportQuestionProblem,
  requestQuestionBankAICorrection,
  getQuestionBankAiRequestPreview,
  getQuestionBankAiRequestStatus,
  getQuestionBankPerformance,
  getQuestionBankExamDebrief,
  postConfidenceReview,
  recordQuestionBankPostAnswerReflection,
} from "./api/domains/question-bank";
export type {
  QuestionBankOption,
  QuestionBankMode,
  QuestionBankResolutionMode,
  QuestionBankSessionStatus,
  QuestionBankScoringMode,
  QuestionBankAnswerStatus,
  QuestionBankCorrectionStatus,
  QuestionTextHighlightKind,
  QuestionTextHighlightTarget,
  QuestionPostAnswerReflection,
  QuestionTextHighlight,
  QuestionBankNode,
  QuestionBankTopic,
  QuestionBankBoard,
  QuestionBankInstitution,
  QuestionBankTargetDemandEvidence,
  QuestionBankSourceOption,
  QuestionBankSourceEntity,
  QuestionBankSourceEntities,
  QuestionBankStateOption,
  QuestionBankYearStat,
  QuestionBankFacets,
  QuestionBankBootstrap,
  QuestionBankReadModel,
  QuestionBankAvailability,
  QuestionBankQuestion,
  QuestionBankSessionItem,
  QuestionBankSession,
  QuestionBankQualityInspection,
  QuestionBankQualityInspectionFlag,
  QuestionBankDnaProfile,
  QuestionBankAiRequestCapability,
  QuestionBankAiQuota,
  QuestionBankAiCacheSummary,
  QuestionBankAiRequestPreview,
  QuestionBankAiRequestResult,
  QuestionBankAiRequestStatusResult,
  QuestionBankLongitudinalNode,
  QuestionBankLongitudinalDiagnosis,
  QuestionBankCorrectionItem,
  QuestionBankFinalizeResult,
  QuestionBankStudentEventType,
  QuestionBankStudentEventPayload,
  QuestionBankGuidedReviewValue,
  QuestionBankGuidedReviewCheckpoint,
  QuestionBankGuidedReviewResponse,
  QuestionBankGuidedReview,
  QuestionBankSessionCreatePayload,
  QuestionBankSessionDeleteResult,
  KrosMode,
  KrosComposition,
  KrosCompositionCount,
  KrosCompositionMicro,
  KrosPreview,
  QuestionBankSessionKind,
  QuestionBankFeedbackRevealPolicy,
  QuestionBankReasoningCheckpoint,
  QuestionBankReasoningReview,
  QuestionBankFeedbackTiming,
  QuestionBankReportType,
  QuestionBankPerformance,
  QuestionBankAreaReadiness,
  QuestionBankExamState,
  QuestionBankExamDebrief,
  ExamDebriefBlock,
  ExamDebriefFollowupAction,
} from "./api/domains/question-bank";

// Question Bank Admin domain
export {
  previewQuestionBankAdminImport,
  importQuestionBankAdminFile,
  listQuestionBankAdminImports,
  getQuestionBankAdminImport,
  getQuestionBankAdminCandidates,
  getQuestionBankAdminPipelineStatus,
  getQuestionBankAdminReadiness,
  processQuestionBankAdminBatch,
  runQuestionBankAdminAll,
  searchQuestionBankAdminQuestions,
  getQuestionBankAdminQuestion,
  editQuestionBankAdminQuestion,
  deleteQuestionBankAdminQuestion,
  listQuestionBankAdminKnowledgeNodes,
  updateQuestionBankQuestionStatus,
} from "./api/domains/question-bank-admin";
export type {
  QuestionBankAdminWarning,
  QuestionBankAdminPreviewSummary,
  QuestionBankAdminPreview,
  QuestionBankAdminImportItem,
  QuestionBankAdminPipelineStage,
  QuestionBankAdminPipelineSnapshot,
  QuestionBankAdminPipelineStatus,
  QuestionBankAdminReadiness,
  QuestionBankAdminCandidate,
  QuestionBankAdminCandidatesResponse,
  QuestionBankAdminQuestionListItem,
  QuestionBankAdminQuestionsResponse,
  QuestionBankAdminQuestionDetail,
  QuestionBankAdminQuestionNode,
  QuestionBankAdminKnowledgeNode,
  QuestionBankAdminQuestionPatch,
  QuestionBankAdminEditResult,
} from "./api/domains/question-bank-admin";

// Performance domain
export {
  getStudyPerformanceSummary,
} from "./api/domains/performance";
export type {
  PerformanceTheme,
  PerformanceAreaSummary,
  PerformanceDiagnosisTheme,
  PerformanceDiagnosis,
  StudyPerformanceSummary,
} from "./api/domains/performance";

// Trainer domain (single daily prescription)
export {
  getTrainerPrescription,
  recordTrainerRecommendationEvent,
} from "./api/domains/trainer";

// Canonical student experience snapshot
export {
  getStudentAgenda,
  getStudentExperience,
  getStudentEvolution,
  getStudentToday,
  invalidateStudentExperienceCache,
} from "./api/domains/student-experience";
export type {
  StudentAgenda,
  StudentAgendaDay,
  StudentAgendaItem,
  StudentExperience,
  StudentMetric,
  StudentSurfaceHome,
  StudentToday,
  StudentTodayAction,
} from "./api/domains/student-experience";
export type {
  TrainerPrescription,
  TrainerAction,
  TrainerActionKind,
  TrainerSignal,
  TrainerStartPayload,
  TrainerOutcomeTarget,
  TrainerEventType,
  TrainerClosedLoop,
  TrainerDailyLoad,
  TrainerReviewLoad,
  TrainerWhyFactor,
  TrainerReviewQueue,
  TrainerReviewQueueItem,
  TrainerPedagogicalConfidence,
  TrainerEditorialQuality,
  TrainerDebrief,
} from "./api/domains/trainer";

// Navigation domain — o Navigator ("tenho 45 minutos e estou cansado" -> rota)
export {
  getNavigationPrompt,
  buildNavigationRoute,
  resolveNavigationRoute,
} from "./api/domains/navigation";
export type {
  NavigationEnergy,
  NavigationCognitiveLoad,
  NavigationPrompt,
  NavigationRoute,
  NavigationRouteAction,
  NavigationRouteStatus,
} from "./api/domains/navigation";

// Integration domain
export {
  getCapabilities,
  startTrainerAction,
} from "./api/domains/integration";
export type {
  CapabilitiesResponse,
  CapabilityHealth,
  CapabilityStatus,
  LearningActionStartResult,
} from "./api/domains/integration";

export {
  getCurrentPlan,
  regeneratePlan,
  startPlanActivity,
  getMyObjectivesV2,
  replaceMyObjectivesV2,
  requestObjectiveCatalogItem,
  searchObjectiveCatalogV2,
  getMyTargetExam,
  getFaciesDaBanca,
  getIndiceDeBancas,
  getMyCompetencyMastery,
} from "./api/domains/study-plan";
export type {
  StudyPlan,
  StudyPlanActivity,
  StudyPlanActivityLaunch,
  ObjectiveDateStatus,
  StudentObjective,
  StudentObjectiveInput,
  StudentObjectives,
  ObjectiveCatalogItemV2,
  ObjectiveCatalogSearchV2,
  ObjectivePlanningDateV2,
  StudentObjectiveV2,
  StudentObjectiveV2Input,
  StudentObjectivesV2,
  StudentTargetExam,
  StudentTargetExamItem,
  CompetencyMastery,
  CompetencyMasteryItem,
} from "./api/domains/study-plan";

// Calendar domain
export {
  listEvents,
  createEvent,
  deleteEvent,
  listScheduleSuggestions,
  triggerScheduleSuggestion,
  acceptScheduleSuggestionItem,
  acceptScheduleSuggestionAll,
  rejectScheduleSuggestion,
} from "./api/domains/calendar";
export type {
  CalendarEventOut,
  WorkloadDay,
  ScheduleSuggestionItem,
  ScheduleSuggestion,
  AdaptiveScheduleBlock,
  AdaptiveScheduleGenerate,
} from "./api/domains/calendar";

// Question Analysis domain
export {
  analyzeSimulationErrors,
  startProgressiveSimulationErrors,
  getProgressiveSimulationErrorsStatus,
  streamProgressiveSimulationErrorsStatus,
  analyzeQuestion,
  getSimulationAnalysisResults,
} from "./api/domains/question-analysis";
export type {
  AnalysisDifficultyLevel,
  QuestionAnalysisDifferentialItem,
  QuestionAnalysisHierarchy,
  QuestionAnalysisConceptGraphNode,
  QuestionAnalysisConceptGraphEdge,
  QuestionAnalysisConceptGraph,
  QuestionAnalysisLearningTarget,
  QuestionAnalysisCognitiveProcess,
  QuestionAnalysisDifficulty,
  QuestionAnalysisErrorsByLevel,
  QuestionCognitiveAnalysis,
  CadernoDraftNotePayload,
  CadernoDraft,
  ExistingCadernoDraft,
  QuestionAnalysisResult,
  AnalyzeSimulationErrorsResponse,
  AnalyzeSimulationErrorsProgressiveStatusItem,
} from "./api/domains/question-analysis";
