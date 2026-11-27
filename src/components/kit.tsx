"use client";

import { Select as S } from "radix-ui";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { dest, vibeIcon } from "@/lib/icons";
import type { Destination } from "@/lib/types";

/** Counts from the previous value to the next one (same effect as the old rolling numbers). */
export function useCount(target: number, ms = 600) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    if (a === target) return;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const val = a + (target - a) * e;
      from.current = val;
      setV(val);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function Num({ value, format = (n: number) => String(Math.round(n)), ms }: { value: number; format?: (n: number) => string; ms?: number }) {
  const v = useCount(value, ms);
  return <span className="tabular-nums">{format(v)}</span>;
}

export function Seg<T extends string>({
  value, onChange, options, size = "md", className, stack,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: React.ReactNode }[];
  size?: "sm" | "md";
  className?: string;
  /** icon above the label (used for the "who is going" control) */
  stack?: boolean;
}) {
  return (
    <div role="group" className={cn("flex gap-0.5 rounded-lg border border-line bg-surface-2 p-[3px]", className)}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            stack && "flex-col gap-1 py-2.5",
            "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors duration-200 [&_svg]:size-3.5",
            size === "sm" ? "h-6 flex-none px-2.5 text-xs" : stack ? "px-1 text-xs [&_svg]:size-3" : "h-7 px-1 text-xs [&_svg]:size-3",
            value === o.v ? "tw-wipe bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ on, onClick, children, className, box }: { on?: boolean; onClick?: () => void; children: React.ReactNode; className?: string; box?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        box && "w-full justify-center rounded-lg px-2",
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 [&_svg]:size-3.5",
        on ? "tw-wipe border-primary bg-primary text-primary-foreground" : "border-line bg-surface text-foreground hover:border-primary hover:text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string }) {
  const n = useCount(value, 350);
  const btn = "grid h-full w-9 place-items-center transition-colors duration-200 hover:bg-primary/15 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit";
  return (
    <div className="flex h-9 items-center justify-between overflow-hidden rounded-lg border border-line bg-surface">
      <button type="button" className={btn} aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="size-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums">{Math.round(n)}</span>
      <button type="button" className={btn} aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-[13px]">
      <span className="relative inline-block h-5 w-9 shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="absolute inset-0 rounded-full border border-line bg-surface-2 transition-colors duration-200 peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-primary" />
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-muted-foreground transition-all duration-200 peer-checked:translate-x-4 peer-checked:bg-white" />
      </span>
      {children}
    </label>
  );
}

export function Field({ label, children, aside }: { label?: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4">
      {(label || aside) && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
          {aside}
        </div>
      )}
      {children}
    </div>
  );
}

/** Fully custom dropdown (no native select popup). */
export function Dropdown({
  value, onChange, options, label, className, triggerClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
  label: string;
  className?: string;
  triggerClassName?: string;
}) {
  // After a mouse pick, focus must not stay on the trigger (it left a stuck highlight + ring). Keyboard users keep focus.
  const byPointer = useRef(false);
  return (
    <S.Root value={value} onValueChange={onChange}>
      <S.Trigger
        aria-label={label}
        onPointerDown={() => (byPointer.current = true)}
        onKeyDown={() => (byPointer.current = false)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-left text-sm font-medium transition-colors duration-200 hover:border-primary data-[state=open]:border-primary",
          triggerClassName,
        )}
      >
        <S.Value />
        <S.Icon>
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          onCloseAutoFocus={(e) => {
            if (byPointer.current) {
              e.preventDefault();
              byPointer.current = false;
            }
          }}
          className={cn(
            "z-[200] max-h-[min(320px,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-40 overflow-hidden rounded-xl border border-line bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0",
            className,
          )}
        >
          <S.Viewport className="p-1">
            {options.map((o) => (
              <S.Item
                key={o.v}
                value={o.v}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-primary/15 data-[highlighted]:text-primary data-[state=checked]:font-semibold"
              >
                <S.ItemText>{o.label}</S.ItemText>
                <S.ItemIndicator>
                  <Check className="size-4 text-primary" />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}

export function DestIcon({ d, className }: { d: Destination; className?: string }) {
  const Icon = dest(d);
  return <Icon className={cn("size-6 text-primary", className)} />;
}
export function VibeIcon({ id, className }: { id: string; className?: string }) {
  const Icon = vibeIcon(id);
  return <Icon className={cn("size-3.5", className)} />;
}

export function Tag({ children, tone }: { children: React.ReactNode; tone?: "good" | "warn" | "bad" | "match" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium [&_svg]:size-3",
        tone === "good" && "border-good/30 bg-good/15 text-good",
        tone === "warn" && "border-warn/30 bg-warn/15 text-warn",
        tone === "bad" && "border-bad/30 bg-bad/15 text-bad",
        tone === "match" && "border-primary/40 bg-primary/20 text-primary",
        !tone && "border-line text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
