import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { authAccounts } from "@/db/schema";

export const CAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const where = (userId: string) => and(eq(authAccounts.userId, userId), eq(authAccounts.provider, "google"));

/** The user's current Google access token, refreshed when it is about to expire. Null if there is none. */
export async function googleAccess(userId: string): Promise<{ token: string; scope: string } | null> {
  const db = await getDb();
  const [acc] = await db.select().from(authAccounts).where(where(userId));
  if (!acc?.access_token) return null;

  const now = Math.floor(Date.now() / 1000);
  if ((acc.expires_at ?? 0) > now + 60) return { token: acc.access_token, scope: acc.scope ?? "" };
  if (!acc.refresh_token) return null;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: acc.refresh_token,
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!r?.ok) return null;
  const j = (await r.json()) as { access_token: string; expires_in: number; scope?: string };
  await db.update(authAccounts).set({ access_token: j.access_token, expires_at: now + j.expires_in, scope: j.scope ?? acc.scope }).where(where(userId));
  return { token: j.access_token, scope: j.scope ?? acc.scope ?? "" };
}

/** Forget the stored tokens (after revoking, or when the user asks to disconnect). */
export async function clearGoogleTokens(userId: string) {
  const db = await getDb();
  await db.update(authAccounts).set({ access_token: null, refresh_token: null, expires_at: null, scope: "openid email profile" }).where(where(userId));
}