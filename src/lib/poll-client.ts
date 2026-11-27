"use client";

import { toast } from "sonner";
import { useSignInPrompt } from "./sign-in-prompt";
import type { SavedTrip } from "./store";

const VOTER_KEY = "tw-voter";

export const voterId = () => {
  let v: string | null = null;
  try { v = localStorage.getItem(VOTER_KEY); } catch { /* storage blocked */ }
  if (!v || !/^[a-f0-9]{8,32}$/.test(v)) {
    v = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
    try { localStorage.setItem(VOTER_KEY, v); } catch { /* storage blocked */ }
  }
  return v;
};

export interface PollData {
  id: string;
  title: string;
  created: number;
  /** true: pick any number of trips; false: exactly one */
  multiple: boolean;
  /** when voting closes (unix seconds), or null for no time limit */
  closes: number | null;
  /** voting has ended, by time or because the creator ended it */
  closed: boolean;
  /** the signed-in viewer made this poll, so they can end it */
  owner: boolean;
  /** first name of the person who made it (empty for old polls) */
  creatorName: string | null;
  options: { id: string; from: string; days: number; key: string; votes: number }[];
  voters: { name: string; picks: string[]; /** this entry is the viewer */ me?: boolean }[];
  voter_count: number;
  mine: string[];
}

/** What the sign-in popup says when someone tries to create a poll without an account. */
export const POLL_WHY = { title: "Sign in to plan with friends", description: "Create a poll, share the link, and watch the votes come in. Friends who open the link sign in first, so every vote has a name." };

export class PollError extends Error {
  code: number | "net";
  constructor(code: number | "net", message: string) {
    super(message);
    this.code = code;
  }
}

/** Base path of the poll API (set NEXT_PUBLIC_POLL_API to use a separate host, e.g. the Cloudflare Worker). */
const base = () => (process.env.NEXT_PUBLIC_POLL_API || "/api/poll").replace(/\/+$/, "");

export async function pollApi<T = PollData>(path: string, body?: unknown, method?: "POST" | "PATCH" | "DELETE"): Promise<T> {
  let r: Response;
  try {
    r = await fetch(base() + path, body ? { method: method ?? "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : method ? { method } : undefined);
  } catch {
    throw new PollError("net", "You're offline");
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new PollError(r.status, data.error || "Something went wrong");
  return data as T;
}

export const pollMessage = (e: unknown) =>
  e instanceof PollError ? (e.code === 404 ? "This poll doesn't exist (or the link is wrong)." : e.message) : "Something went wrong";

/**
 * Creates the poll and opens it. The new poll comes back with the response and is put straight into the cache,
 * and the page is opened without a reload, so there is nothing left to wait for.
 */
export async function createPoll(items: SavedTrip[], opts: { title: string; multiple: boolean; expiresDays: number | null }, nav: { open: (url: string) => void; seed: (key: unknown[], poll: PollData) => void }) {
  const list = items.slice(0, 8);
  if (list.length < 2) {
    toast("Pick at least 2 trips first");
    return false;
  }
  try {
    const { id, poll } = await pollApi<{ id: string; poll: PollData }>("", {
      title: opts.title.trim() || "Where should we go?",
      multiple: opts.multiple,
      expiresDays: opts.expiresDays,
      options: list.map((s) => ({ id: s.id, from: s.from, days: s.days })),
    });
    nav.seed(["poll", id, voterId()], poll);
    nav.open(`/poll/${id}`);
    return true;
  } catch (e) {
    if (e instanceof PollError && e.code === 401) useSignInPrompt.getState().ask(POLL_WHY);
    else toast(pollMessage(e));
    return false;
  }
}

/** Choices for how long voting stays open. `null` means no time limit. */
export const EXPIRY_CHOICES: { days: number | null; label: string }[] = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 30, label: "1 month" },
  { days: null, label: "No limit" },
];

/** "Closes in 3 days", "Closes in 5 hours", "Closes in under an hour". */
export function closesIn(closes: number, nowMs = Date.now()) {
  const secs = closes - Math.floor(nowMs / 1000);
  if (secs <= 0) return "Closing now";
  const hours = Math.floor(secs / 3600);
  if (hours < 1) return "Closes in under an hour";
  if (hours < 48) return `Closes in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `Closes in ${days} days`;
}

/** The poll error behind an unknown thrown value, if it is one. */
export const pollError = (e: unknown) => (e instanceof PollError ? e : null);
