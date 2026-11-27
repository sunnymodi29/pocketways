"use client";

import { useAccount } from "./use-account";
import { useSignInPrompt } from "./sign-in-prompt";

/**
 * For features that need an account. `gate(why, action)` runs the action when signed in,
 * and otherwise opens the sign-in popup with `why` as its message. `locked` drives the lock icons.
 */
export function useGate() {
  const { isLoaded, isSignedIn } = useAccount();
  const ask = useSignInPrompt((s) => s.ask);
  const locked = isLoaded && !isSignedIn;
  const gate = (why: { title: string; description: string }, action: () => void) => {
    if (isSignedIn) action();
    else if (isLoaded) ask(why);
  };
  return { locked, gate };
}
