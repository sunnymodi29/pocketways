import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

const TTL = 6 * 3600 * 1000;
const cache = new Map<string, { t: number; v: unknown }>();

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  const month = q.get("month") ?? "";
  if (
    !/^[A-Z]{3}$/.test(from) ||
    !/^[A-Z]{3}$/.test(to) ||
    !/^\d{4}-\d{2}$/.test(month)
  )
    return fail(400, "bad params");

  const key = `${from}-${to}-${month}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return ok(hit.v);

  let res: Record<string, unknown>;
  if (process.env.FARE_MOCK === "1") {
    const base =
      3000 +
      ([...(from + to)].reduce((a, c) => a + c.charCodeAt(0), 0) % 40) * 150;
    res = {
      found: true,
      price: base * 2,
      transfers: base % 2 === 0 ? 0 : 1,
      link: "https://www.aviasales.com/",
      mock: true,
      fetched_at: new Date().toISOString(),
    };
  } else {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    if (!token) return fail(503, "TRAVELPAYOUTS_TOKEN not set");
    const params = new URLSearchParams({
      origin: from,
      destination: to,
      departure_at: month,
      one_way: "false",
      currency: "inr",
      sorting: "price",
      limit: "1",
      token,
    });
    const r = await fetch(
      "https://api.travelpayouts.com/aviasales/v3/prices_for_dates?" + params,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      },
    ).catch(() => null);
    if (!r?.ok) return fail(502, "upstream");
    const row = ((await r.json()).data ?? [])[0] as
      | { price: number; transfers?: number; link?: string }
      | undefined;
    if (!row) res = { found: false };
    else {
      let link = row.link?.startsWith("/")
        ? "https://www.aviasales.com" + row.link
        : row.link || "";
      const marker = process.env.TRAVELPAYOUTS_MARKER;
      if (marker && link)
        link +=
          (link.includes("?") ? "&" : "?") +
          "marker=" +
          encodeURIComponent(marker);
      res = {
        found: true,
        price: row.price,
        transfers: row.transfers ?? 0,
        link,
        fetched_at: new Date().toISOString(),
      };
    }
  }
  cache.set(key, { t: Date.now(), v: res });
  return ok(res);
}
