import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import pool, { query } from "@/lib/db/server";
import { comparePassword, hashPassword } from "@/lib/auth/password";
import { sendAuthOtp } from "@/lib/email/smtp";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  appName: "EzyGo Couriers",
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET,
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    password: {
      // Keep bcrypt so users migrated from the existing auth system can
      // continue signing in with their current passwords.
      hash: hashPassword,
      verify: ({ hash, password }) => comparePassword(password, hash),
    },
  },
  emailVerification: {
    // The signup route creates and delivers the OTP before creating the user,
    // allowing rejected recipient addresses to be reported accurately.
    sendOnSignUp: false,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            prompt: "select_account",
            mapProfileToUser: (profile) => ({
              emailVerified: profile.email_verified,
            }),
          },
        }
      : {},
  user: {
    modelName: "users",
    fields: {
      name: "full_name",
      emailVerified: "email_verified",
      image: "avatar_url",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        fieldName: "phone",
      },
      role: {
        type: ["customer", "driver", "admin"],
        required: true,
        defaultValue: "customer",
        input: false,
        fieldName: "role",
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
        fieldName: "is_active",
      },
      authProvider: {
        type: ["email", "google"],
        required: true,
        defaultValue: "email",
        input: false,
        fieldName: "auth_provider",
      },
    },
  },
  session: {
    modelName: "auth_sessions",
    expiresIn: 60 * 60 * 24 * 7,
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    modelName: "auth_accounts",
    encryptOAuthTokens: true,
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    modelName: "auth_verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  advanced: {
    cookiePrefix: "ezygo",
    database: {
      // Existing business tables reference users.id as an integer. Preserve
      // that ID while using UUID strings for Better Auth-owned records.
      generateId: ({ model }) =>
        model === "user" || model === "users"
          ? false
          : crypto.randomUUID(),
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const result = await query<{ is_active: boolean }>(
            "SELECT is_active FROM users WHERE id = $1 LIMIT 1",
            [session.userId]
          );
          return result.rows[0]?.is_active === true;
        },
      },
    },
    account: {
      create: {
        after: async (account) => {
          if (account.providerId !== "google") return;

          await query(
            `UPDATE users
             SET google_id = COALESCE(google_id, $1),
                 auth_provider = 'google',
                 updated_at = NOW()
             WHERE id = $2`,
            [account.accountId, account.userId]
          );
        },
      },
    },
  },
  plugins: [
    emailOTP({
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: false,
      otpLength: 6,
      expiresIn: 60 * 10,
      allowedAttempts: 5,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }) {
        await sendAuthOtp({ to: email, otp, type });
      },
    }),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
