import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const previousNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "production";
const nextConfig = require("../../next.config.js");
process.env.NODE_ENV = previousNodeEnv;

test("production headers harden transport and executable content", async () => {
  const rules = await nextConfig.headers();
  const headers = new Map(rules[0].headers.map(({ key, value }) => [key, value]));

  assert.equal(nextConfig.poweredByHeader, false);
  assert.equal(headers.get("Strict-Transport-Security"), "max-age=63072000; includeSubDomains; preload");
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(headers.get("Content-Security-Policy") ?? "", /object-src 'none'/);
  assert.match(headers.get("Content-Security-Policy") ?? "", /frame-ancestors 'none'/);
  assert.match(headers.get("Permissions-Policy") ?? "", /browsing-topics=\(\)/);
});
