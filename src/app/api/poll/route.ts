import { clientIp, handle, ok, readJson } from "@/lib/http";
import { createPoll } from "@/lib/poll";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    return ok(await createPoll(await readJson(req), clientIp(req)));
  } catch (e) {
    return handle(e);
  }
}
