import { Header } from "@/components/header";
import { PollSkeleton } from "@/components/poll-view";

export default function Loading() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[1100px] px-4 pt-[88px] pb-16 sm:px-6 lg:px-8">
        <PollSkeleton />
      </main>
    </>
  );
}