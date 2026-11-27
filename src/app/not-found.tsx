import Link from "next/link";
import { Compass } from "lucide-react";
import { Header } from "@/components/header";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto grid min-h-dvh max-w-[560px] place-items-center px-4 text-center">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-xl bg-primary/10 text-primary"><Compass className="size-7" /></span>
          <h1 className="mt-4 text-3xl font-medium tracking-tight">This road doesn&apos;t lead anywhere</h1>
          <p className="mt-2 text-muted-foreground">The page you&apos;re looking for has moved or never existed. Let&apos;s get you back on the map.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Plan a trip</Link>
            <Link href="/guides" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-primary">Browse guides</Link>
          </div>
        </div>
      </main>
    </>
  );
}