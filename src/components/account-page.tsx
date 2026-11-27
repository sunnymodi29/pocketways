"use client";

import { SignInButton, useClerk, useUser } from "@clerk/nextjs";
import { CalendarCheck, Camera, Check, Download, Heart, Loader2, LogIn, LogOut, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEdits } from "@/lib/edits";
import { download } from "@/lib/export";
import { connectGoogleCalendar } from "@/lib/google-calendar";
import { useTrip } from "@/lib/store";
import { cn } from "@/lib/utils";
import { GoogleCalendarIcon, GoogleIcon } from "./brand-icons";
import { originOptions } from "./filters-panel";
import { Header } from "./header";
import { Dropdown } from "./kit";
import { SavedHost } from "./saved-host";
import { SectionNav } from "./section-nav";
import { SiteFooter } from "./site-footer";

const NAV = [["profile", "Profile"], ["preferences", "Preferences"], ["connections", "Connected accounts"], ["data", "Your data"], ["danger", "Danger zone"]] as const;
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

const Status = ({ on, yes, no }: { on: boolean; yes: string; no: string }) => (
  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium", on ? "border-good/30 bg-good/15 text-good" : "border-line text-muted-foreground")}>
    {on && <Check className="size-3" />}{on ? yes : no}
  </span>
);

export function AccountPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const saved = useTrip((s) => s.saved.length);
  const home = useTrip((s) => s.S.from);
  const setTrip = useTrip((s) => s.set);
  const edits = useEdits((s) => Object.keys(s.plans).length);
  const fileRef = useRef<HTMLInputElement>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [delOpen, setDelOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  /** null while checking with Google */
  const [calendarOn, setCalendarOn] = useState<boolean | null>(null);

  useEffect(() => { useTrip.getState().loadSaved(); useEdits.getState().hydrate(); }, []);
  useEffect(() => { if (user) { setFirst(user.firstName ?? ""); setLast(user.lastName ?? ""); } }, [user]);
  // ask the server (and Google) whether calendar access is really granted
  useEffect(() => {
    if (!user) return;
    fetch("/api/calendar").then((r) => (r.ok ? r.json() : { connected: false })).then((d) => setCalendarOn(!!d.connected)).catch(() => setCalendarOn(false));
  }, [user]);

  const google = user?.externalAccounts.find((a) => a.provider === "google");
  const name = user?.fullName || user?.username || "Traveller";
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const dirty = !!user && (first.trim() !== (user.firstName ?? "") || last.trim() !== (user.lastName ?? ""));
  const since = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : null;

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    try { await fn(); toast(ok); } catch (e) { toast((e as { errors?: { message?: string }[] })?.errors?.[0]?.message || "Something went wrong. Try again"); } finally { setBusy(null); }
  };
  const disconnectCalendar = () => run("calOff", async () => {
    const r = await fetch("/api/calendar", { method: "DELETE" });
    if (!r.ok) throw new Error("revoke failed");
    setCalendarOn(false);
    setCalOpen(false);
  }, "Google Calendar disconnected");
  const connectCalendar = () => run("cal", async () => { if (user) await connectGoogleCalendar(user); }, "Redirecting to Google…");
  const exportData = () => {
    const data = { exportedAt: new Date().toISOString(), account: { name, email: user?.primaryEmailAddress?.emailAddress }, savedTrips: useTrip.getState().saved, editedItineraries: useEdits.getState().plans };
    download("pocketways-my-data.json", JSON.stringify(data, null, 2), "application/json");
    toast("Your data was downloaded");
  };
  const wipe = () => run("del", async () => {
    if (!user) return;
    await fetch("/api/me/data", { method: "DELETE" }).catch(() => {});
    await user.delete();
    useTrip.getState().clearSaved();
    await signOut({ redirectUrl: "/" });
  }, "Account deleted");

  const avatar = (cls: string) => (user?.hasImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.imageUrl} alt="" className={cn("object-cover", cls)} referrerPolicy="no-referrer" />
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
            <SignInButton mode="modal"><Button className="mt-4"><LogIn /> Sign in</Button></SignInButton>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-5">
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-lg font-semibold text-primary">
                {avatar("size-full") ?? initials}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-semibold tracking-tight">{name}</h1>
                <p className="truncate text-sm text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
                <p className="mt-1 text-xs text-muted-foreground">{since ? `Member since ${since}` : "Member"} · {saved} saved trip{saved === 1 ? "" : "s"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => signOut({ redirectUrl: "/" })}><LogOut /> Sign out</Button>
            </div>

            <SectionNav items={NAV} className="sticky top-[68px] z-10 -mx-4 mt-4 bg-background/90 px-4 py-2 backdrop-blur lg:hidden" />

            <div className="mt-4 grid gap-6 lg:grid-cols-[200px_1fr]">
              <SectionNav items={NAV} orientation="vertical" className="sticky top-[92px] hidden self-start lg:flex" />

              <div className="min-w-0 space-y-5">
                <Section id="profile" title="Profile" desc="How you appear in Pocketways.">
                  <Row title="Photo" desc="PNG, JPG or WebP, up to 5 MB.">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-surface-2 text-sm font-semibold text-primary">{avatar("size-full") ?? initials}</span>
                      <Button variant="outline" size="sm" disabled={busy === "photo"} onClick={() => fileRef.current?.click()}>
                        {busy === "photo" ? <Loader2 className="animate-spin" /> : <Camera />} Change
                      </Button>
                      {user.hasImage && (
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-bad" disabled={busy === "photo"} onClick={() => run("photo", async () => { await user.setProfileImage({ file: null }); }, "Photo removed")}>Remove</Button>
                      )}
                      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) return toast("Choose an image under 5 MB");
                        run("photo", async () => { await user.setProfileImage({ file }); }, "Photo updated");
                      }} />
                    </div>
                  </Row>
                  <Row title="Name" desc="Shown in your menu and on shared plans." stack>
                    <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (dirty) run("name", async () => { await user.update({ firstName: first.trim(), lastName: last.trim() }); }, "Profile saved"); }}>
                      <input className={input} aria-label="First name" placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} maxLength={40} />
                      <input className={input} aria-label="Last name" placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} maxLength={40} />
                      <div className="sm:col-span-2">
                        <Button type="submit" size="sm" disabled={!dirty || busy === "name"}>{busy === "name" ? <Loader2 className="animate-spin" /> : <Check />} Save changes</Button>
                      </div>
                    </form>
                  </Row>
                  <Row title="Email" desc="Comes from your Google account.">
                    <span className="truncate text-sm text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</span>
                  </Row>
                </Section>

                <Section id="preferences" title="Preferences" desc="Defaults used when you plan a trip.">
                  <Row title="Starting city" desc="Where trips begin unless you change it in the planner.">
                    <div className="w-full sm:w-52"><Dropdown label="Starting city" value={home} onChange={(v) => { setTrip({ from: v }); toast("Starting city updated"); }} options={originOptions} /></div>
                  </Row>
                </Section>

                <Section id="connections" title="Connected accounts" desc="Services Pocketways can use on your behalf.">
                  <Row icon={<GoogleIcon className="size-5" />} title="Google" desc={google ? google.emailAddress : "Sign in with Google to connect."}>
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
              <Button variant="outline" onClick={() => setDelOpen(false)}>Cancel</Button>
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
