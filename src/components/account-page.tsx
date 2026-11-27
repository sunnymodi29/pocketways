"use client";

import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarCheck, Check, Download, Flag, Heart, Loader2, LogIn, LogOut, Trash2, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { destOf } from "@/lib/engine";
import { useEdits } from "@/lib/edits";
import { download } from "@/lib/export";
import { connectGoogleCalendar } from "@/lib/google-calendar";
import type { MyPoll } from "@/lib/poll";
import { useTrip } from "@/lib/store";
import { useAccount } from "@/lib/use-account";
import { cn } from "@/lib/utils";
import { GoogleCalendarIcon, GoogleIcon } from "./brand-icons";
import { originOptions } from "./filters-panel";
import { Header } from "./header";
import { Dropdown } from "./kit";
import { SavedHost } from "./saved-host";
import { SignInButton } from "./sign-in";
import { SectionNav } from "./section-nav";
import { SiteFooter } from "./site-footer";

const NAV = [["profile", "Profile"], ["preferences", "Preferences"], ["connections", "Connected accounts"], ["polls", "My polls"], ["data", "Your data"], ["danger", "Danger zone"]] as const;
const input = "h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm outline-none transition-colors focus:border-primary";

/** One settings group: title and description on top, rows below separated by dividers. */
function Section({ id, title, desc, danger, children }: { id: string; title: string; desc?: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("scroll-mt-28 overflow-hidden rounded-xl border bg-surface", danger ? "border-bad/40" : "border-line")}>
      <div className="border-b border-line px-5 py-4">
        <h2 className={cn("text-base font-semibold", danger && "text-bad")}>{title}</h2>
        {desc && <p className="mt-0.5 text-[13px] text-muted-foreground">{desc}</p>}
      </div>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

/** Label and help text on the left, the control on the right. */
function Row({ title, desc, children, stack, icon }: { title: string; desc?: React.ReactNode; children?: React.ReactNode; stack?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={cn("flex gap-x-6 gap-y-3 px-5 py-4", stack ? "flex-col" : "flex-wrap items-center justify-between")}>
      <div className={cn("flex min-w-0 items-start gap-3", !stack && "flex-1 basis-56")}>
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2">{icon}</span>}
        <div className="min-w-0">
          <b className="block text-sm font-medium">{title}</b>
          {desc && <p className="mt-0.5 text-[13px] text-muted-foreground">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

const pill = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap";

/** Polls this account made or voted in, newest first. */
function MyPolls() {
  const q = useQuery({
    queryKey: ["my-polls"],
    staleTime: 10_000,
    queryFn: async () => {
      const r = await fetch("/api/me/polls");
      if (!r.ok) throw new Error("Couldn't load your polls");
      return (await r.json()) as MyPoll[];
    },
  });
  if (q.isPending) return <div className="space-y-2 px-5 py-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  if (q.isError) return <Row title="Couldn't load your polls" desc="Check your connection and try again."><Button variant="outline" size="sm" onClick={() => q.refetch()}>Retry</Button></Row>;
  if (!q.data.length) return <Row title="No polls yet" desc="Start one with Plan with friends in My trips, or vote in a friend's poll, and it will show up here. Votes you cast before signing in aren't included." />;
  return (
    <>
      {q.data.map((p) => {
        const names = p.trips.map((t) => destOf(t)?.name).filter(Boolean) as string[];
        const trips = names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3}` : names.join(", ");
        return (
          <Link key={p.id} href={`/poll/${p.id}`} className="group/poll flex items-center gap-3 px-5 py-3.5 transition-colors duration-200 hover:bg-surface-2/50">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-primary">{p.role === "created" ? <Users className="size-4" /> : <Check className="size-4" />}</span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-sm font-medium">{p.title}</b>
              <span className="block truncate text-[13px] text-muted-foreground">{trips} · {p.votes} {p.votes === 1 ? "vote" : "votes"}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
              <span className={cn(pill, p.role === "created" ? "border-primary/40 bg-primary/10 text-primary" : "border-line text-muted-foreground")}>{p.role === "created" ? "Created" : "Voted"}</span>
              <span className={cn(pill, p.closed ? "border-line text-muted-foreground" : "border-good/30 bg-good/10 text-good")}>{p.closed ? <><Flag className="size-3" /> Ended</> : "Open"}</span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 group-hover/poll:text-primary" />
          </Link>
        );
      })}
    </>
  );
}

const Status = ({ on, yes, no }: { on: boolean; yes: string; no: string }) => (
  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium", on ? "border-good/30 bg-good/15 text-good" : "border-line text-muted-foreground")}>
    {on && <Check className="size-3" />}{on ? yes : no}
  </span>
);

export function AccountPage() {
  const { isLoaded, isSignedIn, user, refresh } = useAccount();
  // arriving from a shortcut such as /account#polls: the sections only exist once the account has loaded
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [isLoaded, isSignedIn]);
  const saved = useTrip((s) => s.saved.length);
  const home = useTrip((s) => s.S.from);
  const setTrip = useTrip((s) => s.set);
  const edits = useEdits((s) => Object.keys(s.plans).length);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [delOpen, setDelOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  /** null while checking with Google */
  const [calendarOn, setCalendarOn] = useState<boolean | null>(null);

  useEffect(() => { useTrip.getState().loadSaved(); useEdits.getState().hydrate(); }, []);
  useEffect(() => { if (user) setName(user.name); }, [user?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  // ask the server (and Google) whether calendar access is really granted
  useEffect(() => {
    if (!user) return;
    fetch("/api/calendar").then((r) => (r.ok ? r.json() : { connected: false })).then((d) => setCalendarOn(!!d.connected)).catch(() => setCalendarOn(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayName = user?.name || "Traveller";
  const initials = displayName.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const dirty = !!user && name.trim() !== user.name && name.trim().length > 0;
  const since = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : null;
  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try { await fn(); toast(ok); } catch (e) { toast((e as Error)?.message || "Something went wrong. Try again"); } finally { setBusy(null); }
  };
  const disconnectCalendar = () => run("calOff", async () => {
    const r = await fetch("/api/calendar", { method: "DELETE" });
    if (!r.ok) throw new Error("revoke failed");
    setCalendarOn(false);
    setCalOpen(false);
  }, "Google Calendar disconnected");
  const connectCalendar = () => run("cal", async () => { await connectGoogleCalendar(); }, "Redirecting to Google…");
  const exportData = () => {
    const data = { exportedAt: new Date().toISOString(), account: { name: displayName, email: user?.email }, savedTrips: useTrip.getState().saved, editedItineraries: useEdits.getState().plans };
    download("pocketways-my-data.json", JSON.stringify(data, null, 2), "application/json");
    toast("Your data was downloaded");
  };
  const saveName = () => run("name", async () => {
    const r = await fetch("/api/me/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error || "Couldn't save your name");
    await refresh();
  }, "Profile saved");
  const wipe = () => run("del", async () => {
    const r = await fetch("/api/me/account", { method: "DELETE" });
    if (!r.ok) throw new Error("Couldn't delete the account. Try again");
    useTrip.getState().clearSaved();
    await signOut({ callbackUrl: "/" });
  }, "Account deleted");
  const avatar = (cls: string) => (user?.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.image} alt="" className={cn("object-cover", cls)} referrerPolicy="no-referrer" />
  ) : null);
  return (
    <>
      <Header />
      <SavedHost />
      <main id="main" className="mx-auto w-full max-w-[960px] px-4 pt-[92px] pb-4">
        <p className="mb-4 text-[13px] text-muted-foreground"><Link href="/" className="hover:text-primary">Home</Link> › My account</p>

        {!isLoaded ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading account">
            <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5">
              <Skeleton className="size-16 rounded-full" />
              <div className="flex-1 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-56 max-w-full" /><Skeleton className="h-3 w-32" /></div>
            </div>
            {[3, 1, 2].map((rows, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
                <div className="space-y-2 border-b border-line px-5 py-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-52 max-w-full" /></div>
                {Array.from({ length: rows }, (_, r) => (
                  <div key={r} className="flex items-center justify-between gap-6 border-b border-line px-5 py-4 last:border-b-0">
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-64 max-w-full" /></div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : !isSignedIn || !user ? (
          <div className="rounded-xl border border-line bg-surface p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound className="size-6" /></span>
            <h1 className="mt-3 text-lg font-semibold">Sign in to see your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Save trips across devices and add itineraries to Google Calendar.</p>
            <SignInButton><Button className="mt-4"><LogIn /> Sign in</Button></SignInButton>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-5">
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-lg font-semibold text-primary">
                {avatar("size-full") ?? initials}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-semibold tracking-tight">{displayName}</h1>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{since ? `Member since ${since}` : "Member"} · {saved} saved trip{saved === 1 ? "" : "s"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}><LogOut /> Sign out</Button>
            </div>

            <SectionNav items={NAV} className="sticky top-[68px] z-10 -mx-4 mt-4 bg-background/90 px-4 py-2 backdrop-blur lg:hidden" />

            <div className="mt-4 grid gap-6 lg:grid-cols-[200px_1fr]">
              <SectionNav items={NAV} orientation="vertical" className="sticky top-[92px] hidden self-start lg:flex" />

              <div className="min-w-0 space-y-5">
                <Section id="profile" title="Profile" desc="How you appear in Pocketways.">
                  <Row title="Photo" desc="Comes from your Google account. Change it there and it updates here next time you sign in.">
                    <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-surface-2 text-sm font-semibold text-primary">{avatar("size-full") ?? initials}</span>
                  </Row>
                  <Row title="Display name" desc="Shown in your menu and on shared plans." stack>
                    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (dirty) saveName(); }}>
                      <input className={cn(input, "min-w-[200px] flex-1")} aria-label="Display name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                      <Button type="submit" size="sm" className="h-9" disabled={!dirty || busy === "name"}>{busy === "name" ? <Loader2 className="animate-spin" /> : <Check />} Save</Button>
                    </form>
                  </Row>
                  <Row title="Email" desc="Comes from your Google account.">
                    <span className="truncate text-sm text-muted-foreground">{user.email}</span>
                  </Row>
                </Section>

                <Section id="preferences" title="Preferences" desc="Defaults used when you plan a trip.">
                  <Row title="Starting city" desc="Where trips begin unless you change it in the planner.">
                    <div className="w-full sm:w-52"><Dropdown label="Starting city" value={home} onChange={(v) => { setTrip({ from: v }); toast("Starting city updated"); }} options={originOptions} /></div>
                  </Row>
                </Section>

                <Section id="connections" title="Connected accounts" desc="Services Pocketways can use on your behalf.">
                  <Row icon={<GoogleIcon className="size-5" />} title="Google" desc={user.email}>
                    <span className="inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-[11.5px] font-medium text-muted-foreground">Sign-in method</span>
                  </Row>
                  <Row icon={<GoogleCalendarIcon className="size-5" />} title="Google Calendar" desc={calendarOn ? "Itineraries can be added as all-day events. Events already in your calendar stay if you disconnect." : "Allow access so itineraries can be added in one click. We only create events you ask for."}>
                    {calendarOn === null ? (
                      <Skeleton className="h-8 w-24" aria-label="Checking Google Calendar" />
                    ) : calendarOn ? (
                      <div className="flex items-center gap-2">
                        <Status on yes="Allowed" no="" />
                        <Button variant="outline" size="sm" onClick={() => setCalOpen(true)}>Disconnect</Button>
                      </div>
                    ) : (
                      <Button size="sm" disabled={busy === "cal"} onClick={connectCalendar}>{busy === "cal" ? <Loader2 className="animate-spin" /> : <CalendarCheck />} Allow access</Button>
                    )}
                  </Row>
                </Section>

                <Section id="polls" title="My polls" desc="Polls you've created or voted in.">
                  <MyPolls />
                </Section>

                <Section id="data" title="Your data" desc="Saved on this device and synced to your account.">
                  <Row title="Saved trips" desc={saved ? `${saved} trip${saved === 1 ? "" : "s"} saved. Open them to compare, share or plan with friends.` : "Nothing saved yet. Tap the heart on any trip to keep it here."}>
                    <Button variant="outline" size="sm" onClick={() => useTrip.getState().openSaved()}><Heart /> View</Button>
                  </Row>
                  <Row title="Edited itineraries" desc={`${edits} itinerar${edits === 1 ? "y" : "ies"} you changed.`}>
                    <span className="text-sm tabular-nums text-muted-foreground">{edits}</span>
                  </Row>
                  <Row title="Export my data" desc="Download your saved trips and edited itineraries as a JSON file.">
                    <Button variant="outline" size="sm" onClick={exportData}><Download /> Export</Button>
                  </Row>
                </Section>

                <Section id="danger" title="Danger zone" danger>
                  <Row title="Delete account" desc="Permanently remove your account and synced data. This can't be undone.">
                    <Button variant="outline" size="sm" className="border-bad/50 text-bad hover:bg-bad/10 hover:text-bad" onClick={() => setDelOpen(true)}><Trash2 /> Delete account</Button>
                  </Row>
                </Section>
              </div>
            </div>
          </>
        )}

        <Dialog open={calOpen} onOpenChange={setCalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-semibold">Disconnect Google Calendar?</DialogTitle>
              <DialogDescription>Pocketways will no longer be able to add events to your calendar.</DialogDescription>
            </DialogHeader>
            <ul className="space-y-1 pl-5 text-[13px] text-muted-foreground [&>li]:list-disc">
              <li>Events already in your calendar stay where they are.</li>
              <li>You still sign in with Google as before.</li>
              <li>You can allow access again any time.</li>
            </ul>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setCalOpen(false)}>Cancel</Button>
              <Button variant="destructive" disabled={busy === "calOff"} onClick={disconnectCalendar}>
                {busy === "calOff" ? <Loader2 className="animate-spin" /> : null} Disconnect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={delOpen} onOpenChange={(o) => { setDelOpen(o); if (!o) setConfirm(""); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-semibold">Delete your account?</DialogTitle>
              <DialogDescription>This permanently deletes:</DialogDescription>
            </DialogHeader>
            <ul className="space-y-1 pl-5 text-[13px] text-muted-foreground [&>li]:list-disc">
              <li>Your Pocketways account and its Google sign-in link</li>
              <li>{saved} saved trip{saved === 1 ? "" : "s"} and {edits} edited itinerar{edits === 1 ? "y" : "ies"} synced to your account</li>
            </ul>
            <p className="text-[13px] text-muted-foreground">Polls you created stay online until they expire.</p>
            <label className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">Type DELETE to confirm
              <input className={cn(input, "mt-1 font-normal normal-case tracking-normal text-foreground")} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" autoComplete="off" />
            </label>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => { setDelOpen(false); setConfirm(""); }}>Cancel</Button>
              <Button variant="destructive" disabled={confirm !== "DELETE" || busy === "del"} onClick={wipe}>
                {busy === "del" ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <SiteFooter />
    </>
  );
}
