import { auth } from "@/auth";
import { fail, handle, ok, readJson } from "@/lib/http";
import { POLL_ID, castVote } from "@/lib/poll";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!POLL_ID.test(id)) return fail(404, "poll not found");
    // anyone can vote; when signed in, the vote is also linked to the account (for My polls)
    // the session lookup starts now and runs beside the body read and the database read
    const viewer = auth().then((s) => ({ id: s?.user?.id ?? null, name: s?.user?.name ?? null })).catch(() => ({ id: null, name: null }));
    return ok(await castVote(id, await readJson(req), viewer));
  } catch (e) {
    return handle(e);
  }
}
