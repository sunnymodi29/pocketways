"use client";

import { usePathname, useRouter } from "next/navigation";
import { cloneElement, isValidElement } from "react";

/** Set before leaving for Google, read after coming back, so we can say hello. */
export const WELCOME_KEY = "tw-welcome";

export type SignInReason = "calendar";

/**
 * Wrap any button: clicking it opens the sign-in page and brings the user back to where they were.
 * `reason` lets the page explain why sign-in is needed (for example the calendar button).
 */
export function SignInButton({ children, reason }: { children: React.ReactElement<{ onClick?: () => void }>; reason?: SignInReason }) {
  const router = useRouter();
  const pathname = usePathname();
  const open = () => {
    const next = pathname + (typeof location !== "undefined" ? location.search : "");
    const q = new URLSearchParams({ next });
    if (reason) q.set("reason", reason);
    router.push(`/signin?${q}`);
  };
  return isValidElement(children) ? cloneElement(children, { onClick: open }) : children;
}