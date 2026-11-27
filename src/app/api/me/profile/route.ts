import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { DbNotConfigured, getDb } from "@/db";
import { authUsers } from "@/db/schema";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

const body = z.object({ name: z.string().trim().min(1).max(80) });

/** Change the display name of the signed-in user. */
export async function PATCH(req: Request) {
  const id = (await auth())?.user?.id;
  if (!id) return fail(401, "sign in required");
  let parsed;
  try { parsed = body.safeParse(await req.json()); } catch { return fail(400, "bad json"); }
  if (!parsed.success) return fail(400, "enter a name (up to 80 characters)");
  try {
    const db = await getDb();
    await db.update(authUsers).set({ name: parsed.data.name }).where(eq(authUsers.id, id));
    return ok({ name: parsed.data.name });
  } catch (e) {
    if (e instanceof DbNotConfigured) return fail(503, "database not configured");
    console.error(e);
    return fail(500, "server error");
  }
}