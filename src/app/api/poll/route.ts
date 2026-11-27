import { auth } from "@/auth";
import { clientIp, fail, handle, ok, readJson } from "@/lib/http";
import { createPoll } from "@/lib/poll";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // creating a poll needs an account (voting does not)
    const user = (await auth())?.user;
    if (!user?.id) return fail(401, "sign in to create a poll");
    return ok(await createPoll(await readJson(req), clientIp(req), user.id, user.name ?? null));
  } catch (e) {
    return handle(e);
  }
}
