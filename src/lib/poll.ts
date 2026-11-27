import { and, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { polls, rateLimits, votes, type PollOption } from "@/db/schema";

export const MAX_OPTIONS = 8;
export const MAX_VOTERS = 200;
export const POLLS_PER_HOUR = 30;
const TTL = 60 * 24 * 3600; // polls expire after 60 days

const SLUG = /^[a-z0-9-]{1,32}$/;
export const POLL_ID = /^[a-f0-9]{8}$/;
export const VOTER_ID = /^[a-f0-9]{8,32}$/;
export const optKey = (o: PollOption) => `${o.id}|${o.from}|${o.days}`;

const clean = (v: unknown, n: number) =>
  [...String(v ?? "")].filter((c) => c >= " " && c !== "\u007f").join("").trim().slice(0, n);

const optionSchema = z.object({
  id: z.string().regex(SLUG),
  from: z.string().regex(SLUG),
  days: z.coerce.number().int().min(1).max(15),
});

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const randomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("");
const now = () => Math.floor(Date.now() / 1000);

export async function createPoll(body: unknown, ip: string) {
  const data = (body && typeof body === "object" ? body : {}) as { title?: unknown; options?: unknown; multiple?: unknown };
  const options: PollOption[] = [];
  const seen = new Set<string>();
  for (const raw of (Array.isArray(data.options) ? data.options : []).slice(0, MAX_OPTIONS)) {
    const p = optionSchema.safeParse(raw);
    if (!p.success) continue;
    const k = optKey(p.data);
    if (!seen.has(k)) {
      seen.add(k);
      options.push(p.data);
    }
  }
  if (options.length < 2) throw new ApiError(400, "a poll needs at least 2 valid trips");

  const db = await getDb();
  // One round trip for the rate limit: count this poll first, then refuse if the hour's allowance is used up.
  const bucket = `${ip}:${new Date().toISOString().slice(0, 13)}`;
  const [lim] = await db
    .insert(rateLimits)
    .values({ key: bucket, count: 1 })
    .onConflictDoUpdate({ target: rateLimits.key, set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });
  if ((lim?.count ?? 0) > POLLS_PER_HOUR) throw new ApiError(429, "too many polls from this address, try again later");

  // A random 8-hex id almost never collides; the insert itself tells us if it did, so no lookup first.
  const title = clean(data.title, 60) || "Where should we go?";
  const multiple = data.multiple !== false;
  const created = now();
  let id = "";
  for (let i = 0; i < 5 && !id; i++) {
    const tryId = randomId();
    const [hit] = await db.insert(polls).values({ id: tryId, title, options, created, multiple }).onConflictDoNothing().returning({ id: polls.id });
    if (hit) id = hit.id;
  }
  if (!id) throw new ApiError(500, "could not create the poll, try again");

  // Expired polls are swept now and then (not on every create), in two set-based statements.
  if (Math.random() < 0.05) {
    const cutoff = created - TTL;
    await db.delete(votes).where(sql`${votes.pollId} IN (SELECT id FROM polls WHERE created < ${cutoff})`);
    await db.delete(polls).where(lt(polls.created, cutoff));
  }
  // The brand-new poll is returned whole so the page can open instantly without asking again.
  return {
    id,
    poll: {
      id, title, created, multiple,
      options: options.map((o) => ({ ...o, key: optKey(o), votes: 0 })),
      voters: [] as { name: string; picks: string[] }[],
      voter_count: 0,
      mine: [] as string[],
    },
  };
}

export async function pollView(id: string, voter: string | null) {
  const db = await getDb();
  // the poll and its votes are fetched together: one round trip of waiting, not two
  const [[poll], allVotes] = await Promise.all([
    db.select().from(polls).where(eq(polls.id, id)),
    db.select().from(votes).where(eq(votes.pollId, id)).orderBy(votes.seq),
  ]);
  if (!poll) throw new ApiError(404, "poll not found");
  // a voter with no picks has withdrawn their vote: they do not count
  // seq keeps insertion order (an upsert keeps its row), so "Friend 1" stays the first unnamed voter
  const rows = allVotes.filter((v) => v.picks.length > 0);
  let unnamed = 0;
  const counts: Record<string, number> = Object.fromEntries(poll.options.map((o) => [optKey(o), 0]));
  rows.forEach((v) =>
    v.picks.forEach((k) => {
      if (k in counts) counts[k] += 1;
    }),
  );
  return {
    id: poll.id,
    title: poll.title,
    created: poll.created,
    multiple: poll.multiple,
    options: poll.options.map((o) => ({ ...o, key: optKey(o), votes: counts[optKey(o)] })),
    voters: rows.map((v) => ({ name: v.name || `Friend ${++unnamed}`, picks: v.picks })),
    voter_count: rows.length,
    mine: voter ? (rows.find((v) => v.voter === voter)?.picks ?? []) : [],
  };
}

export async function castVote(id: string, body: unknown) {
  const data = (body && typeof body === "object" ? body : {}) as { voter?: unknown; name?: unknown; picks?: unknown };
  const voter = String(data.voter ?? "");
  if (!VOTER_ID.test(voter)) throw new ApiError(400, "bad voter id");
  const db = await getDb();
  const [poll] = await db.select().from(polls).where(eq(polls.id, id));
  if (!poll) throw new ApiError(404, "poll not found");
  const valid = new Set(poll.options.map(optKey));
  let picks = [...new Set((Array.isArray(data.picks) ? data.picks : []).map(String))].filter((k) => valid.has(k));
  if (!poll.multiple) picks = picks.slice(0, 1); // single-choice poll: one pick per voter
  const [prev] = await db.select().from(votes).where(and(eq(votes.pollId, id), eq(votes.voter, voter)));
  if (!prev) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(votes).where(eq(votes.pollId, id));
    if (Number(n) >= MAX_VOTERS) throw new ApiError(429, "this poll has reached its voter limit");
  }
  if (!picks.length) {
    // deselecting everything resets this voter: their vote is removed, not stored as empty
    await db.delete(votes).where(and(eq(votes.pollId, id), eq(votes.voter, voter)));
    return pollView(id, voter);
  }
  const name = clean(data.name, 24) || prev?.name || "";
  await db
    .insert(votes)
    .values({ pollId: id, voter, name, picks, updated: now() })
    .onConflictDoUpdate({ target: [votes.pollId, votes.voter], set: { name, picks, updated: now() } });
  return pollView(id, voter);
}

/** Just the title, for the tab name and link previews: one small query. */
export async function pollTitle(id: string) {
  const db = await getDb();
  const [row] = await db.select({ title: polls.title }).from(polls).where(eq(polls.id, id));
  return row?.title ?? null;
}
