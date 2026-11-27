"use client";

import { create } from "zustand";

export const DEFAULT_PROMPT = {
  title: "Sign in to Pocketways",
  description: "Keep your trips, edits and calendar plans in one place.",
};

interface Prompt {
  open: boolean;
  title: string;
  description: string;
  /** where to land after Google (a path on this site); empty means the page they are on */
  next: string;
  /** Open the sign-in popup from anywhere. `title` and `description` say why sign-in is needed. */
  ask: (opts?: { title?: string; description?: string; next?: string }) => void;
  setOpen: (open: boolean) => void;
}

export const useSignInPrompt = create<Prompt>((set) => ({
  open: false,
  ...DEFAULT_PROMPT,
  next: "",
  ask: (opts) => set({ open: true, title: opts?.title ?? DEFAULT_PROMPT.title, description: opts?.description ?? DEFAULT_PROMPT.description, next: opts?.next ?? "" }),
  setOpen: (open) => set({ open }),
}));
