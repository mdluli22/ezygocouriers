import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { auth } from "@/lib/auth/auth";

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
const AUTH_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/verify-email",
  "/driver/login",
  "/admin/login",
];

// ─── Dashboard redirect per role ─────────────────────────────────────────────
const ROLE_HOME: Record<string, string> = {
  customer: "/dashboard",
  driver:   "/driver",
  admin:    "/admin",
};

const ADMIN_HOSTNAME = "admin.ezygocouriers.co.za";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function getRoleHome(role: string, req: NextRequest): string {
  if (role === "admin" && req.nextUrl.hostname === ADMIN_HOSTNAME) return "/";
  return ROLE_HOME[role] ?? "/dashboard";
}

/** Pass the request through, injecting x-pathname so server layouts can read it. */
function nextWithPathname(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

// ─── Proxy ────────────────────────────────────────────────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);
  const isProtectedRoute =
    matchesRoute(pathname, PROTECTED_ROUTES) ||
    (matchesRoute(pathname, ADMIN_ROUTES) && !ADMIN_PUBLIC.includes(pathname)) ||
    (matchesRoute(pathname, DRIVER_ROUTES) && !DRIVER_PUBLIC.includes(pathname));

  // Public routes do not need a database session lookup.
  if (!isAuthRoute && !isProtectedRoute) {
    return nextWithPathname(req);
  }

  const hasSessionCookie = getSessionCookie(req, { cookiePrefix: "ezygo" });
  const session = hasSessionCookie
    ? await auth.api.getSession({ headers: req.headers })
    : null;
  const role =
    session?.user.isActive === true && session.user.emailVerified === true
      ? session.user.role
      : null;

  // ── 1. Logged-in users trying to access auth pages ──────────────────────────
  if (isAuthRoute) {
    if (role) {
      const home = getRoleHome(role, req);
      return NextResponse.redirect(new URL(home, req.url));
    }
    return nextWithPathname(req);  // still inject x-pathname so layouts can detect the login page
  }

  // ── 2. Admin-only routes ─────────────────────────────────────────────────────
  if (matchesRoute(pathname, ADMIN_ROUTES) && !ADMIN_PUBLIC.includes(pathname)) {
    if (!role) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "admin") {
      const home = getRoleHome(role, req);
      return NextResponse.redirect(new URL(home, req.url));
    }
    return nextWithPathname(req);
  }

  // ── 3. Driver-only routes ────────────────────────────────────────────────────
  if (matchesRoute(pathname, DRIVER_ROUTES) && !DRIVER_PUBLIC.includes(pathname)) {
    if (!role) {
      const loginUrl = new URL("/driver/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "driver") {
      const home = getRoleHome(role, req);
      return NextResponse.redirect(new URL(home, req.url));
    }
    return nextWithPathname(req);
  }

  // ── 4. General protected routes (any authenticated role) ────────────────────
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    if (!role) {
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
