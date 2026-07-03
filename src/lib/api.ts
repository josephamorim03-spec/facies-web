// Re-exports from domain modules
// This barrel file ensures zero breaking changes for existing imports.
// New code should import directly from "./api/domains/<domain>".

export {
  api,
  authHeader,
  getAPIErrorCode,
  getAPIErrorDetail,
  toAPIError,
  fetchRaw,
  invalidateClientCache,
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
  getOperationalTurboNext,
  submitOperationalTurboReview,
  fetchTurboIntervalPreview,
  startOperationalTurboSession,
  submitOperationalTurboSessionAction,
  navigateOperationalTurboSession,
  repeatOperationalTurboSession,
  getOperationalTurboSessionDailyCompletedCards,
  presignOperationalAttachment,
  putOperationalAttachmentBinary,
  getOperationalAttachmentDownloadUrl,
  isProtectedOperationalAttachmentUrl,
  fetchProtectedOperationalAttachmentBlob,
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
  resetUserData,
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
export {
  me,
  listItems,
  createItem,
  submitReview,
  planDaily,
  getChangeSet,
  acceptAll,
  seedDemo,
} from "./api/domains/starter";
export type {
  PlanDraft,
  ChangeSet,
  ItemKind,
  StudyItem,
  Rating,
} from "./api/domains/starter";

// Study Import domain
export {
  getProfile,
  updateProfile,
  createDirectedStudy,
  listDirectedStudies,
  updateDirectedStudy,
  deleteDirectedStudy,
  createStudyImportSession,
  getBackgroundJob,
  getStudyImportSession,
  isBackgroundJobAccepted,
  listStudyImportSessionQuestions,
  updateStudyImportQuestionState,
  waitForStudyImportSessionJob,
  finalizeStudyImportSession,
  getSessionOverrides,
  setQuestionOverride,
  deleteQuestionOverride,
  listReviewTasks,
  getReviewAgenda,
  updateReviewTask,
  autoRescheduleReviewTask,
  previewAutoRescheduleReviewTask,
  listStudyTopicConsistency,
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
  listQuestionBankBoards,
  listQuestionBankSources,
  listQuestionBankYears,
  previewQuestionBankAvailability,
  createQuestionBankSession,
  listQuestionBankSessions,
  getQuestionBankSession,
  getQuestionBankLongitudinalDiagnosis,
  getQuestionBankLearnerModel,
  getQuestionBankLearningInsights,
  getSessionCorrections,
  recordQuestionBankAttempt,
  recordQuestionBankEvents,
  getQuestionBankGuidedReview,
  submitQuestionBankGuidedReview,
  recordQuestionBankCorrection,
  revealQuestionBankSessionResults,
  reportQuestionBankSessionItem,
  setQuestionBankSessionItemExclusion,
  finalizeQuestionBankSession,
  reportQuestionProblem,
  requestQuestionBankAICorrection,
  getQuestionBankReviewQueue,
  getQuestionBankNextAction,
  getQuestionBankPerformance,
} from "./api/domains/question-bank";
export type {
  QuestionBankOption,
  QuestionBankMode,
  QuestionBankResolutionMode,
  QuestionBankSessionStatus,
  QuestionBankScoringMode,
  QuestionBankAnswerStatus,
  QuestionBankCorrectionStatus,
  QuestionBankNode,
  QuestionBankTopic,
  QuestionBankBoard,
  QuestionBankSourceOption,
  QuestionBankYearStat,
  QuestionBankAvailability,
  QuestionBankQuestion,
  QuestionBankSessionItem,
  QuestionBankSession,
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
  QuestionBankLearnerCompetency,
  QuestionBankLearnerModel,
  QuestionBankLearningInsight,
  QuestionBankSessionCreatePayload,
  QuestionBankReportType,
  QuestionBankReviewQueue,
  QuestionBankNextAction,
  QuestionBankNextActionKind,
  QuestionBankNextActionSignal,
  QuestionBankNextActionSignalSeverity,
  QuestionBankNextActionStartPayload,
  QuestionBankPerformance,
  QuestionBankAreaReadiness,
  QuestionBankExamState,
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

// Calendar domain
export {
  listEvents,
  createEvent,
  deleteEvent,
  getWorkload,
  listScheduleSuggestions,
  triggerScheduleSuggestion,
  acceptScheduleSuggestionItem,
  acceptScheduleSuggestionAll,
  rejectScheduleSuggestion,
  getUserState,
  setUserState,
  getSubjectsRank,
  getAdaptiveSchedule,
  rebalanceSchedule,
} from "./api/domains/calendar";
export type {
  CalendarEventOut,
  WorkloadDay,
  ScheduleSuggestionItem,
  ScheduleSuggestion,
  AdaptiveUserState,
  AdaptiveUserStateIn,
  AdaptiveSubjectRank,
  AdaptiveScheduleBlock,
  AdaptiveScheduleGenerate,
  AdaptiveRebalanceItem,
  AdaptiveRebalanceOut,
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
