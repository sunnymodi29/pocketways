import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DbNotConfigured, getDb } from "@/db";
import { userData } from "@/db/schema";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";
const MAX = 200_000;

const body = z.object({
  saved: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]{1,32}$/),
    from: z.string().regex(/^[a-z0-9-]{1,32}$/),
    days: z.number().int().min(1).max(30),
    travelers: z.number().int().min(1).max(50).optional(),
    stay: z.string().max(12).optional(),
    savedAt: z.number().optional(),
  })).max(100),
  edits: z.record(z.string().max(120), z.array(z.unknown()).max(40)).refine((o) => Object.keys(o).length <= 60),
});

const unavailable = (e: unknown) => (e instanceof DbNotConfigured ? fail(503, "database not configured") : (console.error(e), fail(500, "server error")));

export async function GET() {
  const { userId } = await auth();
  if (!userId) return fail(401, "sign in required");
  try {
    const db = await getDb();
    const [row] = await db.select().from(userData).where(eq(userData.userId, userId));
    return ok({ saved: row?.saved ?? [], edits: row?.edits ?? {} });
  } catch (e) { return unavailable(e); }
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) return fail(401, "sign in required");
  const text = await req.text();
  if (text.length > MAX) return fail(413, "too large");
  let parsed;
  try { parsed = body.safeParse(JSON.parse(text)); } catch { return fail(400, "bad json"); }
  if (!parsed.success) return fail(400, "bad data");
  try {
    const db = await getDb();
    const v = { saved: parsed.data.saved, edits: parsed.data.edits as never, updated: Math.floor(Date.now() / 1000) };
    await db.insert(userData).values({ userId, ...v }).onConflictDoUpdate({ target: userData.userId, set: v });
    return ok({ ok: true });
  } catch (e) { return unavailable(e); }
}
/** Removes everything stored for the signed-in user (used before deleting the account). */
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return fail(401, "sign in required");
  try {
    const db = await getDb();
    await db.delete(userData).where(eq(userData.userId, userId));
    return ok({ ok: true });
  } catch (e) { return unavailable(e); }
}