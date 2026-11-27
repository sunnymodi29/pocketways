import { NextResponse } from "next/server";
import { DbNotConfigured } from "@/db";
import { ApiError } from "./poll";

export const MAX_BODY = 4096;
const noStore = { "Cache-Control": "no-store" };

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: noStore });
export const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: noStore });

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text.length) throw new ApiError(400, "bad body size");
  if (text.length > MAX_BODY) throw new ApiError(413, "bad body size");
  try {
    const v = JSON.parse(text);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
    /* fall through */
  }
  throw new ApiError(400, "bad json");
}

export function handle(e: unknown) {
  if (e instanceof ApiError) return fail(e.status, e.message);
  if (e instanceof DbNotConfigured) return fail(503, "database not configured");
  console.error(e);
  return fail(500, "server error");
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
