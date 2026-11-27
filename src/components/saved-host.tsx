"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CardInput } from "@/lib/share-card";
import { useTrip, type SavedTrip } from "@/lib/store";
import { CompareDialog, ShareCardDialog } from "./dialogs";
import { PollCreateDialog } from "./poll-create-dialog";
import { SavedPanel } from "./saved-panel";

/**
 * "My trips" panel for pages outside the planner (guides, polls).
 * Opening a saved trip hands off to the planner, which reads the same store.
 */
export function SavedHost() {
  const router = useRouter();
  const month = useTrip((s) => s.S.month);
  const [cmp, setCmp] = useState<SavedTrip[] | null>(null);
  const [card, setCard] = useState<CardInput | null>(null);

  useEffect(() => {
    // openSavedTrip sets started + selectedId and closes the panel: continue in the planner.
    return useTrip.subscribe((s, prev) => {
      if (s.started && s.selectedId && s.selectedId !== prev.selectedId) router.push("/");
    });
  }, [router]);

  const openTrip = (t: SavedTrip) => {
    setCmp(null);
    useTrip.getState().openSavedTrip(t);
    router.push("/");
  };

  return (
    <>
      <SavedPanel
        onFind={() => { useTrip.getState().closeSaved(); router.push("/"); }}
        onCard={(items) => setCard({ kind: "list", items, month })}
        onCompare={(items) => setCmp(items)}
      />
      <CompareDialog items={cmp} month={month} onClose={() => setCmp(null)} onOpenTrip={openTrip} />
      <PollCreateDialog />
      <ShareCardDialog input={card} onClose={() => setCard(null)} />
    </>
  );
}
