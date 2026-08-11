# EzyGo Couriers

EzyGo is a Next.js courier platform backed by PostgreSQL. Authentication is
provided by [Better Auth](https://www.better-auth.com/) with email/password,
Google OAuth, database-backed sessions, and application roles for customers,
drivers, and administrators.

## Getting started

Copy the environment template and configure the required values:

```bash
cp .env.example .env
```

`BETTER_AUTH_SECRET` must contain at least 32 high-entropy characters. Generate
one with:

```bash
openssl rand -base64 32
```

For Google sign-in, configure this OAuth callback in Google Cloud:

```text
http://localhost:3000/api/auth/callback/google
```

Use the production domain in place of `localhost` for production.
For this deployment, the production callback is:

```text
https://ezygocouriers.co.za/api/auth/callback/google
```

The legacy `/api/auth/google/callback` route is no longer used. If the app is
served from another hostname, add it to `BETTER_AUTH_ALLOWED_HOSTS` as well.

Email/password accounts require a six-digit verification code. Configure the
existing SMTP mailbox with:

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
```

Replace every placeholder value with credentials for a real mailbox. The SMTP
username is normally the full mailbox address, and the password is the mailbox
or app-specific SMTP password. Restart the application after changing these
values. Signup checks the SMTP connection before creating an account so it does
not claim that a code was sent when the mail server rejected the credentials.
Use `SMTP_PORT=587` with `SMTP_SECURE=false` for STARTTLS, or port `465` with
`SMTP_SECURE=true` for implicit TLS.

Codes expire after ten minutes and are limited to five verification attempts.
Google accounts use the provider's verified-email status.

Start PostgreSQL and the app with Docker:

```bash
docker compose up --build
```

Or run the development server directly:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Better Auth database migration

New Docker database volumes run the SQL scripts automatically. For an existing
database, apply the migration once before deploying the new application code:

```bash
docker compose exec -T db sh -c 'psql -U "$DB_USER" -d "$DB_NAME"' \
  < scripts/sql/002_better_auth.sql
```

The migration preserves existing integer user IDs, roles, foreign keys, Google
identities, and bcrypt password hashes. Existing sessions from the previous JWT
implementation are intentionally invalidated.

## Delivery checkout database migration

Existing database volumes also need the structured delivery and payment
compatibility migration:

```bash
docker compose exec -T db sh -c 'psql -U "$DB_USER" -d "$DB_NAME"' \
  < scripts/sql/003_delivery_checkout_details.sql
```

The migration is idempotent and preserves existing deliveries, addresses, and
payments.

## PayFast sandbox testing

Set `PAYFAST_SANDBOX=true`. You can provide credentials from your own PayFast
sandbox account, or leave `PAYFAST_MERCHANT_ID` and `PAYFAST_MERCHANT_KEY` blank
to use PayFast's published shared test credentials.

For end-to-end ITN testing, `PAYFAST_APP_URL` (or `NEXT_PUBLIC_APP_URL`) must be
a public HTTPS origin. PayFast rejects localhost callback URLs. Local form-only
testing still works, but payment notifications cannot reach a local server
unless it is exposed through a public HTTPS tunnel.

## Verification

```bash
npm run build
```
