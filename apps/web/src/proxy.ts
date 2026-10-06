import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Fast first gate: sends visitors with no session cookie to the login page.
 * This only looks at the cookie. Every page and route still checks the real
 * session on the server before showing anything.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the login page, auth API, public profiles (opt-in, totals
  // only; each page checks the profile is turned on), invite links (they only
  // show who sent them), Next.js internals, and static files.
  matcher: [
    "/((?!login|api/auth|u/|invite/|_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt).*)",
  ],
};
