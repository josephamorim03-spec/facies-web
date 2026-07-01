import assert from "node:assert/strict";
import test from "node:test";

import { readAdminEmails } from "../../src/app/api/admin/_adminEmails.ts";

function sortedEmails(emails) {
  return [...emails].sort();
}

test("readAdminEmails prefers ADMIN_EMAILS over legacy OPS_ADMIN_EMAILS", () => {
  const emails = readAdminEmails({
    ADMIN_EMAILS: "Primary@KrosMed.com",
    OPS_ADMIN_EMAILS: "legacy@krosmed.com",
  });

  assert.deepEqual(sortedEmails(emails), ["primary@krosmed.com"]);
});

test("readAdminEmails falls back to OPS_ADMIN_EMAILS when ADMIN_EMAILS is missing", () => {
  const emails = readAdminEmails({
    OPS_ADMIN_EMAILS: "legacy@krosmed.com, second@krosmed.com",
  });

  assert.deepEqual(sortedEmails(emails), ["legacy@krosmed.com", "second@krosmed.com"]);
});
