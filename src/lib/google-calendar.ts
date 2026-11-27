import { signIn } from "next-auth/react";

export const CAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";

/**
 * Sends the user to Google to grant calendar access, then back to this page.
 * It is a second Google sign-in with the extra scope (and offline access so the token can be refreshed).
 */
export async function connectGoogleCalendar() {
  await signIn(
    "google",
    { callbackUrl: location.href },
    { scope: `openid email profile ${CAL_SCOPE}`, access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
  );
}