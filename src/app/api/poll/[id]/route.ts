import { auth } from "@/auth";
import { fail, handle, ok, readJson } from "@/lib/http";
import { POLL_ID, VOTER_ID, deletePoll, pollView, updatePoll } from "@/lib/poll";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!POLL_ID.test(id)) return fail(404, "poll not found");
    const voter = new URL(req.url).searchParams.get("voter") || "";
    const userId = auth().then((s) => s?.user?.id ?? null).catch(() => null); // looked up beside the database read
    const [uid, view] = await Promise.all([userId, pollView(id, VOTER_ID.test(voter) ? voter : null, userId).catch((e) => e as Error)]);
    if (!uid) return fail(401, "sign in to see this poll"); // signed-out people learn nothing, not even whether the poll exists
    if (view instanceof Error) throw view;
    return ok(view);
  } catch (e) {
    return handle(e);
  }
}

/** Change a poll's title or deadline. Only the person who made it can. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!POLL_ID.test(id)) return fail(404, "poll not found");
    const userId = (await auth())?.user?.id;
    if (!userId) return fail(401, "sign in required");
    return ok(await updatePoll(id, userId, await readJson(req)));
  } catch (e) {
    return handle(e);
  }
}

/** Delete a poll and its votes. Only the person who made it can. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!POLL_ID.test(id)) return fail(404, "poll not found");
    const userId = (await auth())?.user?.id;
    if (!userId) return fail(401, "sign in required");
    return ok(await deletePoll(id, userId));
  } catch (e) {
    return handle(e);
  }
}
