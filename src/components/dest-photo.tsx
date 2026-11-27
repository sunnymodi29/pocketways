"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Destination } from "@/lib/types";

interface Photo { url: string; thumb: string; color: string; alt: string; credit: { name: string; link: string; unsplash: string } }

export function usePhoto(d: Destination) {
  const query = `${d.name} ${d.country ?? d.state} travel`;
  return useQuery({
    queryKey: ["photo", d.id],
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<Photo> => {
      const r = await fetch(`/api/photo?q=${encodeURIComponent(query)}`);
      if (!r.ok) throw new Error("no photo");
      return r.json();
    },
  });
}

/** Cover photo with Unsplash attribution. Skeleton while it is looked up and downloaded; nothing when no key is configured. */
export function DestPhoto({ d, className, credit = true }: { d: Destination; className?: string; credit?: boolean }) {
  const q = usePhoto(d);
  const [loaded, setLoaded] = useState(false);
  if (q.isPending) return <Skeleton className={cn("rounded-none", className)} />;
  if (!q.data) return null; // no key or no result: collapse quietly
  const p = q.data;
  return (
    <figure className={cn("relative overflow-hidden", !loaded && "animate-pulse", className)} style={{ background: p.color }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.url} alt={p.alt} loading="lazy" onLoad={() => setLoaded(true)}
        className={cn("size-full object-cover transition-opacity duration-700", loaded ? "opacity-100" : "opacity-0")} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      {credit && (
        <figcaption className="absolute right-2 bottom-1.5 text-[10px] text-white/85">
          Photo by <a className="underline" href={p.credit.link} target="_blank" rel="noopener">{p.credit.name}</a> on{" "}
          <a className="underline" href={p.credit.unsplash} target="_blank" rel="noopener">Unsplash</a>
        </figcaption>
      )}
    </figure>
  );
}