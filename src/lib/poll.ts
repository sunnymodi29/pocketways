import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { authUsers, polls, rateLimits, votes, type PollOption } from "@/db/schema";

export const MAX_OPTIONS = 8;
export const MAX_VOTERS = 200;
export const POLLS_PER_HOUR = 30;
const TTL = 60 * 24 * 3600; // polls are removed after 60 days
/** How long a creator can leave voting open. Anything else means no time limit. */
export const EXPIRY_DAYS = [1, 3, 7, 14, 30] as const;
const isClosed = (p: { closes: number | null }) => p.closes !== null && p.closes <= Math.floor(Date.now() / 1000);

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

export async function createPoll(body: unknown, ip: string, userId: string | null = null, userName: string | null = null) {
  const data = (body && typeof body === "object" ? body : {}) as { title?: unknown; options?: unknown; multiple?: unknown; expiresDays?: unknown };
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
  const days = Number(data.expiresDays);
  const closes = (EXPIRY_DAYS as readonly number[]).includes(days) ? created + days * 86400 : null;
  let id = "";
  for (let i = 0; i < 5 && !id; i++) {
    const tryId = randomId();
    const [hit] = await db.insert(polls).values({ id: tryId, title, options, created, multiple, creator: userId, closes }).onConflictDoNothing().returning({ id: polls.id });
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
      closes, closed: false, owner: true, creatorName: firstName(userName),
      options: options.map((o) => ({ ...o, key: optKey(o), votes: 0 })),
      voters: [] as { name: string; picks: string[] }[],
      voter_count: 0,
      mine: [] as string[],
    },
  };
}

/** First name only, so a poll shows who made it without exposing a full name. */
const firstName = (name: string | null | undefined) => (clean(name, 60).split(/\s+/)[0] ?? "").slice(0, 24) || null;

/** Who is looking: the signed-in account, or nobody. Passed as a promise so the lookup runs while the database is being read. */
export interface Viewer {
  id: string | null;
  name: string | null;
}
const nobody: Viewer = { id: null, name: null };

type Db = Awaited<ReturnType<typeof getDb>>;
type VoteRow = typeof votes.$inferSelect;
type PollRow = typeof polls.$inferSelect;

/** The poll with its creator's name, in a single query. */
const pollRow = (db: Db, id: string) =>
  db.select({ poll: polls, creatorName: authUsers.name }).from(polls).leftJoin(authUsers, eq(polls.creator, authUsers.id)).where(eq(polls.id, id));
const voteRows = (db: Db, id: string) => db.select().from(votes).where(eq(votes.pollId, id)).orderBy(votes.seq);

/** Everything the poll page shows, worked out from rows already in hand. */
function buildView(poll: PollRow, creatorName: string | null, allVotes: VoteRow[], voter: string | null, userId: string | null) {
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
    closes: poll.closes,
    closed: isClosed(poll),
    owner: !!userId && poll.creator === userId,
    creatorName: firstName(creatorName),
    options: poll.options.map((o) => ({ ...o, key: optKey(o), votes: counts[optKey(o)] })),
    voters: rows.map((v) => ({ name: v.name || `Friend ${++unnamed}`, picks: v.picks, me: !!voter && v.voter === voter })),
    voter_count: rows.length,
    mine: voter ? (rows.find((v) => v.voter === voter)?.picks ?? []) : [],
  };
}

export async function pollView(id: string, voter: string | null, userId: string | null | Promise<string | null> = null) {
  const db = await getDb();
  // the poll, its votes and who is asking are all looked up at the same time
  const [[found], allVotes, uid] = await Promise.all([pollRow(db, id), voteRows(db, id), userId]);
  if (!found) throw new ApiError(404, "poll not found");
  return buildView(found.poll, found.creatorName, allVotes, voter, uid);
}

/**
 * Record one voter's picks. Two trips to the database in total: one read (poll and all votes together, while the
 * session lookup runs beside it) and one write. The response is built from what was read plus the change just made.
 */
export async function castVote(id: string, body: unknown, viewer: Viewer | Promise<Viewer> = nobody) {
  const data = (body && typeof body === "object" ? body : {}) as { voter?: unknown; picks?: unknown };
  const voter = String(data.voter ?? "");
  if (!VOTER_ID.test(voter)) throw new ApiError(400, "bad voter id");
  const db = await getDb();
  const [[found], rows, who] = await Promise.all([pollRow(db, id), voteRows(db, id), viewer]);
  if (!who.id) throw new ApiError(401, "sign in to vote");
  if (!found) throw new ApiError(404, "poll not found");
  const poll = found.poll;
  if (isClosed(poll)) throw new ApiError(409, "this poll has ended, so votes can no longer change");
  const valid = new Set(poll.options.map(optKey));
  let picks = [...new Set((Array.isArray(data.picks) ? data.picks : []).map(String))].filter((k) => valid.has(k));
  if (!poll.multiple) picks = picks.slice(0, 1); // single-choice poll: one pick per voter
  const prev = rows.find((r) => r.voter === voter);
  if (!prev && rows.length >= MAX_VOTERS) throw new ApiError(429, "this poll has reached its voter limit");
  const user = who;

  if (!picks.length) {
    // deselecting everything resets this voter: their vote is removed, not stored as empty
    if (prev) await db.delete(votes).where(and(eq(votes.pollId, id), eq(votes.voter, voter)));
    return buildView(poll, found.creatorName, rows.filter((r) => r.voter !== voter), voter, user.id);
  }
  // Signed in: shown by first name, taken from the account (so nobody can vote under someone else's name).
  // Signed out: no name, so the voter shows as "Friend N". An earlier name on the same vote is kept.
  const name = (user.id && firstName(user.name)) || prev?.name || "";
  const updated = now();
  await db
    .insert(votes)
    .values({ pollId: id, voter, name, picks, updated, userId: user.id })
    // a vote cast while signed in is linked to the account; casting again signed out never unlinks it
    .onConflictDoUpdate({ target: [votes.pollId, votes.voter], set: { name, picks, updated, ...(user.id ? { userId: user.id } : {}) } });
  const row: VoteRow = { seq: prev?.seq ?? Math.max(0, ...rows.map((r) => r.seq)) + 1, pollId: id, voter, name, picks, updated, userId: user.id ?? prev?.userId ?? null };
  return buildView(poll, found.creatorName, prev ? rows.map((r) => (r.voter === voter ? row : r)) : [...rows, row], voter, user.id);
}

/** Just the title, for the tab name and link previews: one small query. */
export async function pollTitle(id: string) {
  const db = await getDb();
  const [row] = await db.select({ title: polls.title }).from(polls).where(eq(polls.id, id));
  return row?.title ?? null;
}

export interface MyPoll {
  id: string;
  title: string;
  created: number;
  multiple: boolean;
  closes: number | null;
  closed: boolean;
  /** the trips on the poll, in order */
  trips: string[];
  /** people who have voted */
  votes: number;
  /** "created" wins when you did both */
  role: "created" | "voted";
}

/** Polls this account created, plus polls it voted in while signed in. Newest first. */
export async function listMyPolls(userId: string): Promise<MyPoll[]> {
  const db = await getDb();
  const [made, cast] = await Promise.all([
    db.select().from(polls).where(eq(polls.creator, userId)),
    db.select({ pollId: votes.pollId, picks: votes.picks }).from(votes).where(eq(votes.userId, userId)),
  ]);
  const madeIds = new Set(made.map((p) => p.id));
  // a vote that was withdrawn (no picks) does not count as having voted
  const votedIds = [...new Set(cast.filter((v) => v.picks.length > 0).map((v) => v.pollId))].filter((id) => !madeIds.has(id));
  const ids = [...madeIds, ...votedIds];
  if (!ids.length) return [];
  const [others, counts] = await Promise.all([
    votedIds.length ? db.select().from(polls).where(inArray(polls.id, votedIds)) : Promise.resolve([]),
    db
      .select({ pollId: votes.pollId, n: sql<number>`count(*)::int` })
      .from(votes)
      .where(and(inArray(votes.pollId, ids), sql`jsonb_array_length(${votes.picks}) > 0`))
      .groupBy(votes.pollId),
  ]);
  const n = new Map(counts.map((c) => [c.pollId, Number(c.n)]));
  return [...made.map((p) => ({ p, role: "created" as const })), ...others.map((p) => ({ p, role: "voted" as const }))]
    .sort((a, b) => b.p.created - a.p.created)
    .slice(0, 50)
    .map(({ p, role }) => ({ id: p.id, title: p.title, created: p.created, multiple: p.multiple, closes: p.closes, closed: isClosed(p), trips: p.options.map((o) => o.id), votes: n.get(p.id) ?? 0, role }));
}

/** Account deletion: polls stay for the friends who voted, but no longer point at this person. */
export async function unlinkAccountFromPolls(userId: string) {
  const db = await getDb();
  await Promise.all([
    db.update(polls).set({ creator: null }).where(eq(polls.creator, userId)),
    db.update(votes).set({ userId: null }).where(eq(votes.userId, userId)),
  ]);
}

/** The creator ends voting now. Results stay visible; nobody can change a vote afterwards. */
export async function endPoll(id: string, userId: string) {
  const db = await getDb();
  const [poll] = await db.select().from(polls).where(eq(polls.id, id));
  if (!poll) throw new ApiError(404, "poll not found");
  if (poll.creator !== userId) throw new ApiError(403, "only the person who made this poll can end it");
  if (!isClosed(poll)) await db.update(polls).set({ closes: now() }).where(eq(polls.id, id));
  return pollView(id, null, userId);
}

/**
 * The creator changes the title and/or the deadline. Picking a new deadline counts from now,
 * so doing it on an ended poll reopens it. The trips and the voting style stay as they were
 * (changing them would make existing votes meaningless).
 */
export async function updatePoll(id: string, userId: string, body: unknown) {
  const data = (body && typeof body === "object" ? body : {}) as { title?: unknown; expiresDays?: unknown; voter?: unknown };
  const db = await getDb();
  const [poll] = await db.select().from(polls).where(eq(polls.id, id));
  if (!poll) throw new ApiError(404, "poll not found");
  if (poll.creator !== userId) throw new ApiError(403, "only the person who made this poll can change it");
  const set: { title?: string; closes?: number | null } = {};
  if ("title" in data) {
    const t = clean(data.title, 60);
    if (!t) throw new ApiError(400, "the poll needs a title");
    set.title = t;
  }
  if ("expiresDays" in data) {
    if (data.expiresDays === null) set.closes = null;
    else {
      const d = Number(data.expiresDays);
      if (!(EXPIRY_DAYS as readonly number[]).includes(d)) throw new ApiError(400, "pick one of the listed durations");
      set.closes = now() + d * 86400;
    }
  }
  if (Object.keys(set).length) await db.update(polls).set(set).where(eq(polls.id, id));
  const voter = VOTER_ID.test(String(data.voter ?? "")) ? String(data.voter) : null;
  return pollView(id, voter, userId);
}

/** The creator deletes the poll and every vote on it. This cannot be undone. */
export async function deletePoll(id: string, userId: string) {
  const db = await getDb();
  const [poll] = await db.select().from(polls).where(eq(polls.id, id));
  if (!poll) throw new ApiError(404, "poll not found");
  if (poll.creator !== userId) throw new ApiError(403, "only the person who made this poll can delete it");
  await db.delete(votes).where(eq(votes.pollId, id));
  await db.delete(polls).where(eq(polls.id, id));
  return { deleted: true };
}
