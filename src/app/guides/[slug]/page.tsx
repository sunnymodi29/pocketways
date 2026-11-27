import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideDetail, UnderList } from "@/components/guides";
import { UNDER_AMOUNTS, UNDER_CITIES } from "@/lib/guide-config";
import { DESTINATIONS } from "@/lib/data";
import { destOf, fmt, originOf } from "@/lib/engine";

export const dynamicParams = false;
export const revalidate = 86400; // "this month" figures refresh daily

const UNDER = /^under-(\d+)-from-([a-z]+)$/;

export function generateStaticParams() {
  return [
    ...DESTINATIONS.map((d) => ({ slug: d.id })),
    ...UNDER_CITIES.flatMap((c) => UNDER_AMOUNTS.map((a) => ({ slug: `under-${a}-from-${c}` }))),
  ];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = destOf(slug);
  if (d) {
    const title = `${d.name} travel guide`;
    const description = `${d.desc} Costs from Indian cities, best months, itinerary ideas, what to eat and what to skip.`;
    return { title, description, alternates: { canonical: `/guides/${d.id}` }, openGraph: { title, description, url: `/guides/${d.id}`, type: "article" } };
  }
  const m = UNDER.exec(slug);
  const o = m && originOf(m[2]);
  if (m && o) return { title: `Trips under ${fmt(Number(m[1]))} from ${o.name}`, description: `Destinations you can reach from ${o.name} for under ${fmt(Number(m[1]))} per person.` };
  return {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = destOf(slug);
  if (d) {
    const jsonLd = [
      {
        "@context": "https://schema.org", "@type": "TouristDestination", name: d.name, description: d.desc,
        geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lng },
        touristType: d.for, containedInPlace: { "@type": "Place", name: d.country ?? "India" },
      },
      {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [["Home", "/"], ["Travel guides", "/guides"], [d.name, `/guides/${d.id}`]].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
      },
    ];
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <GuideDetail d={d} nowMonth={((new Date().getMonth() + 1) % 12) + 1} />
      </>
    );
  }
  const m = UNDER.exec(slug);
  if (m && originOf(m[2])) return <UnderList amount={Number(m[1])} city={m[2]} />;
  notFound();
}
