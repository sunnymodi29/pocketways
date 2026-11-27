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
  /** Open the sign-in popup from anywhere. `title` and `description` say why sign-in is needed. */
  ask: (opts?: { title?: string; description?: string }) => void;
  setOpen: (open: boolean) => void;
}

export const useSignInPrompt = create<Prompt>((set) => ({
  open: false,
  ...DEFAULT_PROMPT,
  ask: (opts) => set({ open: true, title: opts?.title ?? DEFAULT_PROMPT.title, description: opts?.description ?? DEFAULT_PROMPT.description }),
  setOpen: (open) => set({ open }),
}));
