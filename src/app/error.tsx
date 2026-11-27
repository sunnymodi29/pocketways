"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-[560px] place-items-center px-4 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-xl bg-warn/10 text-warn"><TriangleAlert className="size-7" /></span>
        <h1 className="mt-4 text-3xl font-medium tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">An unexpected error stopped this page from loading. Your saved trips are safe on this device.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => retry()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
          <Link href="/" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-primary">Go home</Link>
        </div>
      </div>
    </main>
  );
}