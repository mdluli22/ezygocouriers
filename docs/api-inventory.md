# Endpoint inventory — API v1

Generated from [api-inventory.json](api-inventory.json). Every exported method in `apps/web/app/api` is covered by the inventory test. Framework-generated HEAD/OPTIONS/405 behavior is not an application method. Schema and transport type names refer to `@ezygo/contracts`; full input details are in [API contracts](api-contracts.md).

All application responses use `ApiSuccess<T>` or `ApiFailure`, with `request_id` and `X-Request-ID`. Managed integrations keep their existing payloads and also get the request-ID header. Global size/time/rate errors are listed in the JSON inventory and [backend operations](backend-api-operations.md).

## GET `/api/admin/deliveries`

- **Request:** Query adminDeliveryQuerySchema: status=all|DeliveryStatus; no body
- **Response:** 200 AdminDelivery[]
- **Authorization:** Verified active administrator; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 422 VALIDATION_ERROR: invalid status; 500 INTERNAL_ERROR: unexpected dependency/server failure

## PATCH `/api/admin/deliveries`

- **Request:** adminAssignDriverSchema: {delivery_id,driver_id}
- **Response:** 200 null
- **Authorization:** Verified active administrator; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 404 NOT_FOUND: delivery missing; 400 INVALID_TRANSITION: delivery not paid/assigned; 409 CONFLICT: driver missing/inactive/busy; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/admin/drivers`

- **Request:** No body
- **Response:** 200 AdminDriver[]
- **Authorization:** Verified active administrator; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 500 INTERNAL_ERROR: unexpected dependency/server failure

## PATCH `/api/admin/drivers`

- **Request:** adminToggleDriverSchema: {driver_id}
- **Response:** 200 null; missing ID is currently a no-op
- **Authorization:** Verified active administrator; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/admin/drivers`

- **Request:** adminCreateDriverSchema: {full_name,email,phone,password,license_number,vehicle_type,vehicle_reg}
- **Response:** 201 {userId,driverId,verification_email_sent:boolean}
- **Authorization:** Verified active administrator; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 409 CONFLICT: duplicate email; email failure instead returns verification_email_sent:false after account creation; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/admin/pricing`

- **Request:** No body
- **Response:** 200 PricingRule[]
- **Authorization:** Verified active administrator; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 500 INTERNAL_ERROR: unexpected dependency/server failure

## PATCH `/api/admin/pricing`

- **Request:** adminUpdatePricingSchema: {rule_id,flat_fee:nonnegative number}
- **Response:** 200 null; missing ID is currently a no-op
- **Authorization:** Verified active administrator; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/admin/users`

- **Request:** Query adminUserQuerySchema: role?=customer|driver|admin; no body
- **Response:** 200 AdminUser[]
- **Authorization:** Verified active administrator; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 422 VALIDATION_ERROR: invalid role; 500 INTERNAL_ERROR: unexpected dependency/server failure

## PATCH `/api/admin/users`

- **Request:** adminToggleUserSchema: {user_id}
- **Response:** 200 null; missing ID is currently a no-op
- **Authorization:** Verified active administrator; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 403 FORBIDDEN: cannot deactivate self; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/auth/[...all]`

- **Request:** Better Auth 1.6 managed route/query/body (session, OAuth, email OTP, password recovery); not a native v1 contract
- **Response:** Provider JSON/redirect/Set-Cookie; SMTP preflight may return {code,message}
- **Authorization:** Better Auth per-operation session, origin/OAuth and OTP rules; outer shared limits on POST
- **Errors:** Provider-specific statuses/codes; POST OTP preflight: 503 SMTP_NOT_CONFIGURED or SMTP_UNAVAILABLE; 422 RECIPIENT_REJECTED; 502 EMAIL_DELIVERY_FAILED; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/auth/[...all]`

- **Request:** Better Auth 1.6 managed route/query/body (session, OAuth, email OTP, password recovery); not a native v1 contract
- **Response:** Provider JSON/redirect/Set-Cookie; SMTP preflight may return {code,message}
- **Authorization:** Better Auth per-operation session, origin/OAuth and OTP rules; outer shared limits on POST
- **Errors:** Provider-specific statuses/codes; POST OTP preflight: 503 SMTP_NOT_CONFIGURED or SMTP_UNAVAILABLE; 422 RECIPIENT_REJECTED; 502 EMAIL_DELIVERY_FAILED; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/auth/login`

- **Request:** loginSchema: {email,password}
- **Response:** 200 {id,full_name,email,role}; Set-Cookie
- **Authorization:** Public; network/account rate limits apply
- **Errors:** 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 401 UNAUTHORIZED: invalid credentials; 403 EMAIL_NOT_VERIFIED: verify email first; 403 FORBIDDEN: account cannot sign in; 429 RATE_LIMITED: account/network/provider limit; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/auth/logout`

- **Request:** No body
- **Response:** 200 null; revokes session; clears cookie
- **Authorization:** Cookie/Bearer session (provider sign-out semantics)
- **Errors:** 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/auth/me`

- **Request:** No body
- **Response:** 200 {id,full_name,email,phone,role,avatar_url,auth_provider,is_active,created_at}
- **Authorization:** Any verified active account; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing session or inactive/missing account; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/auth/signup`

- **Request:** signupSchema: {full_name,email,phone?,password,confirm_password}
- **Response:** 201 {id,full_name,email,role,requires_verification:true}
- **Authorization:** Public; network/account rate limits apply
- **Errors:** 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 409 CONFLICT: duplicate email; 422 VALIDATION_ERROR: recipient rejected; 502 INTERNAL_ERROR: email delivery failed; 503 SERVICE_UNAVAILABLE: SMTP not configured/unreachable; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/deliveries`

- **Request:** No body
- **Response:** 200 CustomerDeliverySummary[]
- **Authorization:** Verified active customer; ownership enforced using authenticated user ID; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/deliveries`

- **Request:** createDeliveryRequestSchema: AddressInput pickup/drop-off + contacts + parcel + optional instructions/PIN/schedule + payment_method:paystack
- **Response:** 201 CreateDeliveryResponse; booking + quote + hosted checkout
- **Authorization:** Verified active customer; ownership enforced using authenticated user ID; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 503 SERVICE_UNAVAILABLE: payment config unavailable; 409 CONFLICT: checkout state changed; reconcile before retry; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/deliveries/[id]`

- **Request:** Path id: positive integer; no body
- **Response:** 200 DeliveryDetailResponse<CustomerDeliveryDetail>
- **Authorization:** Verified active customer; ownership enforced using authenticated user ID; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 BAD_REQUEST: invalid ID; 404 NOT_FOUND: missing/unowned delivery; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/deliveries/[id]`

- **Request:** Path id: positive integer; customerDeliveryActionSchema: {action:confirm|cancel}
- **Response:** 200 null
- **Authorization:** Verified active customer; ownership enforced using authenticated user ID; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 400 BAD_REQUEST: invalid ID; 400 INVALID_TRANSITION: confirm/cancel forbidden in current state; 404 NOT_FOUND: missing/unowned delivery; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/driver/deliveries`

- **Request:** No body
- **Response:** 200 DriverDeliverySummary[]; only assigned trips
- **Authorization:** Verified active driver account; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/driver/deliveries/[id]`

- **Request:** Path id: positive integer; no body
- **Response:** 200 DeliveryDetailResponse<DriverDeliveryDetail>
- **Authorization:** Verified active driver account; cookie or signed Bearer token; only assigned driver
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 404 NOT_FOUND: invalid ID, missing trip or not assigned; 500 INTERNAL_ERROR: unexpected dependency/server failure

## PATCH `/api/driver/location`

- **Request:** driverLocationSchema: {latitude,longitude}
- **Response:** 200 DriverLocationResponse
- **Authorization:** Verified active driver account; cookie or signed Bearer token; active driver profile
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 403 FORBIDDEN: inactive/missing driver profile; 429 RATE_LIMITED: location update limit; 500 INTERNAL_ERROR: unexpected dependency/server failure

## PATCH `/api/driver/status`

- **Request:** driverStatusUpdateSchema: {delivery_id,status,note?,pin?}
- **Response:** 200 null
- **Authorization:** Verified active driver account; cookie or signed Bearer token; active driver profile; only assigned driver
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 404 NOT_FOUND: missing/unassigned trip; 400 INVALID_TRANSITION: illegal state change; 400 PIN_REQUIRED: missing six-digit PIN; 400 PIN_INVALID: incorrect PIN; 400 PIN_NOT_ISSUED: no server hash; 429 RATE_LIMITED: status/handover attempts; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/mobile/v1/auth/login`

- **Request:** loginSchema: {email,password}
- **Response:** 200 MobileAuthTokenData
- **Authorization:** Public; network/account rate limits apply
- **Errors:** 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 401 UNAUTHORIZED: invalid credentials; 403 EMAIL_NOT_VERIFIED: verify email first; 403 FORBIDDEN: account cannot sign in; 429 RATE_LIMITED: account/network/provider limit; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/mobile/v1/auth/logout`

- **Request:** No body
- **Response:** 200 null; revokes session
- **Authorization:** Valid signed Bearer token
- **Errors:** 401 UNAUTHORIZED: mobile token missing/invalid; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/mobile/v1/auth/refresh`

- **Request:** No body
- **Response:** 200 MobileAuthTokenData
- **Authorization:** Valid signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/inactive session; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/mobile/v1/auth/send-verification`

- **Request:** mobileSendVerificationSchema: {email}
- **Response:** 200 null; generic result when account cannot be verified
- **Authorization:** Public; network/account rate limits apply
- **Errors:** 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 502 INTERNAL_ERROR: SMTP delivery failed; 503 SERVICE_UNAVAILABLE: SMTP unavailable; 429 RATE_LIMITED: too many sends; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/mobile/v1/auth/session`

- **Request:** No body
- **Response:** 200 MobileSessionData
- **Authorization:** Valid signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/inactive session; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/mobile/v1/auth/signup`

- **Request:** signupSchema: {full_name,email,phone?,password,confirm_password}
- **Response:** 201 {id,full_name,email,role,requires_verification:true}
- **Authorization:** Public; network/account rate limits apply
- **Errors:** 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 409 CONFLICT: duplicate email; 422 VALIDATION_ERROR: recipient rejected; 502 INTERNAL_ERROR: email delivery failed; 503 SERVICE_UNAVAILABLE: SMTP not configured/unreachable; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/mobile/v1/auth/verify-email`

- **Request:** mobileVerifyEmailSchema: {email,otp: six digits}
- **Response:** 200 MobileAuthTokenData
- **Authorization:** Public; network/account rate limits apply
- **Errors:** 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 400 OTP_INVALID: invalid/expired code; 429 RATE_LIMITED: attempts exhausted; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/payments/callback`

- **Request:** Raw form-urlencoded PayFast ITN fields including m_payment_id, payment_status, signature
- **Response:** 200 plain text OK
- **Authorization:** PayFast ITN verification of signature, amount, source and provider validation
- **Errors:** 400 invalid ID/delivery mismatch/invalid notification; 404 attempt missing; 409 provider mismatch; 500 processing failure; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/payments/create`

- **Request:** createPaymentSchema: {delivery_id,payment_method:paystack}
- **Response:** 200 PaymentCheckout; reuses valid pending checkout
- **Authorization:** Verified active customer; ownership enforced using authenticated user ID; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 404 NOT_FOUND: missing/unowned delivery; 409 CONFLICT: not confirmed, different pending provider or legacy checkout needs reconciliation; 503 SERVICE_UNAVAILABLE: provider configuration unavailable; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/payments/paystack/callback`

- **Request:** Query reference:string (payment_id/delivery_id are not trusted)
- **Response:** 307 redirect to configured /dashboard?payment=success|failed&provider=paystack&delivery?
- **Authorization:** Public; server verifies provider transaction reference, amount, currency and mode
- **Errors:** Missing/unknown reference, mismatch or processing failure redirects with payment=failed; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/payments/paystack/webhook`

- **Request:** Raw JSON Paystack charge.success event; x-paystack-signature header
- **Response:** 200 plain text OK; irrelevant events acknowledged
- **Authorization:** HMAC-SHA512 of exact raw bytes plus amount/currency/reference/mode verification
- **Errors:** 401 invalid signature; 404 unknown reference; 400 payment details mismatch; 500 processing failure or conflicting completed transaction; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/payments/sandbox-confirm`

- **Request:** sandboxConfirmationSchema: {delivery_id,payment_id}
- **Response:** 200 null; PayFast sandbox only
- **Authorization:** Verified active customer; ownership enforced using authenticated user ID; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing/invalid/expired/revoked session; 403 FORBIDDEN: wrong role; 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 403 FORBIDDEN: live mode; 404 NOT_FOUND: missing/unowned attempt; 409 CONFLICT: wrong provider or non-pending/non-complete state; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/payments/yoco/webhook`

- **Request:** Raw Yoco event JSON; webhook-id, webhook-timestamp, webhook-signature headers
- **Response:** 200 plain text OK
- **Authorization:** Provider signature/timestamp plus provider/amount/currency/mode checks
- **Errors:** 400 signature/checkout ID/details mismatch; 404 attempt missing; 409 provider mismatch; 500 processing failure; 500 INTERNAL_ERROR: unexpected dependency/server failure

## GET `/api/push/config`

- **Request:** No body
- **Response:** 200 {enabled:boolean,publicKey:string|null}
- **Authorization:** Any verified active account; cookie or signed Bearer token
- **Errors:** 401 UNAUTHORIZED: missing session; 500 INTERNAL_ERROR: unexpected dependency/server failure

## DELETE `/api/push/subscriptions`

- **Request:** deletePushSubscriptionSchema: {endpoint}
- **Response:** 200 null; deletes only own endpoint
- **Authorization:** Any verified active account; cookie or signed Bearer token
- **Errors:** 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 401 UNAUTHORIZED: missing session; 500 INTERNAL_ERROR: unexpected dependency/server failure

## POST `/api/push/subscriptions`

- **Request:** pushSubscriptionSchema: {endpoint,expirationTime?,keys:{p256dh,auth}}
- **Response:** 200 null; upsert browser subscription
- **Authorization:** Any verified active account; cookie or signed Bearer token
- **Errors:** 400 INVALID_JSON: malformed JSON; 422 VALIDATION_ERROR: shared Zod schema rejected input; 401 UNAUTHORIZED: missing session; 500 INTERNAL_ERROR: unexpected dependency/server failure

## Native Google sign-in (Phase 3)

- `POST /api/mobile/v1/auth/google` — mobileGoogleStartSchema: {state,code_challenge}; S256 challenge. Response: 200 {authorization_url}. Authorization: Public; rate limited. Errors: OAuth handoff 400, validation 422, unavailable 503, unexpected 500.
- `GET /api/mobile/v1/auth/google/callback` — Query request; optional error; OAuth and browser cookies. Response: 307 ezygo://auth/callback?state&code (or error); never a session token. Authorization: Matching HttpOnly browser nonce; verified active provider session. Errors: OAuth handoff 400, validation 422, unavailable 503, unexpected 500.
- `POST /api/mobile/v1/auth/google/exchange` — mobileGoogleExchangeSchema: {code,state,code_verifier}. Response: 200 MobileAuthTokenData; consumes code atomically. Authorization: Matching state and S256 verifier, unexpired one-use code, active verified session. Errors: OAuth handoff 400, validation 422, unavailable 503, unexpected 500.
- `GET /api/mobile/v1/auth/google/start` — Query request: 43-character random flow ID. Response: 307 Google authorization redirect; HttpOnly browser-binding and OAuth cookies. Authorization: Unexpired flow; browser start allowed once. Errors: OAuth handoff 400, validation 422, unavailable 503, unexpected 500.
