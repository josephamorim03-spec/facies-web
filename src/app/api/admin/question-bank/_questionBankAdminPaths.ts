export function isAllowedQuestionBankAdminPath(method: string, questionBankPath: string): boolean {
  const pathname = questionBankPath.split("?")[0] ?? "";
  const normalizedMethod = method.toUpperCase();
  const readOnlyPatterns = [
    /^\/v1\/admin\/ui\/config$/,
    /^\/v1\/admin\/pipeline\/(status|readiness)$/,
    /^\/v1\/admin\/pipeline\/jobs\/[^/]+$/,
    /^\/v1\/admin\/ai-enrichment\/preflight$/,
    /^\/v1\/admin\/ai-enrichment\/batches$/,
    /^\/v1\/admin\/ai-enrichment\/costs$/,
    /^\/v1\/admin\/ai-enrichment\/drafts$/,
    /^\/v1\/admin\/editorial-intelligence\/coverage$/,
    /^\/v1\/admin\/editorial-memory\/metrics$/,
    /^\/v1\/admin\/taxonomy\/suggestion-clusters$/,
    /^\/v1\/admin\/ai-resolution-requests$/,
    /^\/v1\/admin\/editorial-queue$/,
    /^\/v1\/admin\/imports$/,
    /^\/v1\/admin\/imports\/[^/]+$/,
    /^\/v1\/admin\/imports\/[^/]+\/(candidates|pipeline-summary)$/,
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
      /^\/v1\/admin\/pipeline\/(process-batch|run-all|backfill-fingerprints)$/,
      /^\/v1\/admin\/ai-enrichment\/rollouts$/,
      /^\/v1\/admin\/ai-enrichment\/rollouts\/[^/]+\/revert$/,
      /^\/v1\/admin\/ai-enrichment\/request-batch$/,
      /^\/v1\/admin\/ai-enrichment\/request-from-findings$/,
      /^\/v1\/admin\/editorial-intelligence\/evidence-revalidation$/,
      /^\/v1\/admin\/editorial-memory\/register$/,
      /^\/v1\/admin\/questions\/[^/]+\/ai-enrichment-drafts\/[^/]+\/decision$/,
      /^\/v1\/admin\/questions\/[^/]+\/ai-enrichment-drafts\/[^/]+\/approve-memory$/,
      /^\/v1\/admin\/questions\/[^/]+\/(resolve|analyze|editorial-analysis)$/,
      /^\/v1\/admin\/editorial-analysis\/batch$/,
      /^\/v1\/admin\/editorial-reviews\/[^/]+\/decision$/,
      /^\/v1\/admin\/data-quality\/reclassify-stem-incomplete$/,
      /^\/v1\/admin\/questions\/reports\/[^/]+\/(triage|repair)$/,
      /^\/v1\/admin\/student-taxonomy\/backfill$/,
      /^\/v1\/admin\/student-taxonomy\/backfill\/conflicts\/[^/]+\/resolve$/,
      /^\/v1\/admin\/taxonomy\/suggestion-clusters\/[^/]+\/decision$/,
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
