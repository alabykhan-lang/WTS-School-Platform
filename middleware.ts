import { NextRequest, NextResponse } from "next/server";
import { isStaffPortalHost } from "./data/portal-config";

const WORKSPACE_SESSION_COOKIE = "wts_school_workspace_session";

function requestHost(request: NextRequest) {
  return (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
}

function isProtectedRoute(pathname: string) {
  return pathname === "/workspace"
    || pathname.startsWith("/workspace/")
    || pathname === "/portal"
    || pathname.startsWith("/portal/");
}

/**
 * The public school website and the staff portal share one Vercel project,
 * but they are intentionally different user-facing surfaces. The portal
 * hostname is rewritten to the existing protected Workspace route without
 * changing the browser URL or creating a second authentication system.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const portalHost = isStaffPortalHost(requestHost(request));
  const requestHeaders = new Headers(request.headers);

  // These routes are the secured staff surface even when they are reached
  // through the public Vercel hostname. The root layout uses this marker to
  // keep the public header, footer and floating contact controls out.
  if (isProtectedRoute(pathname)) requestHeaders.set("x-wts-protected-route", "1");

  if (!portalHost) return NextResponse.next({ request: { headers: requestHeaders } });

  if (pathname !== "/" && pathname !== "/index.html" && pathname !== "/portal") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const destination = request.nextUrl.clone();
  destination.pathname = request.cookies.has(WORKSPACE_SESSION_COOKIE) ? "/workspace" : "/portal/sign-in";
  destination.search = request.nextUrl.search;
  requestHeaders.set("x-wts-protected-route", "1");
  return NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};
