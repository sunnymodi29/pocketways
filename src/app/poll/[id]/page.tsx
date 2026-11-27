import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PollView } from "@/components/poll-view";
import { POLL_ID, pollTitle } from "@/lib/poll";

export const dynamic = "force-dynamic";

// Polls are for signed-in people, so nothing about one (not even its title) is shown to anyone else.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  let title = "Where should we go?";
  if (POLL_ID.test(id) && (await auth())?.user?.id) {
    try {
      title = (await pollTitle(id)) ?? title;
    } catch {
      /* unknown poll: keep the generic title */
    }
  }
  return { title, description: "Vote for the trip you'd like to take together.", robots: { index: false } };
}

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Not signed in: back to the homepage, which asks them to sign in and then returns them to this poll.
  if (!(await auth())?.user?.id) redirect(POLL_ID.test(id) ? `/?next=${encodeURIComponent(`/poll/${id}`)}` : "/");
  return <PollView id={id} />;
}
