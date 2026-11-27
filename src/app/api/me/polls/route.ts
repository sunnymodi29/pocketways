import { auth } from "@/auth";
import { fail, handle, ok } from "@/lib/http";
import { listMyPolls } from "@/lib/poll";

export const dynamic = "force-dynamic";

/** Polls the signed-in user created or voted in. */
export async function GET() {
  try {
    const id = (await auth())?.user?.id;
    if (!id) return fail(401, "sign in required");
    return ok(await listMyPolls(id));
  } catch (e) {
    return handle(e);
  }
}
