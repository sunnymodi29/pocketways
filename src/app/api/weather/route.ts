import { NextResponse } from "next/server";

const json = (data: unknown, status = 200, cache = "public, s-maxage=3600, stale-while-revalidate=7200") =>
  NextResponse.json(data, { status, headers: { "Cache-Control": status === 200 ? cache : "no-store" } });

/** 16-day forecast from Open-Meteo (free, no key). Cached at the edge for an hour. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return json({ error: "bad coordinates" }, 400);
  // round so nearby requests share one cache entry
  const la = lat.toFixed(2);
  const lo = lng.toFixed(2);
  const url =
    "https://api.open-meteo.com/v1/forecast?" +
    new URLSearchParams({
      latitude: la,
      longitude: lo,
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max",
      timezone: "auto",
      forecast_days: "16",
    });
  const r = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r?.ok) return json({ error: "weather provider unavailable" }, 502);
  const j = (await r.json()) as { daily?: Record<string, (number | string)[]> };
  const d = j.daily;
  if (!d?.time) return json({ error: "no data" }, 502);
  const days = d.time.map((date, i) => ({
    date,
    code: Number(d.weather_code?.[i] ?? 0),
    max: Math.round(Number(d.temperature_2m_max?.[i])),
    min: Math.round(Number(d.temperature_2m_min?.[i])),
    rain: Number(d.precipitation_probability_max?.[i] ?? 0),
    wind: Math.round(Number(d.wind_speed_10m_max?.[i] ?? 0)),
    uv: Math.round(Number(d.uv_index_max?.[i] ?? 0)),
  }));
  return json({ days, source: "Open-Meteo" });
}