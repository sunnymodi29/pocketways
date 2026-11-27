import { fail, handle, ok, readJson } from "@/lib/http";
import { POLL_ID, castVote } from "@/lib/poll";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!POLL_ID.test(id)) return fail(404, "poll not found");
    return ok(await castVote(id, await readJson(req)));
  } catch (e) {
    return handle(e);
  }
}
