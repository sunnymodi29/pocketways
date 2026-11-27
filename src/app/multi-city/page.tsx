import type { Metadata } from "next";
import { MultiCityPlanner } from "@/components/multi-city-planner";

export const metadata: Metadata = {
  title: "Multi-city trip planner",
  description: "Chain several destinations into one trip: per-leg travel costs, stay and food for every stop, weather and an editable day-by-day itinerary.",
  alternates: { canonical: "/multi-city" },
};

export default function Page() {
  return <MultiCityPlanner />;
}