import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "@/db";
import { authAccounts, authSessions, authUsers, authVerificationTokens } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: { id: string; createdAt?: string } & DefaultSession["user"];
  }
}

/**
 * Google sign-in with sessions stored in Neon. Works on any domain, including *.vercel.app.
 * Sign-in asks for basic profile access only; Calendar access is requested later (see lib/google-calendar.ts).
 * Env: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const db = await getDb();
  return {
    adapter: DrizzleAdapter(db, {
      usersTable: authUsers,
      accountsTable: authAccounts,
      sessionsTable: authSessions,
      verificationTokensTable: authVerificationTokens,
    }),
    providers: [Google],
    session: { strategy: "database" },
    trustHost: true,
    pages: { signIn: "/signin" }, // our own page, so Auth.js never shows its default one
    callbacks: {
      session({ session, user }) {
        session.user.id = user.id;
        const created = (user as { createdAt?: Date }).createdAt;
        if (created) session.user.createdAt = new Date(created).toISOString();
        return session;
      },
    },
    events: {
      // The adapter only stores tokens when an account is first linked. Re-authorising (for example to
      // add Calendar access) must refresh the stored tokens and scope as well.
      async signIn({ account }) {
        if (account?.provider !== "google" || !account.providerAccountId) return;
        const set: Partial<typeof authAccounts.$inferInsert> = {};
        if (account.access_token) set.access_token = account.access_token;
        if (account.refresh_token) set.refresh_token = account.refresh_token;
        if (account.expires_at) set.expires_at = account.expires_at;
        if (account.scope) set.scope = account.scope;
        if (!Object.keys(set).length) return;
        await db.update(authAccounts).set(set).where(and(eq(authAccounts.provider, "google"), eq(authAccounts.providerAccountId, account.providerAccountId)));
      },
    },
  };
});