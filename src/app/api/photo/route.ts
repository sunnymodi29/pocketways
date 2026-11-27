import { NextResponse } from "next/server";

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": status === 200 ? "public, s-maxage=604800, stale-while-revalidate=2592000" : "no-store" },
  });

interface UnsplashHit {
  color?: string;
  alt_description?: string | null;
  urls: { regular: string; small: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
}

/** Destination photo from Unsplash. The key stays on the server; responses are cached for a week. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!/^[\p{L}\p{N} ,'&.-]{2,80}$/u.test(q)) return json({ error: "bad query" }, 400);
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return json({ error: "UNSPLASH_ACCESS_KEY not set" }, 503);

  const r = await fetch(
    "https://api.unsplash.com/search/photos?" + new URLSearchParams({ query: q, per_page: "1", orientation: "landscape", content_filter: "high" }),
    { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, next: { revalidate: 604800 }, signal: AbortSignal.timeout(8000) },
  ).catch(() => null);
  if (!r?.ok) return json({ error: "unsplash unavailable" }, 502);
  const hit = ((await r.json()) as { results?: UnsplashHit[] }).results?.[0];
  if (!hit) return json({ error: "no photo" }, 404);

  // Unsplash asks API apps to register a "download" when a photo is used. Fire-and-forget; only runs on a cache miss.
  fetch(hit.links.download_location, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});

  const utm = "?utm_source=pocketways&utm_medium=referral";
  return json({
    url: hit.urls.regular,
    thumb: hit.urls.small,
    color: hit.color ?? "#2a2a2a",
    alt: hit.alt_description ?? q,
    credit: { name: hit.user.name, link: hit.user.links.html + utm, unsplash: "https://unsplash.com/" + utm },
  });
}