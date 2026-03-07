import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

// ─── Route Definitions ────────────────────────────────────────────────────────

// Routes that require a valid session (any role)
const PROTECTED_ROUTES = ["/dashboard", "/profile"];

// Routes restricted to drivers only
const DRIVER_ROUTES = ["/driver"];

// Routes restricted to admins only
const ADMIN_ROUTES = ["/admin"];

// Routes that logged-in users should not be able to revisit
const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

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
    return NextResponse.next();
  }

  // ── 2. Admin-only routes ─────────────────────────────────────────────────────
  if (matchesRoute(pathname, ADMIN_ROUTES)) {
    if (!session) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "admin") {
      const home = ROLE_HOME[session.role] ?? "/dashboard";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  // ── 3. Driver-only routes ────────────────────────────────────────────────────
  if (matchesRoute(pathname, DRIVER_ROUTES)) {
    if (!session) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "driver") {
      const home = ROLE_HOME[session.role] ?? "/dashboard";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  // ── 4. General protected routes (any authenticated role) ────────────────────
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    if (!session) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── 5. Everything else is public ─────────────────────────────────────────────
  return NextResponse.next();
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
// Runs on all routes except Next.js internals and static assets

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|icons|fonts|robots.txt|sitemap.xml).*)",
  ],
};
