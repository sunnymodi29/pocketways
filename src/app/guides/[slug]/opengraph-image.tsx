import { ImageResponse } from "next/og";
import { destOf, fmt, originOf } from "@/lib/engine";

export const alt = "Pocketways travel guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = destOf(slug);
  const m = /^under-(\d+)-from-([a-z]+)$/.exec(slug);
  const o = m ? originOf(m[2]) : null;
  const title = d ? d.name : m && o ? `Trips under ${fmt(Number(m[1]))}` : "Travel guides";
  const sub = d ? `${d.state}${d.country ? `, ${d.country}` : ""} · Rated ${d.rating}/5` : o ? `From ${o.name}` : "Budget trip plans for India & abroad";
  const line = d ? d.desc : "Honest costs, best months, itineraries and what to eat.";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#1c1c1c 0%,#2a1a12 100%)", color: "#fff" }}>
        <div style={{ display: "flex", fontSize: 34, color: "#f3652f", fontWeight: 700 }}>Pocketways</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 36, marginTop: 18, color: "#f3a27f" }}>{sub}</div>
          <div style={{ display: "flex", fontSize: 28, marginTop: 24, color: "#c9c4be", maxWidth: 900 }}>{line}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#9a9288" }}>Costs · Best months · Itinerary · Food</div>
      </div>
    ),
    size,
  );
}