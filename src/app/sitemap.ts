import type { MetadataRoute } from "next";
import { UNDER_AMOUNTS, UNDER_CITIES } from "@/lib/guide-config";
import { DESTINATIONS } from "@/lib/data";

const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/guides`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/multi-city`, changeFrequency: "monthly", priority: 0.6 },
    ...["privacy", "terms", "disclosure"].map((p) => ({ url: `${base}/${p}`, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...DESTINATIONS.map((d) => ({ url: `${base}/guides/${d.id}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...UNDER_CITIES.flatMap((c) => UNDER_AMOUNTS.map((a) => ({ url: `${base}/guides/under-${a}-from-${c}`, changeFrequency: "weekly" as const, priority: 0.6 }))),
  ];
}
