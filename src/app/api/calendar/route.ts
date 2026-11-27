import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

const body = z.object({
  title: z.string().min(1).max(80),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.array(z.object({ title: z.string().max(160), description: z.string().max(4000) })).min(1).max(30),
});

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
};

/** Creates one all-day event per itinerary day in the signed-in user's primary Google Calendar. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return fail(401, "sign in required");
  let parsed;
  try { parsed = body.safeParse(await req.json()); } catch { return fail(400, "bad json"); }
  if (!parsed.success) return fail(400, "bad data");

  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(userId, "google").catch(() => null);
  const t = tokens?.data?.[0];
  if (!t?.token) return fail(403, "needs_google");
  if (t.scopes && !t.scopes.includes(SCOPE)) return fail(403, "needs_calendar_scope");

  const { title, start, days } = parsed.data;
  let created = 0;
  for (const [i, d] of days.entries()) {
    const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${t.token}`, "Content-Type": "application/json" },
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
/** The user's current Google access token for this app, if any. */
async function googleToken(userId: string) {
  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(userId, "google").catch(() => null);
  return tokens?.data?.[0]?.token ?? null;
}

/** Is calendar access really granted right now? Asks Google, so it stays correct after revoking. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return fail(401, "sign in required");
  const token = await googleToken(userId);
  if (!token) return ok({ connected: false });
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?" + new URLSearchParams({ access_token: token }), { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r?.ok) return ok({ connected: false });
  const info = (await r.json().catch(() => ({}))) as { scope?: string };
  return ok({ connected: !!info.scope?.split(" ").includes(SCOPE) });
}

/** Withdraws calendar access: Google revokes the grant, so events can no longer be added until it is allowed again. */
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return fail(401, "sign in required");
  const token = await googleToken(userId);
  if (!token) return ok({ revoked: true }); // nothing to revoke
  const r = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  // 400 means the token was already invalid, which is the outcome we want
  if (!r || (!r.ok && r.status !== 400)) return fail(502, "Google could not revoke access");
  return ok({ revoked: true });
}