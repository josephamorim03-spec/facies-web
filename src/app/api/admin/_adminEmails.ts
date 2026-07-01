const ADMIN_EMAIL_ENV_KEYS = ["ADMIN_EMAILS", "OPS_ADMIN_EMAILS"] as const;

function parseAdminEmails(value: string): string[] {
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function readAdminEmails(env: NodeJS.ProcessEnv = process.env): Set<string> {
  for (const key of ADMIN_EMAIL_ENV_KEYS) {
    const emails = parseAdminEmails(String(env[key] ?? ""));
    if (emails.length > 0) return new Set(emails);
  }
  return new Set();
}
