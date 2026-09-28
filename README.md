# EzyGo Couriers

EzyGo is a Next.js courier platform backed by PostgreSQL. Authentication is
provided by [Better Auth](https://www.better-auth.com/) with email/password,
Google OAuth, database-backed sessions, and application roles for customers,
drivers, and administrators.

The application-owned API contract is documented in
[`docs/api-contracts.md`](docs/api-contracts.md). Shared request schemas and
response-envelope types live in the [`@ezygo/contracts`](packages/contracts)
workspace package.

Native client authentication, secure token storage, renewal, and logout are
documented in [`docs/mobile-authentication.md`](docs/mobile-authentication.md).

The customer-first installable web-app strategy and deployment checks are
documented in [`docs/customer-pwa.md`](docs/customer-pwa.md).

Customer/driver mobile workflows, push setup, offline policy, device testing,
security gates and the Expo decision are documented in
[`docs/mobile-experience-rollout.md`](docs/mobile-experience-rollout.md).

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

If Google authentication will be initiated from the admin hostname, also add:

```text
https://admin.ezygocouriers.co.za/api/auth/callback/google
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
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

This uses the production-style image for the current branch and exposes it only
on [http://localhost:3000](http://localhost:3000). To run it in the background,
add `-d`. View its logs and stop it with:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml logs -f app
docker compose -f docker-compose.yml -f docker-compose.local.yml down
```

The PostgreSQL data is kept in the `postgres_data` Docker volume between runs.
Use `down -v` only when you intentionally want a clean local database; it
deletes that volume and all of its local data.

Or run the development server directly:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Better Auth database migration

New Docker database volumes run the SQL scripts automatically. Existing Docker
database volumes are migrated automatically by the `migrate` service before the
application starts. To apply an individual migration manually, use:

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

Apply the payment-attempt integrity migration as well:

```bash
docker compose exec -T db sh -c 'psql -U "$DB_USER" -d "$DB_NAME"' \
  < scripts/sql/004_payment_attempt_integrity.sql
```

## Automatic driver assignment

Apply the driver-location migration to existing database volumes:

```bash
docker compose exec -T db sh -c 'psql -U "$DB_USER" -d "$DB_NAME"' \
  < scripts/sql/005_driver_location_auto_assignment.sql
```

Apply the recipient PIN migration to existing database volumes:

```bash
docker compose exec -T db sh -c 'psql -U "$DB_USER" -d "$DB_NAME"' \
  < scripts/sql/006_delivery_recipient_pin.sql
```

Apply the delivery-success email migration to existing database volumes:

```bash
docker compose exec -T db sh -c 'psql -U "$DB_USER" -d "$DB_NAME"' \
  < scripts/sql/007_delivery_completion_email.sql
```

Apply the multiple-payment-provider migration as well:

```bash
docker compose exec -T db sh -c 'psql -U "$DB_USER" -d "$DB_NAME"' \
  < scripts/sql/008_payment_providers.sql
```

Apply the Paystack provider migration:

```bash
docker compose exec -T db sh -c 'psql -U "$DB_USER" -d "$DB_NAME"' \
  < scripts/sql/009_paystack_provider.sql
```

Apply the browser push-subscription migration:

```bash
docker compose exec -T db sh -c 'psql -U "$DB_USER" -d "$DB_NAME"' \
  < scripts/sql/010_push_subscriptions.sql
```

Drivers explicitly start and stop foreground location sharing in the driver
portal. After payment, the
closest recently located active driver who has no assigned, picked-up, or
in-transit delivery is preferred. If no free driver has a fresh location, the
delivery falls back to the least-recently assigned active driver instead of
remaining unassigned. When a driver finishes a trip, they receive the oldest
waiting paid delivery. Configure proximity preference with
`AUTO_ASSIGNMENT_RADIUS_KM` and `DRIVER_LOCATION_MAX_AGE_MINUTES`.

The booking flow currently accepts only pickup and drop-off addresses inside
the Cape Town service area. This restriction is enforced in both Google Places
autocomplete and server-side delivery validation.

## Yoco test integration

Yoco is the only active checkout provider. Paystack and PayFast callbacks and
sandbox confirmation handlers are commented out and return HTTP 503. Their
client implementations are retained for restoration. The API rejects new
checkout requests for either disabled provider.

Set these server-only variables in your environment (see `.env.example`):

```dotenv
YOCO_SANDBOX=true
YOCO_SECRET_KEY=sk_test_your_key_here
YOCO_WEBHOOK_SECRET=whsec_your_webhook_secret_here
YOCO_APP_URL=https://your-public-app.example.com
```

Register `https://your-public-app.example.com/api/payments/yoco/webhook` with
the Yoco Checkout API using your test secret key, and save the returned webhook
secret as `YOCO_WEBHOOK_SECRET`. The webhook must be reachable from Yoco;
use a public HTTPS deployment or tunnel when testing locally. Restart the app
after changing environment variables. Never put secret keys in browser code.

Apply `scripts/sql/011_yoco_provider.sql` to an existing database; Docker's
migration service also runs it. Historical payment provider values are preserved.

Create a booking or retry an unpaid delivery to open Yoco checkout. Use the test
card details from your Yoco account. A browser success redirect only means the
payment was submitted: completion requires a valid signed Yoco webhook matching
the payment provider, mode, amount, currency and checkout ID.

Yoco references: [Accepting a payment](https://developer.yoco.com/guides/online-payments/accepting-a-payment)
and [Verifying webhook events](https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events).

## Admin subdomain

`admin.ezygocouriers.co.za` is rewritten internally from `/` to `/admin`, so
the browser keeps the clean subdomain root URL. Better Auth accepts the admin
hostname, and `BETTER_AUTH_COOKIE_DOMAIN=ezygocouriers.co.za` enables sessions
across the main site and trusted subdomains.

DNS currently resolves the admin hostname to `169.255.58.72`. For a first-time
HTTP setup on that Linux host, install the included Nginx template after
confirming that its `proxy_pass` matches the upstream used by the main site:

```bash
sudo cp deploy/nginx/admin.ezygocouriers.co.za.conf /etc/nginx/sites-available/admin
sudo ln -s /etc/nginx/sites-available/admin /etc/nginx/sites-enabled/admin
sudo nginx -t
sudo systemctl reload nginx
```

The Nginx template also maps the admin hostname's exact `/` request to the
upstream `/admin` route. This makes the clean root work even before or alongside
the Next.js hostname rewrite.

If Certbot has already created an HTTPS server block, do not overwrite the
active file. Merge the template's `location = /` block into the existing
`server_name admin.ezygocouriers.co.za` HTTPS block, then run `sudo nginx -t`
and reload Nginx.

After the HTTP site passes validation, obtain the certificate:

```bash
sudo certbot --nginx -d admin.ezygocouriers.co.za
```

## Verification

```bash
npm run build
```
