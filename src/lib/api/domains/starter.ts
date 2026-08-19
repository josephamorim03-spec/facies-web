import { api, authHeader } from "../shared/http";

export async function me(token: string): Promise<{
  user_id: string;
  email?: string | null;
  email_verified?: boolean | null;
  issuer?: string;
}> {
  return api<{
    user_id: string;
    email?: string | null;
    email_verified?: boolean | null;
    issuer?: string;
  }>("/api/me", { headers: authHeader(token) });
}
