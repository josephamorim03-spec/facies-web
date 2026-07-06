export function isAllowedQuestionBankAdminPath(method: string, questionBankPath: string): boolean {
  const pathname = questionBankPath.split("?")[0] ?? "";
  const normalizedMethod = method.toUpperCase();
  const readOnlyPatterns = [
    /^\/v1\/admin\/ui\/config$/,
    /^\/v1\/admin\/pipeline\/(status|readiness|ai-preview)$/,
    /^\/v1\/admin\/imports$/,
    /^\/v1\/admin\/imports\/[^/]+$/,
    /^\/v1\/admin\/imports\/[^/]+\/(candidates|pipeline-summary)$/,
    /^\/v1\/admin\/review-queue$/,
    /^\/v1\/admin\/questions\/reports$/,
    /^\/v1\/admin\/questions$/,
    /^\/v1\/admin\/questions\/[^/]+$/,
    /^\/v1\/admin\/knowledge-nodes$/,
    /^\/v1\/admin\/storage\/summary$/,
    /^\/v1\/admin\/taxonomy\/suggestions$/,
    /^\/v1\/admin\/student-taxonomy\/backfill\/conflicts$/,
  ];
  const mutationPatterns: Record<string, RegExp[]> = {
    POST: [
      /^\/v1\/admin\/imports\/(preview|files)$/,
      /^\/v1\/admin\/imports\/[^/]+\/compact$/,
      /^\/v1\/admin\/topics\/refresh-cache$/,
      /^\/v1\/admin\/pipeline\/(process-batch|run-all|run-ai|backfill-fingerprints)$/,
      /^\/v1\/admin\/questions\/[^/]+\/(resolve|analyze)$/,
      /^\/v1\/admin\/questions\/reports\/[^/]+\/(triage|repair)$/,
      /^\/v1\/admin\/student-taxonomy\/backfill$/,
      /^\/v1\/admin\/student-taxonomy\/backfill\/conflicts\/[^/]+\/resolve$/,
      /^\/v1\/admin\/taxonomy\/versions$/,
    ],
    PATCH: [
      /^\/v1\/admin\/questions\/reports\/[^/]+$/,
      /^\/v1\/admin\/questions\/[^/]+$/,
      /^\/v1\/admin\/questions\/[^/]+\/status$/,
      /^\/v1\/admin\/candidates\/[^/]+$/,
      /^\/v1\/admin\/candidates\/review-queue\/[^/]+$/,
      /^\/v1\/admin\/taxonomy\/suggestions\/[^/]+$/,
    ],
    DELETE: [/^\/v1\/admin\/questions\/[^/]+$/],
  };
  if (normalizedMethod === "GET") {
    return readOnlyPatterns.some((pattern) => pattern.test(pathname));
  }
  return (mutationPatterns[normalizedMethod] ?? []).some((pattern) => pattern.test(pathname));
}
