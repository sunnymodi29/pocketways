import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { DbNotConfigured, getDb } from "@/db";
import { authUsers, userData } from "@/db/schema";
import { clearGoogleTokens, googleAccess } from "@/lib/google-token";
import { fail, ok } from "@/lib/http";
import { unlinkAccountFromPolls } from "@/lib/poll";

export const dynamic = "force-dynamic";

/** Permanently deletes the signed-in user: profile, sessions, linked Google account and synced data. */
export async function DELETE() {
  const id = (await auth())?.user?.id;
  if (!id) return fail(401, "sign in required");
  try {
    // let go of Google access first so nothing is left behind there
    const a = await googleAccess(id).catch(() => null);
    if (a) {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: a.token }),
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      await clearGoogleTokens(id).catch(() => null);
    }
    await unlinkAccountFromPolls(id);
    const db = await getDb();
    await db.delete(userData).where(eq(userData.userId, id));
    await db.delete(authUsers).where(eq(authUsers.id, id)); // accounts and sessions cascade
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof DbNotConfigured) return fail(503, "database not configured");
    console.error(e);
    return fail(500, "server error");
  }
}