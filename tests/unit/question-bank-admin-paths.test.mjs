import assert from "node:assert/strict";
import test from "node:test";

import { isAllowedQuestionBankAdminPath } from "../../src/app/api/admin/question-bank/_questionBankAdminPaths.ts";

test("question-bank proxy allows the current reports routes", () => {
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/questions/reports"), true);
  assert.equal(isAllowedQuestionBankAdminPath("PATCH", "/v1/admin/questions/reports/report-123"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/questions/reports/report-123/triage"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/questions/reports/report-123/repair"), true);
});

test("question-bank proxy rejects the legacy reports routes", () => {
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/reports"), false);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/reports/question-123/resolve"), false);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/questions/reports/report-123/delete"), false);
});

test("question-bank proxy allows storage and scoped compaction routes", () => {
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/storage/summary"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/imports/import-123/compact"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/imports/import-123/compact?dry_run=true"), true);
});

test("question-bank proxy keeps compact and backfill routes scoped", () => {
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/imports/compact"), false);
  assert.equal(isAllowedQuestionBankAdminPath("DELETE", "/v1/admin/imports/import-123/compact"), false);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/topics/refresh-cache"), true);
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/topics/refresh-cache"), false);
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/student-taxonomy/backfill/conflicts"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/student-taxonomy/backfill"), true);
  assert.equal(
    isAllowedQuestionBankAdminPath("POST", "/v1/admin/student-taxonomy/backfill/conflicts/question-1/resolve"),
    true,
  );
});

test("question-bank proxy exposes only the consolidated editorial contract", () => {
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/editorial-queue?lane=ai_draft"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/questions/q-1/editorial-analysis"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/editorial-analysis/batch"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/editorial-reviews/r-1/decision"), true);
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/pedagogical-drafts"), false);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/questions/q-1/anomaly-check"), false);
});

test("question-bank proxy allows governed AI operations without broad admin access", () => {
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/ai-enrichment/preflight"), true);
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/ai-enrichment/costs?days=30"), true);
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/ai-enrichment/drafts?status=pending_review"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/ai-enrichment/rollouts"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/ai-enrichment/rollouts/rollout-1/revert"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/ai-enrichment/request-batch"), true);
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/editorial-intelligence/coverage"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/editorial-intelligence/evidence-revalidation"), true);
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/editorial-memory/metrics"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/editorial-memory/register"), true);
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/taxonomy/suggestion-clusters"), true);
  assert.equal(isAllowedQuestionBankAdminPath("POST", "/v1/admin/taxonomy/suggestion-clusters/cluster-1/decision"), true);
  assert.equal(isAllowedQuestionBankAdminPath("DELETE", "/v1/admin/ai-enrichment/rollouts/rollout-1"), false);
  assert.equal(isAllowedQuestionBankAdminPath("GET", "/v1/admin/editorial-memory/items"), false);
});
