import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const DDL = [
  "CREATE TABLE IF NOT EXISTS polls (id TEXT PRIMARY KEY, title TEXT NOT NULL, options JSONB NOT NULL, created INTEGER NOT NULL, multiple BOOLEAN NOT NULL DEFAULT TRUE)",
  "CREATE TABLE IF NOT EXISTS votes (seq SERIAL, poll_id TEXT NOT NULL, voter TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', picks JSONB NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (poll_id, voter))",
  "CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS user_data (user_id TEXT PRIMARY KEY, saved JSONB NOT NULL DEFAULT '[]', edits JSONB NOT NULL DEFAULT '{}', updated INTEGER NOT NULL)",
];

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
  const ready = (async () => {
    for (const q of DDL) await client.query(q);
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