# Transactional email designs

The templates in `lib/email/templates.ts` share EzyGo branding, a pale green footer, status labels, tracking cards, and green action buttons inspired by the supplied showcase. Booking and driver-assigned emails include a generated courier illustration. PIN and verification codes remain selectable text; no essential information depends on images loading.

## Preview

Run `npm run preview:emails`, then open `out/email-preview/index.html` locally. Ten synthetic examples cover cancellation, booking confirmation, driver assigned, delivery PIN, delivered successfully, email verification, sign-in code, change-email code, password-reset code, and password-reset link. Individual `.html` and `.txt` files are generated alongside the index. The preview script never sends email or contacts a database.

The templates use inline styling, presentation tables, system fonts and an Outlook fixed-width fallback. Rounded corners may render square in older Outlook versions. Inbox rendering in Gmail, Outlook and Apple Mail remains a manual validation step; browser previews alone cannot certify it.

## Events and deployment

- Booking confirmation: after verified payment, queued inside the payment transaction.
- Driver assigned: after automatic or admin assignment, queued inside the assignment transaction. There is no distinct pickup-en-route event, so the email says “Driver assigned” rather than claiming the driver is moving.
- PIN: existing encrypted recipient PIN flow, with the secure-handover warning.
- Delivered: existing completion flow, with recipient, tracking link and the completion timestamp in South Africa time.
- Cancelled: customer and driver cancellations queue one customer notice in the same transaction. Failed sends retry; payment wording does not promise a refund.
- Authentication: existing verification and password-reset flows with their existing expiry periods.

Apply `scripts/sql/015_delivery_email_templates.sql` followed by `scripts/sql/016_delivery_cancellation_email.sql` **before** running the new application/notification worker. The deployment migration job already runs numbered SQL files. These migrations enable booking, assignment and cancellation outbox kinds; no existing customer records are changed. Migration 016 was verified twice in a disposable schema and applied to the configured local database on 13 October 2026. Apply the migrations separately when deploying to another database.

Set `NEXT_PUBLIC_APP_URL` to the public application origin so image and action links point at the deployment. Ship `public/images/email/courier.jpg` with the app. Keep the existing notification worker running. Sending remains at least once: duplicate event retries are deduplicated, while a worker crash after SMTP acceptance can still cause a duplicate email.

No live emails were sent during implementation. No fictional arrival times, ratings, feedback controls, social accounts or app-store destinations were added.
