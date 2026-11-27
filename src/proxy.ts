import { NextResponse, type NextRequest } from "next/server";

/**
 * Poll links are for signed-in people. This is the quick front door: with no session cookie at all, the visitor is
 * sent to the homepage before anything is rendered, so not even a loading screen shows. A cookie that is present
 * but expired or forged is caught by the poll page itself, which checks the session properly.
 */
export default function proxy(req: NextRequest) {
  const signedIn = req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
  if (signedIn) return NextResponse.next();
  const id = req.nextUrl.pathname.split("/")[2] ?? "";
  const to = req.nextUrl.clone();
  to.pathname = "/";
  to.search = /^[a-f0-9]{8}$/.test(id) ? `?next=${encodeURIComponent(`/poll/${id}`)}` : "";
  return NextResponse.redirect(to);
}

export const config = { matcher: "/poll/:path*" };
