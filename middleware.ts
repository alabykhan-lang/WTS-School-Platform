import { NextRequest, NextResponse } from "next/server";

const WORKSPACE_SESSION_COOKIE = "wts_school_workspace_session";
const PORTAL_HOST = "portal.waytosuccessschools.com";

function requestHost(request: NextRequest) {
  return (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
}

/**
 * The public school website and the staff portal share one Vercel project,
 * but they are intentionally different user-facing surfaces. The portal
 * hostname is rewritten to the existing protected Workspace route without
 * changing the browser URL or creating a second authentication system.
 */
export function middleware(request: NextRequest) {
  if (requestHost(request) !== PORTAL_HOST) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (pathname !== "/" && pathname !== "/index.html" && pathname !== "/portal") {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.pathname = request.cookies.has(WORKSPACE_SESSION_COOKIE) ? "/workspace" : "/portal/sign-in";
  destination.search = request.nextUrl.search;
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};
