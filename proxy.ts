import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

// ─── Route Definitions ────────────────────────────────────────────────────────

// Routes that require a valid session (any role)
const PROTECTED_ROUTES = ["/dashboard", "/profile"];

// Routes restricted to drivers only (login page excluded — it's public)
const DRIVER_ROUTES = ["/driver"];
const DRIVER_PUBLIC = ["/driver/login"];

// Routes restricted to admins only (login page excluded — it's public)
const ADMIN_ROUTES = ["/admin"];
const ADMIN_PUBLIC = ["/admin/login"];

// Routes that logged-in users should not be able to revisit
const AUTH_ROUTES = ["/auth/login", "/auth/signup", "/driver/login", "/admin/login"];

// ─── Dashboard redirect per role ─────────────────────────────────────────────
const ROLE_HOME: Record<string, string> = {
  customer: "/dashboard",
  driver:   "/driver",
  admin:    "/admin",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function getSessionToken(req: NextRequest): string | undefined {
  return req.cookies.get("session_token")?.value;
}

/** Pass the request through, injecting x-pathname so server layouts can read it. */
function nextWithPathname(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

// ─── Proxy ────────────────────────────────────────────────────────────────────

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = getSessionToken(req);
  const session = token ? verifyToken(token) : null;

  // ── 1. Logged-in users trying to access auth pages ──────────────────────────
  if (matchesRoute(pathname, AUTH_ROUTES)) {
    if (session) {
      const home = ROLE_HOME[session.role] ?? "/dashboard";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return nextWithPathname(req);  // still inject x-pathname so layouts can detect the login page
  }

  // ── 2. Admin-only routes ─────────────────────────────────────────────────────
  if (matchesRoute(pathname, ADMIN_ROUTES) && !ADMIN_PUBLIC.includes(pathname)) {
    if (!session) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "admin") {
      const home = ROLE_HOME[session.role] ?? "/dashboard";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return nextWithPathname(req);
  }

  // ── 3. Driver-only routes ────────────────────────────────────────────────────
  if (matchesRoute(pathname, DRIVER_ROUTES) && !DRIVER_PUBLIC.includes(pathname)) {
    if (!session) {
      const loginUrl = new URL("/driver/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "driver") {
      const home = ROLE_HOME[session.role] ?? "/dashboard";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return nextWithPathname(req);
  }

  // ── 4. General protected routes (any authenticated role) ────────────────────
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    if (!session) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return nextWithPathname(req);
  }

  // ── 5. Everything else is public ─────────────────────────────────────────────
  return nextWithPathname(req);
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
// Runs on all routes except Next.js internals and static assets

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|icons|fonts|robots.txt|sitemap.xml).*)",
  ],
};
