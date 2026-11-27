import type { Metadata } from "next";
import { PollView } from "@/components/poll-view";
import { POLL_ID, pollView } from "@/lib/poll";

export const dynamic = "force-dynamic";

// The tab title (and link previews in chats) use the poll's own title.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  let title = "Where should we go?";
  if (POLL_ID.test(id)) {
    try {
      title = (await pollView(id, null)).title;
    } catch {
      /* unknown poll: keep the generic title */
    }
  }
  return { title, description: "Vote for the trip you'd like to take together.", robots: { index: false } };
}

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PollView id={id} />;
}
