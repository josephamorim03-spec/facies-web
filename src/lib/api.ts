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
  seedDemo,
} from "./api/domains/starter";
export type {
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
  listQuestionBankBookmarks,
  setQuestionBankBookmark,
  listQuestionTextHighlights,
  createQuestionTextHighlight,
  deleteQuestionTextHighlight,
  getQuestionBankBootstrap,
  listQuestionBankBoards,
  listQuestionBankSources,
  listQuestionBankSourceEntities,
  listQuestionBankYears,
  listQuestionBankFacets,
  previewQuestionBankAvailability,
  createQuestionBankSession,
  deleteQuestionBankSession,
  listQuestionBankSessions,
  getQuestionBankSession,
  getQuestionBankLongitudinalDiagnosis,
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
  QuestionBankSessionKind,
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
  createTrainerDebrief,
  getTrainerReviewQueue,
  getTrainerPrescription,
  recordTrainerRecommendationEvent,
} from "./api/domains/trainer";

// Canonical student experience snapshot
export {
  getStudentExperience,
  getStudentPlan,
  getStudentReviewHome,
  getStudentTrack,
  getStudentToday,
  invalidateStudentExperienceCache,
} from "./api/domains/student-experience";
export type {
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
  listPlanActivities,
  startPlanActivity,
  getMyObjectives,
  replaceMyObjectives,
  getMyAdaptiveTargets,
  replaceMyAdaptiveTargets,
} from "./api/domains/study-plan";
export type {
  StudyPlan,
  StudyPlanActivity,
  StudyPlanActivityLaunch,
  ObjectiveDateStatus,
  StudentObjective,
  StudentObjectiveInput,
  StudentObjectives,
  AdaptiveTargetKind,
  AdaptiveTarget,
  AdaptiveTargets,
} from "./api/domains/study-plan";

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
  getAdaptiveSchedule,
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
