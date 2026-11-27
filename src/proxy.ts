import { clerkMiddleware } from "@clerk/nextjs/server";

// Every page stays public; Clerk only reads the session so API routes can call auth().
export default clerkMiddleware();

export const config = {
  matcher: [
    // skip Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};