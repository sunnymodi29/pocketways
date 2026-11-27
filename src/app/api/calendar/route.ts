import { z } from "zod";
import { auth } from "@/auth";
import { clearGoogleTokens, CAL_SCOPE, googleAccess } from "@/lib/google-token";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

const body = z.object({
  title: z.string().min(1).max(80),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.array(z.object({ title: z.string().max(160), description: z.string().max(4000) })).min(1).max(30),
});

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const hasCalendar = (scope: string) => scope.split(" ").includes(CAL_SCOPE);
const userId = async () => (await auth())?.user?.id;

/** Is calendar access really granted right now? Asks Google, so it stays correct after revoking elsewhere. */
export async function GET() {
  const id = await userId();
  if (!id) return fail(401, "sign in required");
  const a = await googleAccess(id);
  if (!a || !hasCalendar(a.scope)) return ok({ connected: false });
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?" + new URLSearchParams({ access_token: a.token }), { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r?.ok) return ok({ connected: false });
  const info = (await r.json().catch(() => ({}))) as { scope?: string };
  return ok({ connected: hasCalendar(info.scope ?? "") });
}

/** Creates one all-day event per itinerary day in the signed-in user's primary Google Calendar. */
export async function POST(req: Request) {
  const id = await userId();
  if (!id) return fail(401, "sign in required");
  let parsed;
  try { parsed = body.safeParse(await req.json()); } catch { return fail(400, "bad json"); }
  if (!parsed.success) return fail(400, "bad data");

  const a = await googleAccess(id);
  if (!a) return fail(403, "needs_google");
  if (!hasCalendar(a.scope)) return fail(403, "needs_calendar_scope");

  const { title, start, days } = parsed.data;
  let created = 0;
  for (const [i, d] of days.entries()) {
    const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${a.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `${title} · ${d.title}`,
        description: d.description,
        start: { date: addDays(start, i) },
        end: { date: addDays(start, i + 1) },
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (r?.status === 401 || r?.status === 403) return fail(403, "needs_calendar_scope");
    if (!r?.ok) return fail(502, `Google Calendar rejected day ${i + 1}`);
    created++;
  }
  return ok({ created });
}

/** Withdraws calendar access: Google revokes the grant, so events can no longer be added until it is allowed again. */
export async function DELETE() {
  const id = await userId();
  if (!id) return fail(401, "sign in required");
  const a = await googleAccess(id);
  if (a) {
    const r = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: a.token }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);
    // 400 means the token was already invalid, which is the outcome we want
    if (!r || (!r.ok && r.status !== 400)) return fail(502, "Google could not revoke access");
  }
  await clearGoogleTokens(id);
  return ok({ revoked: true });
}