import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const DDL = [
  "CREATE TABLE IF NOT EXISTS polls (id TEXT PRIMARY KEY, title TEXT NOT NULL, options JSONB NOT NULL, created INTEGER NOT NULL, multiple BOOLEAN NOT NULL DEFAULT TRUE)",
  "CREATE TABLE IF NOT EXISTS votes (seq SERIAL, poll_id TEXT NOT NULL, voter TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', picks JSONB NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (poll_id, voter))",
  "CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL)",
  `CREATE TABLE IF NOT EXISTS "user" ("id" TEXT PRIMARY KEY, "name" TEXT, "email" TEXT UNIQUE, "emailVerified" TIMESTAMP, "image" TEXT, "createdAt" TIMESTAMP NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS "account" ("userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "type" TEXT NOT NULL, "provider" TEXT NOT NULL, "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER, "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT, PRIMARY KEY ("provider", "providerAccountId"))`,
  `CREATE TABLE IF NOT EXISTS "session" ("sessionToken" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE, "expires" TIMESTAMP NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "verificationToken" ("identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP NOT NULL, PRIMARY KEY ("identifier", "token"))`,
  "CREATE TABLE IF NOT EXISTS user_data (user_id TEXT PRIMARY KEY, saved JSONB NOT NULL DEFAULT '[]', edits JSONB NOT NULL DEFAULT '{}', updated INTEGER NOT NULL)",
];

const TABLE_COUNT = DDL.length;

export class DbNotConfigured extends Error {
  constructor() {
    super("DATABASE_URL is not set (use your Neon connection string)");
  }
}

function init() {
  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url)) throw new DbNotConfigured();
  const client = neon(url);
  const db = drizzle({ client, schema });
  // Tables are created on first use, so a fresh Neon database needs no manual setup.
  // One cheap lookup tells us whether they already exist, so a cold start costs a single round trip
  // instead of nine. If any is missing, all are created in one batched request.
  const ready = (async () => {
    const rows = (await client.query(
      "SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('polls','votes','rate_limits','user','account','session','verificationToken','user_data')",
    )) as { n: number }[];
    if (rows[0]?.n === TABLE_COUNT) return;
    await client.transaction(DDL.map((q) => client.query(q)));
  })();
  return { db, ready };
}

const g = globalThis as unknown as { __twdb?: ReturnType<typeof init> };

export async function getDb() {
  const inst = (g.__twdb ??= init());
  try {
    await inst.ready;
  } catch (e) {
    g.__twdb = undefined; // let the next request retry the setup
    throw e;
  }
  return inst.db;
}