import { fail, handle, ok } from "@/lib/http";
import { POLL_ID, VOTER_ID, pollView } from "@/lib/poll";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!POLL_ID.test(id)) return fail(404, "poll not found");
    const voter = new URL(req.url).searchParams.get("voter") || "";
    return ok(await pollView(id, VOTER_ID.test(voter) ? voter : null));
  } catch (e) {
    return handle(e);
  }
}
