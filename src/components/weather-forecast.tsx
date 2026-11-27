"use client";

import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplets, Sun, Thermometer, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface WxDay { date: string; code: number; max: number; min: number; rain: number; wind: number; uv: number }

export function wmo(code: number): { label: string; Icon: LucideIcon; tone: string } {
  if (code === 0) return { label: "Clear", Icon: Sun, tone: "text-warn" };
  if (code <= 2) return { label: "Partly cloudy", Icon: CloudSun, tone: "text-warn" };
  if (code === 3) return { label: "Overcast", Icon: Cloud, tone: "text-muted-foreground" };
  if (code === 45 || code === 48) return { label: "Fog", Icon: CloudFog, tone: "text-muted-foreground" };
  if (code >= 51 && code <= 67) return { label: "Rain", Icon: CloudRain, tone: "text-blue" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "Snow", Icon: CloudSnow, tone: "text-blue" };
  if (code >= 80 && code <= 82) return { label: "Showers", Icon: CloudRain, tone: "text-blue" };
  if (code >= 95) return { label: "Thunderstorm", Icon: CloudLightning, tone: "text-bad" };
  return { label: "Cloudy", Icon: Cloud, tone: "text-muted-foreground" };
}

export function useForecast(lat: number, lng: number) {
  return useQuery({
    queryKey: ["weather", lat.toFixed(2), lng.toFixed(2)],
    staleTime: 30 * 60_000,
    retry: 1,
    queryFn: async (): Promise<WxDay[]> => {
      const r = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
      if (!r.ok) throw new Error("forecast unavailable");
      return (await r.json()).days;
    },
  });
}

const dayName = (iso: string, i: number) => (i === 0 ? "Today" : new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short" }));
const dateNum = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function advice(days: WxDay[]): string[] {
  const out: string[] = [];
  if (days.some((d) => d.rain >= 60)) out.push("Rain likely on some days: carry a rain jacket and keep a flexible indoor option.");
  if (days.some((d) => d.min <= 8)) out.push("Cold mornings or nights: pack warm layers.");
  if (days.some((d) => d.max >= 36)) out.push("Very hot afternoons: plan sightseeing early and late, and carry water.");
  if (days.some((d) => d.uv >= 8)) out.push("Strong UV: sunscreen and sunglasses.");
  if (days.some((d) => d.wind >= 40)) out.push("Windy days: check ferries, paragliding and mountain-pass conditions.");
  return out.length ? out : ["Conditions look settled: no special weather gear needed."];
}

/** Live 16-day forecast strip. `days` limits how many cards show (the whole trip, by default 7). */
export function WeatherForecast({ lat, lng, name, days = 7, className }: { lat: number; lng: number; name: string; days?: number; className?: string }) {
  const q = useForecast(lat, lng);
  if (q.isPending) {
    return (
      <div className={cn("flex gap-2 overflow-hidden", className)} aria-busy="true" aria-label="Loading forecast">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex w-[84px] shrink-0 flex-col items-center gap-2 rounded-xl border border-line bg-surface p-2.5">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-2.5 w-8" />
          </div>
        ))}
      </div>
    );
  }
  if (q.isError || !q.data) {
    return <p className={cn("rounded-xl border border-line bg-surface p-3 text-[13px] text-muted-foreground", className)}>Live forecast for {name} is unavailable right now. Check the typical weather by month above.</p>;
  }
  const list = q.data.slice(0, Math.min(16, Math.max(1, days)));
  return (
    <div className={className}>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="list" aria-label={`Weather forecast for ${name}`}>
        {list.map((d, i) => {
          const w = wmo(d.code);
          return (
            <div key={d.date} role="listitem" className={cn("w-[84px] shrink-0 rounded-xl border bg-surface p-2.5 text-center", i === 0 ? "border-primary/60" : "border-line")}>
              <div className="text-xs font-bold">{dayName(d.date, i)}</div>
              <div className="text-[10px] text-muted-foreground">{dateNum(d.date)}</div>
              <w.Icon className={cn("mx-auto my-1.5 size-6", w.tone)} aria-label={w.label} />
              <div className="text-sm font-bold tabular-nums">{d.max}°<span className="font-normal text-muted-foreground"> / {d.min}°</span></div>
              <div className={cn("mt-1 flex items-center justify-center gap-1 text-[10px] tabular-nums", d.rain >= 50 ? "text-blue" : "text-muted-foreground")}>
                <Droplets className="size-3" />{d.rain}%
              </div>
            </div>
          );
        })}
      </div>
      <ul className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
        {advice(list).map((a) => <li key={a} className="flex gap-2"><Thermometer className="mt-0.5 size-3.5 shrink-0 text-primary" />{a}</li>)}
      </ul>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Wind className="size-3" /> Forecast by Open-Meteo · updates hourly · only the next 16 days are available</p>
    </div>
  );
}