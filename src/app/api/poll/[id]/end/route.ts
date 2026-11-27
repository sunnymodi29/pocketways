import { auth } from "@/auth";
import { fail, handle, ok } from "@/lib/http";
import { POLL_ID, endPoll } from "@/lib/poll";

export const dynamic = "force-dynamic";

/** End a poll now. Only the person who created it can. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!POLL_ID.test(id)) return fail(404, "poll not found");
    const userId = (await auth())?.user?.id;
    if (!userId) return fail(401, "sign in required");
    return ok(await endPoll(id, userId));
  } catch (e) {
    return handle(e);
  }
}
