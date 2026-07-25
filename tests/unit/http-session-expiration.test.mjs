import assert from "node:assert/strict";
import test from "node:test";

import {
  isSessionExpiredApiResponse,
  SESSION_EXPIRED_HEADER,
} from "../../src/lib/sessionExpiration.ts";

test("401 without the session-expired header remains a normal API error", () => {
  const res = new Response(JSON.stringify({ code: "upstream_unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });

  assert.equal(isSessionExpiredApiResponse("/api/protected-resource", res), false);
});

test("401 with the session-expired header becomes a session_expired error", () => {
  const res = new Response(JSON.stringify({ code: "oidc_token_invalid" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      [SESSION_EXPIRED_HEADER]: "1",
    },
  });

  assert.equal(isSessionExpiredApiResponse("/api/protected-resource", res), true);
});
