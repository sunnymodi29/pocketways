"use client";

import { useSession } from "next-auth/react";

/** The signed-in user, in one small shape. Wraps Auth.js so components don't depend on it directly. */
export function useAccount() {
  const { data, status, update } = useSession();
  const user = data?.user;
  return {
    isLoaded: status !== "loading",
    isSignedIn: status === "authenticated" && !!user,
    user: user ? { id: user.id, name: user.name ?? "", email: user.email ?? "", image: user.image ?? "", createdAt: user.createdAt } : null,
    /** re-read the session after the profile changed */
    refresh: () => update(),
  };
}