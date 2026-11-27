import { boolean, integer, jsonb, pgTable, primaryKey, serial, text } from "drizzle-orm/pg-core";
import type { DayPlan } from "@/lib/engine";

export interface PollOption {
  id: string;
  from: string;
  days: number;
}

export const polls = pgTable("polls", {
  id: text("id").primaryKey(), // 8 hex chars
  title: text("title").notNull(),
  options: jsonb("options").$type<PollOption[]>().notNull(),
  created: integer("created").notNull(), // unix seconds
  /** true: tick every trip you like; false: one choice per voter */
  multiple: boolean("multiple").notNull().default(true),
});

export const votes = pgTable(
  "votes",
  {
    /** insertion order: an upsert keeps its row, so "Friend 1" stays the first unnamed voter */
    seq: serial("seq"),
    pollId: text("poll_id").notNull(),
    voter: text("voter").notNull(), // random id kept in the voter's browser
    name: text("name").notNull().default(""),
    picks: jsonb("picks").$type<string[]>().notNull(),
    updated: integer("updated").notNull(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.voter] })],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(), // ip + hour bucket
  count: integer("count").notNull(),
});

/** A signed-in user's saved trips and edited itineraries, synced across devices. */
export interface SavedTripRow {
  id: string;
  from: string;
  days: number;
  travelers?: number;
  stay?: string;
  savedAt?: number;
}
export const userData = pgTable("user_data", {
  userId: text("user_id").primaryKey(), // Clerk user id
  saved: jsonb("saved").$type<SavedTripRow[]>().notNull().default([]),
  edits: jsonb("edits").$type<Record<string, DayPlan[]>>().notNull().default({}),
  updated: integer("updated").notNull(),
});