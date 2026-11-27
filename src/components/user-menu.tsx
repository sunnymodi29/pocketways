"use client";

import { signOut } from "next-auth/react";
import { useAccount } from "@/lib/use-account";
import { BookOpen, ChevronDown, Heart, LogOut, Route, Settings } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { useTrip } from "@/lib/store";
import { cn } from "@/lib/utils";

const item =
  "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-surface-2 data-[highlighted]:text-primary";

/** Signed-in account menu in the app's own style. */
export function UserMenu() {
  const { user } = useAccount();
  const saved = useTrip((s) => s.saved.length);
  const openSaved = useTrip((s) => s.openSaved);
  if (!user) return null;

  const name = user.name || "Traveller";
  const email = user.email;
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Account menu for ${name}`}
        className="group flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-2/70 py-1 pr-2.5 pl-1 text-[13px] font-medium outline-none transition-colors hover:border-primary hover:text-primary data-[state=open]:border-primary data-[state=open]:text-primary"
      >
        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-surface text-[11px] font-bold text-primary">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initials
          )}
        </span>
        <span className="hidden max-w-[110px] truncate sm:inline">{name.split(" ")[0]}</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-primary" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className={cn(
            "z-50 w-[260px] rounded-xl border border-line bg-surface p-1.5 shadow-2xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-sm font-bold text-primary">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initials
              )}
            </span>
            <div className="min-w-0">
              <b className="block truncate text-sm">{name}</b>
              <span className="block truncate text-xs text-muted-foreground">{email}</span>
            </div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={item} onSelect={() => openSaved()}>
            <Heart className="size-4 text-primary" /> My trips
            {saved > 0 && <b className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] leading-5 text-primary-foreground">{saved}</b>}
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}>
            <Link href="/multi-city"><Route className="size-4 text-primary" /> Multi-city trips</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={item}>
            <Link href="/guides"><BookOpen className="size-4 text-primary" /> Travel guides</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild className={item}>
            <Link href="/account"><Settings className="size-4 text-muted-foreground" /> Manage account</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={cn(item, "data-[highlighted]:text-bad")} onSelect={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="size-4 text-muted-foreground" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}