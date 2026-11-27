import type { Metadata } from "next";
import { GuideIndex } from "@/components/guides";
import { DESTINATIONS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Travel guides: budget trip plans for India & abroad",
  description: `Honest trip costs, itineraries, best months, what to eat and what to skip for ${DESTINATIONS.length} destinations.`,
};

export default function Page() {
  return <GuideIndex />;
}
