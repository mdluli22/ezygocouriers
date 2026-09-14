# EzyGo API Contracts

This document defines the current application-owned HTTP API that the EzyGo web client and future PWA or mobile clients may consume. The contract is version `1` and remains on the existing unversioned `/api` paths for backward compatibility.

Every application-owned JSON response includes this header:

```http
X-EzyGo-API-Version: 1
```

The Zod request schemas, domain constants, and TypeScript transport models are maintained in the dependency-neutral [`@ezygo/contracts`](../packages/contracts) workspace package. Route handlers must parse JSON with [`lib/api/validation.ts`](../lib/api/validation.ts) so malformed JSON returns a client error instead of an internal server error.

## Compatibility Policy

The following changes are backward compatible within contract version `1`:

- adding an optional response field;
- adding a new endpoint or HTTP method;
- adding a new error code without changing the HTTP status meaning;
- adding a new delivery status only after all version `1` clients can safely display an unknown status.

The following changes require a new contract version:

- removing or renaming a field;
- changing a field type or nullability;
- changing an endpoint path or HTTP method;
- making an optional request field required;
- changing authentication or authorization semantics;
- changing a successful response into a redirect or non-JSON response.

Provider callbacks and Better Auth's generated endpoints are integration contracts rather than EzyGo client contracts. They are listed separately below.

## Transport and Authentication

- Production clients must use HTTPS.
- First-party endpoints currently authenticate with the EzyGo Better Auth session cookie.
- Browser requests should use same-origin URLs. Installed mobile clients use the versioned Bearer-session flow documented in [`mobile-authentication.md`](mobile-authentication.md).
- Protected routes return `401` when no valid session exists and `403` when the authenticated role lacks permission.
- JSON requests must send `Content-Type: application/json`.
- Timestamps are ISO 8601 strings returned by PostgreSQL or the server runtime.
- Monetary database values are currently returned as decimal strings unless an endpoint explicitly documents a number.

## Standard JSON Envelopes

### Success

```json
{
  "success": true,
  "message": "Deliveries fetched.",
  "data": {}
}
```

`data` may be an object, array, scalar, or `null`.

### Error

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Please fix the errors below.",
  "errors": {
    "pickup_contact_phone": "Please enter a valid South African phone number"
  }
}
```

`errors` is `null` when the error is not tied to specific fields.

| Code | Default status | Meaning |
| --- | ---: | --- |
| `BAD_REQUEST` | 400 | The request cannot be applied as sent. |
| `INVALID_JSON` | 400 | The body is not valid JSON. |
| `VALIDATION_ERROR` | 422 | One or more request fields or query parameters are invalid. |
| `UNAUTHORIZED` | 401 | A valid session is required. |
| `FORBIDDEN` | 403 | The current role may not perform the operation. |
| `NOT_FOUND` | 404 | The requested resource does not exist or is not visible to this user. |
| `CONFLICT` | 409 | The operation conflicts with current state. |
| `SERVICE_UNAVAILABLE` | 503 | A required provider or server dependency is unavailable. |
| `INTERNAL_ERROR` | 500 | The server could not complete the request. |

## Shared Domain Values

### User roles

`customer`, `driver`, `admin`

### Delivery statuses

`pending`, `quoted`, `confirmed`, `paid`, `assigned`, `picked_up`, `in_transit`, `delivered`, `failed`, `cancelled`

Allowed transitions are exported by `@ezygo/contracts` and are always enforced on the server.

### Address

```ts
interface AddressInput {
  formatted_address: string;
  street_address?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  latitude: number;
  longitude: number;
  building_or_business?: string;
  apt_suite?: string;
  meeting_option?: "meet_at_curb" | "meet_at_door" | "leave_at_door" | null;
  notes?: string;
}
```

Pickup and drop-off coordinates must be inside the configured Cape Town service area.

## Authentication Endpoints

### POST `/api/auth/signup`

Access: Public

Request:

```ts
{
  full_name: string;       // 2 to 255 characters
  email: string;
  phone?: string;          // South African mobile number
  password: string;        // at least 8 chars, 1 uppercase, 1 number
  confirm_password: string;
}
```

Success: `201`

```ts
{
  id: number;
  full_name: string;
  email: string;
  role: "customer";
  requires_verification: true;
}
```

Important errors: `409` duplicate email, `422` invalid input or rejected recipient, `502` email delivery failure, `503` SMTP unavailable.

### POST `/api/auth/login`

Access: Public

Request: `{ email: string; password: string }`

Success data:

```ts
{
  id: number;
  full_name: string;
  email: string;
  role: "customer" | "driver" | "admin";
}
```

Important errors: `401` invalid credentials, `403` unverified or unavailable account, `422` invalid input.

### POST `/api/auth/logout`

Access: Session optional. Invalidates the active session when present.

Success data: `null`

### GET `/api/auth/me`

Access: Any authenticated role

Success data:

```ts
{
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: "customer" | "driver" | "admin";
  avatar_url: string | null;
  auth_provider: string;
  is_active: boolean;
  created_at: string;
}
```

## Mobile Authentication Endpoints

Native clients use signed opaque Bearer sessions. Full request examples, secure-storage requirements, and the client lifecycle are documented in [`mobile-authentication.md`](mobile-authentication.md).

| Method and path | Access | Success data |
| --- | --- | --- |
| `POST /api/mobile/v1/auth/signup` | Public | New user with `requires_verification: true`; no token |
| `POST /api/mobile/v1/auth/verify-email` | Public with OTP | Bearer token, expiry, and user |
| `POST /api/mobile/v1/auth/send-verification` | Public | `null` |
| `POST /api/mobile/v1/auth/login` | Public | Bearer token, expiry, and user |
| `GET /api/mobile/v1/auth/session` | Bearer session | Expiry and user |
| `POST /api/mobile/v1/auth/refresh` | Bearer session | Renewed Bearer token, expiry, and user |
| `POST /api/mobile/v1/auth/logout` | Bearer session | `null` |

The token must be sent as `Authorization: Bearer <access_token>`. Bearer authentication is accepted by the existing protected application endpoints as well as the mobile session endpoints. Token-bearing responses are non-cacheable.

## Customer Delivery Endpoints

### GET `/api/deliveries`

Access: Customer

Success data: `CustomerDeliverySummary[]`

```ts
interface CustomerDeliverySummary {
  id: number;
  tracking_number: string;
  status: DeliveryStatus;
  recipient_name: string;
  recipient_phone: string;
  parcel_description: string;
  package_type: string | null;
  package_category: string | null;
  fragile: boolean;
  require_pin: boolean;
  scheduled_time: string | null;
  created_at: string;
  updated_at: string;
  pickup_street: string;
  pickup_city: string;
  dropoff_street: string;
  dropoff_city: string;
  quote_amount: string | null;
  quote_currency: string | null;
}
```

### POST `/api/deliveries`

Access: Customer

Request:

```ts
{
  pickup_address: AddressInput;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  dropoff_address: AddressInput;
  recipient_name: string;
  recipient_phone: string;
  recipient_email?: string;
  parcel_description: string;
  special_instructions?: string;
  package_type?: "small" | "medium" | "large";
  package_category?: string;
  fragile?: boolean;
  require_pin?: boolean;
  scheduled_time?: string | null;
  payment_method: "paystack";
}
```

When `require_pin` is true, `recipient_email` is required. `scheduled_time` must be an ISO 8601 timestamp with an offset.

Success: `201`

```ts
{
  id: number;
  trackingNumber: string;
  quote: { amount: number; currency: string };
  payment: PaymentCheckout;
}
```

This operation creates the delivery, confirms its quote, creates a payment attempt, and returns the hosted checkout URL. A failed response does not guarantee that no intermediate record was created; clients should reload the delivery list before blindly retrying after an unknown network failure.

### GET `/api/deliveries/{id}`

Access: Customer who owns the delivery

Path: `id` is a positive integer.

Success data: `{ delivery: CustomerDeliveryDetail; logs: DeliveryStatusLog[] }`

The delivery object contains the delivery table fields plus pickup and drop-off address fields, quote fields, and nullable `driver_name` and `driver_phone` fields. Clients should ignore unknown fields for forward compatibility.

### POST `/api/deliveries/{id}`

Access: Customer who owns the delivery

Request: `{ action: "confirm" | "cancel" }`

Success data: `null`

The server validates the current delivery status. Invalid state transitions return `400`.

## Driver Endpoints

### GET `/api/driver/deliveries`

Access: Driver

Success data: `DriverDeliverySummary[]`. Each item includes the delivery identifiers, current status, contacts, parcel fields, pickup and drop-off address summaries, quote amount and currency, and timestamps.

### GET `/api/driver/deliveries/{id}`

Access: Assigned driver

Success data: `{ delivery: DriverDeliveryDetail; logs: DeliveryStatusLog[] }`

The delivery includes full pickup and drop-off details, customer contact information and all delivery fields visible to the assigned driver.

### PATCH `/api/driver/status`

Access: Driver assigned to the delivery

Request:

```ts
{
  delivery_id: number;
  status: DeliveryStatus;
  note?: string;           // maximum 500 characters
  pin?: string;            // exactly 6 digits when required
}
```

Success data: `null`

The server enforces assignment ownership and the allowed status transition. A correct PIN is required when completing a PIN-protected delivery.

### PATCH `/api/driver/location`

Access: Driver

Request: `{ latitude: number; longitude: number }`

Success data:

```ts
{
  assignment: {
    deliveryId: number;
    driverId: number;
    distanceKm: number | null;
  } | null;
}
```

The location update may immediately assign a waiting paid delivery. Clients must tolerate `assignment: null`.

## Payment Endpoints

### POST `/api/payments/create`

Access: Customer who owns the delivery

Request: `{ delivery_id: number; payment_method: "paystack" }`

The delivery must currently be `confirmed`.

Success data:

```ts
interface PaymentCheckout {
  provider: "paystack";
  redirect_url: string;
  checkout_id: string;
  demo_mode: boolean;
  payment_id: number;
  delivery_id: number;
}
```

The client opens `redirect_url` in a secure browser. Payment is complete only after the backend verifies the provider callback or webhook.

### POST `/api/payments/sandbox-confirm`

Access: Customer. PayFast sandbox only; retained for compatibility while PayFast checkout is disabled.

Request: `{ delivery_id: number; payment_id: number }`

Success data: `null`

## Administration Endpoints

All administration endpoints require the `admin` role.

| Method and path | Request | Success data |
| --- | --- | --- |
| `GET /api/admin/deliveries?status={status}` | Optional status; defaults to `all` | Delivery administration rows |
| `PATCH /api/admin/deliveries` | `{ delivery_id: number; driver_id: number }` | `null` |
| `GET /api/admin/drivers` | None | Driver administration rows |
| `POST /api/admin/drivers` | Driver identity, password, licence and vehicle fields | `{ userId, driverId, verification_email_sent }` |
| `PATCH /api/admin/drivers` | `{ driver_id: number }` | `null` |
| `GET /api/admin/pricing` | None | Pricing rule rows |
| `PATCH /api/admin/pricing` | `{ rule_id: number; flat_fee: number }` | `null` |
| `GET /api/admin/users?role={role}` | Optional `customer`, `driver`, or `admin` | User administration rows |
| `PATCH /api/admin/users` | `{ user_id: number }` | `null` |

Invalid `status` and `role` query parameters return `422`. They are never interpolated directly into SQL.

## Common Data Shapes

```ts
type DeliveryStatus =
  | "pending"
  | "quoted"
  | "confirmed"
  | "paid"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "cancelled";

interface DeliveryStatusLog {
  id: number;
  status: DeliveryStatus;
  note: string | null;
  created_at: string;
  updated_by_name: string | null;
}
```

## Provider and Framework Managed Endpoints

These endpoints are not called as ordinary PWA data APIs:

| Method and path | Consumer | Response contract |
| --- | --- | --- |
| `GET/POST /api/auth/[...all]` | Better Auth clients and OAuth providers | Managed by Better Auth; some SMTP preflight failures return `{ code, message }`. |
| `GET /api/payments/paystack/callback` | Paystack hosted checkout | Redirects to `/dashboard` with payment query parameters. |
| `POST /api/payments/paystack/webhook` | Paystack | Plain text acknowledgement or error. |
| `POST /api/payments/callback` | PayFast ITN | Plain text acknowledgement or error. |
| `POST /api/payments/yoco/webhook` | Yoco | Plain text acknowledgement or error. |

Provider webhook bodies and signatures must be processed exactly as received. Do not pass them through the standard JSON body parser.

## Client Implementation Rules

- Branch on the HTTP status and `success` field, not the English `message`.
- Use `code` for program flow and `errors` for field-level feedback.
- Treat unknown response fields as compatible additions.
- Treat unknown delivery statuses as displayable but non-actionable until the client is updated.
- Do not mark a payment complete because the hosted browser returned. Reload the delivery or payment state from the server.
- Retry GET requests after transient failures. Retry mutations only when the endpoint is documented as idempotent or after reloading server state.
- Never send payment-provider secret keys, SMTP credentials or database credentials from a client.
