"use client";

import { toast } from "sonner";
import { useSignInPrompt } from "./sign-in-prompt";
import type { SavedTrip } from "./store";

const VOTER_KEY = "tw-voter";
const NAME_KEY = "tw-name";

export const voterId = () => {
  let v: string | null = null;
  try { v = localStorage.getItem(VOTER_KEY); } catch { /* storage blocked */ }
  if (!v || !/^[a-f0-9]{8,32}$/.test(v)) {
    v = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
    try { localStorage.setItem(VOTER_KEY, v); } catch { /* storage blocked */ }
  }
  return v;
};
export const savedName = () => {
  try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; }
};
export const rememberName = (n: string) => {
  try { localStorage.setItem(NAME_KEY, n); } catch { /* storage blocked */ }
};

export interface PollData {
  id: string;
  title: string;
  created: number;
  /** true: pick any number of trips; false: exactly one */
  multiple: boolean;
  options: { id: string; from: string; days: number; key: string; votes: number }[];
  voters: { name: string; picks: string[] }[];
  voter_count: number;
  mine: string[];
}

/** What the sign-in popup says when someone tries to create a poll without an account. */
export const POLL_WHY = { title: "Sign in to plan with friends", description: "Create a poll, share the link, and watch the votes come in. Your friends can vote without an account." };

export class PollError extends Error {
  code: number | "net";
  constructor(code: number | "net", message: string) {
    super(message);
    this.code = code;
  }
}

/** Base path of the poll API (set NEXT_PUBLIC_POLL_API to use a separate host, e.g. the Cloudflare Worker). */
const base = () => (process.env.NEXT_PUBLIC_POLL_API || "/api/poll").replace(/\/+$/, "");

export async function pollApi<T = PollData>(path: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(base() + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
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
export async function createPoll(items: SavedTrip[], opts: { title: string; multiple: boolean }, nav: { open: (url: string) => void; seed: (key: unknown[], poll: PollData) => void }) {
  const list = items.slice(0, 8);
  if (list.length < 2) {
    toast("Pick at least 2 trips first");
    return false;
  }
  try {
    const { id, poll } = await pollApi<{ id: string; poll: PollData }>("", {
      title: opts.title.trim() || "Where should we go?",
      multiple: opts.multiple,
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
