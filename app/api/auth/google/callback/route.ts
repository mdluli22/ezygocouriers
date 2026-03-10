import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/server";
import { setSessionCookie } from "@/lib/auth/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  error?: string;
}

interface GoogleUserInfo {
  sub: string;         // Google user ID
  name: string;
  email: string;
  picture: string;
  email_verified: boolean;
}

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  return response.json();
}

async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // User denied access or error from Google
  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=google_denied`);
  }

  try {
    // 1. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (tokens.error) {
      console.error("[Google OAuth] Token exchange failed:", tokens.error);
      return NextResponse.redirect(`${APP_URL}/auth/login?error=google_failed`);
    }

    // 2. Get Google user info
    const googleUser = await getGoogleUserInfo(tokens.access_token);
    if (!googleUser.email) {
      return NextResponse.redirect(`${APP_URL}/auth/login?error=google_no_email`);
    }

    // 3. Find or create user in PostgreSQL
    // First try by google_id, then by email (handles existing email/password users linking Google)
    let user = await query<{
      id: number;
      full_name: string;
      email: string;
      role: string;
      is_active: boolean;
    }>(
      `SELECT id, full_name, email, role, is_active
       FROM users WHERE google_id = $1 OR email = $2 LIMIT 1`,
      [googleUser.sub, googleUser.email]
    );

    let dbUser = user.rows[0];

    if (dbUser) {
      // 4a. User exists — update google_id and avatar if not already set
      await query(
        `UPDATE users
         SET google_id = COALESCE(google_id, $1),
             avatar_url = COALESCE(avatar_url, $2),
             updated_at = NOW()
         WHERE id = $3`,
        [googleUser.sub, googleUser.picture, dbUser.id]
      );
    } else {
      // 4b. New user — create account
      const newUser = await query<{
        id: number;
        full_name: string;
        email: string;
        role: string;
        is_active: boolean;
      }>(
        `INSERT INTO users
           (full_name, email, google_id, avatar_url, auth_provider, role, email_verified)
         VALUES ($1, $2, $3, $4, 'google', 'customer', $5)
         RETURNING id, full_name, email, role, is_active`,
        [
          googleUser.name,
          googleUser.email,
          googleUser.sub,
          googleUser.picture,
          googleUser.email_verified,
        ]
      );
      dbUser = newUser.rows[0];
    }

    // 5. Check account is active
    if (!dbUser.is_active) {
      return NextResponse.redirect(`${APP_URL}/auth/login?error=account_suspended`);
    }

    // 6. Set our own JWT session cookie
    await setSessionCookie({
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role as "customer" | "driver" | "admin",
    });

    // 7. Redirect to the correct dashboard based on role
    const dashboardMap: Record<string, string> = {
      customer: "/dashboard/deliveries/new",
      driver: "/driver",
      admin: "/admin",
    };

    const destination = dashboardMap[dbUser.role] ?? "/dashboard/deliveries/new";
    return NextResponse.redirect(`${APP_URL}${destination}`);
  } catch (error) {
    console.error("[GET /api/auth/google/callback]", error);
    return NextResponse.redirect(`${APP_URL}/auth/login?error=server_error`);
  }
}
