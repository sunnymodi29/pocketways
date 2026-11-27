export type Climate = "beach" | "desert" | "gulf" | "high" | "hill" | "plain" | "trop";
export type Group = "friends" | "couple" | "family" | "solo";
export type Tier = "hostel" | "budget" | "mid" | "luxury";
export type Mode = "flight" | "train" | "bus" | "car";

export interface Origin {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Vibe {
  id: string;
  label: string;
  icon: string;
}

export interface Destination {
  id: string;
  name: string;
  state: string;
  country?: string;
  intl?: boolean;
  emoji: string;
  lat: number;
  lng: number;
  tags: string[];
  for: Group[];
  clim: Climate;
  /** months 1-12 */
  best: number[];
  avoid: number[];
  visa?: string;
  visaEasy?: boolean;
  /** budget-tier room per night, INR */
  stay: number;
  /** per person per day */
  food: number;
  /** local transport per vehicle per day */
  local: number;
  /** activities per person per day */
  act: number;
  /** road km to nearest useful railway station / airport; null = not possible */
  rail: number | null;
  air: number | null;
  modes?: Mode[];
  rating: number;
  easy?: boolean;
  kids?: boolean;
  noKids?: boolean;
  nopass?: boolean;
  offbeat?: boolean;
  desc: string;
  hl: string[];
  eat: string[];
  tips: string[];
  skip: string[];
  near: string;
}
