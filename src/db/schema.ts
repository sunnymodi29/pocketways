import { boolean, integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";
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
  userId: text("user_id").primaryKey(), // Auth.js user id
  saved: jsonb("saved").$type<SavedTripRow[]>().notNull().default([]),
  edits: jsonb("edits").$type<Record<string, DayPlan[]>>().notNull().default({}),
  updated: integer("updated").notNull(),
});

/* ---------- Auth.js tables (names and columns follow the Drizzle adapter) ---------- */
export const authUsers = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const authAccounts = pgTable(
  "account",
  {
    userId: text("userId").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    type: text("type").$type<"oauth" | "oidc" | "email" | "webauthn">().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => [primaryKey({ columns: [a.provider, a.providerAccountId] })],
);

export const authSessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const authVerificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (v) => [primaryKey({ columns: [v.identifier, v.token] })],
);
