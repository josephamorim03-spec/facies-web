import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("post-exam review uses the full question context instead of truncated stems", () => {
  const source = read("src/app/banco/sessao/[sessionId]/_components/PostExamReview.tsx");
  assert.match(source, /QuestionFullContext/);
  assert.doesNotMatch(source, /line-clamp-3/);
});

test("confidence review shows full item context without revealing the answer", () => {
  const source = read("src/app/banco/sessao/[sessionId]/_components/ConfidenceReviewStep.tsx");
  assert.match(source, /QuestionFullContext/);
  assert.match(source, /showCorrectAnswer=\{false\}/);
  assert.doesNotMatch(source, /line-clamp-2/);
});

test("admin review queue does not truncate the question under editorial actions", () => {
  const source = read("src/app/admin/question-bank/_components/ReviewQueuePanel.tsx");
  assert.match(source, /QuestionFullContext/);
  assert.doesNotMatch(source, /truncateText/);
});

test("admin reports can expand to the full question detail before repair actions", () => {
  const source = read("src/app/admin/question-bank/_components/QuestionsManager.tsx");
  assert.match(source, /toggleReportQuestion/);
  assert.match(source, /getQuestionBankAdminQuestion\(report\.question_id\)/);
  assert.match(source, /Ver questao completa/);
});
