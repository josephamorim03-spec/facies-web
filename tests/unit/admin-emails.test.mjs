import assert from "node:assert/strict";
import test from "node:test";

import { readAdminEmails } from "../../src/app/api/admin/_adminEmails.ts";

function sortedEmails(emails) {
  return [...emails].sort();
}

test("readAdminEmails prefers ADMIN_EMAILS over legacy OPS_ADMIN_EMAILS", () => {
  const emails = readAdminEmails({
    ADMIN_EMAILS: "Primary@Facies.app",
    OPS_ADMIN_EMAILS: "legacy@facies.app",
  });

  assert.deepEqual(sortedEmails(emails), ["primary@facies.app"]);
});

test("readAdminEmails falls back to OPS_ADMIN_EMAILS when ADMIN_EMAILS is missing", () => {
  const emails = readAdminEmails({
    OPS_ADMIN_EMAILS: "legacy@facies.app, second@facies.app",
  });

  assert.deepEqual(sortedEmails(emails), ["legacy@facies.app", "second@facies.app"]);
});
