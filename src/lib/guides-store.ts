import raw from "./guides.generated.json";
import type { GuideContent, StoredGuide } from "./guide-content";

const STORE = raw as unknown as Record<string, StoredGuide>;

/** Reviewed, AI-generated long-form content for a destination, if any. */
export function guideContent(id: string): GuideContent | null {
  const g = STORE[id];
  return g?.reviewed ? g.content : null;
}
