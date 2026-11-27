import type { UserResource } from "@clerk/shared/types";

export const CAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";

/**
 * Sends the user to Google to grant calendar access, then back to this page.
 * Users who signed in with Google already have the account linked, so that one is re-authorized
 * with the extra scope; only users without Google get a new connection.
 */
export async function connectGoogleCalendar(user: UserResource) {
  const redirectUrl = location.href;
  const existing = user.externalAccounts.find((a) => a.provider === "google");
  const acc = existing
    ? await existing.reauthorize({ additionalScopes: [CAL_SCOPE], redirectUrl })
    : await user.createExternalAccount({ strategy: "oauth_google", redirectUrl, additionalScopes: [CAL_SCOPE] });
  const to = acc.verification?.externalVerificationRedirectURL;
  if (!to) throw new Error("Google did not return a redirect");
  location.href = to.toString();
}