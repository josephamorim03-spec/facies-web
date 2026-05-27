#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const roots = [
  path.join(cwd, "src"),
  path.join(cwd, "scripts"),
  path.join(cwd, "..", "app", "static"),
  path.join(cwd, "..", "app"),
];
const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".md", ".py"]);
const EXCLUDE_DIRS = new Set(["__pycache__", ".venv", "node_modules", "tests"]);

const patterns = [
  // C3 80-BF = UTF-8 continuation bytes (mojibake); C3 C0-FF = legitimate accented chars.
  { label: "UTF-8/Latin-1 corruption (C3 range)", regex: /\u00C3[\u0080-\u00BF]/u },
  { label: "Visible UTF-8/Latin-1 corruption (C3 range)", regex: /\u00C3[\u00A0-\u00BF]/u },
  // C2 80-BF = UTF-8 continuation bytes (mojibake); C2 C0-FF = legitimate accented chars.
  { label: "UTF-8/Latin-1 corruption (C2 range)", regex: /\u00C2[\u0080-\u00BF]/u },
  { label: "Visible UTF-8/Latin-1 corruption (C2 range)", regex: /\u00C2[\u00A0-\u00BF]/u },
  { label: "UTF-8/Latin-1 punctuation corruption", regex: /\u00E2[\u0080-\u00BF]/u },
  { label: "Windows-1252 punctuation corruption (em-dash, quotes etc.)", regex: /\u00E2[\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/u },
  { label: "Emoji corruption", regex: /\u00F0\u0178/u },
  { label: "Unicode replacement character (U+FFFD)", regex: /\uFFFD/u },
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (exts.has(path.extname(full).toLowerCase())) out.push(full);
    }
  }
  return out;
}

const files = roots.flatMap(walk);
const findings = [];

for (const filePath of files) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    // Exclude explicit fixture lines.
    if (line.includes("mojibake-fixture")) return;
    for (const pattern of patterns) {
      if (!pattern.regex.test(line)) continue;
      findings.push({
        file: path.relative(cwd, filePath).replaceAll(path.sep, "/"),
        line: idx + 1,
        label: pattern.label,
        text: line.trim(),
      });
      break;
    }
  });
}

if (findings.length > 0) {
  console.error("Found likely mojibake text (encoding corruption):");
  for (const hit of findings) {
    console.error(`- ${hit.file}:${hit.line} (${hit.label})`);
    console.error(`  ${hit.text}`);
  }
  process.exit(1);
}

console.log("Mojibake check passed.");
