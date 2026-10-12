# Customer completion

- `/auth/forgot-password` and `/auth/reset-password` use Better Auth's single-use reset tokens. Tokens expire after 30 minutes, and successful reset revokes all existing sessions. SMTP is checked before issuing a reset request; transport errors are visible and form controls recover after failure. Unknown addresses receive the normal generic success response. Tests use an in-memory Better Auth adapter and stub email delivery; no real reset messages are sent by the tests.
- Booking authentication uses the canonical login/signup/verification pages. A delivery-only draft is stored in session storage for at most 30 minutes and removed when restored. Passwords and tokens are never included. Login expiry during submission preserves the draft; safe return paths work through email verification and Google sign-in. Session storage must be available for draft preservation.
- Tracking checks every 15 seconds, backs off to 60 seconds after errors, pauses while hidden/offline and after terminal status, and refreshes on focus/reconnection. Manual refresh and last-checked time are shown. Refresh errors keep the last known update; authorization errors clear it.
- Shared client requests reject failed HTTP statuses, non-JSON responses and network errors, use a 15-second timeout, and support cancellation. Admin lists have retry and session-expiry messages. Mutation controls release their busy state in `finally`. A route error boundary provides a recovery action.
- `/api/pricing` publishes the same active database pricing rule selected by quote creation. Landing, booking, auth and dashboard price copy share it. Responses are not cached; focus/reconnection and local admin price updates refresh the displayed fee. Existing quotes retain their stored amount. If the fee cannot load, the UI says the price is available at checkout rather than inventing a fallback amount.

## List contract

Customer deliveries, driver deliveries, admin deliveries, admin users and admin drivers retain the `data` array and add:

```json
{"pagination":{"nextCursor":123,"limit":25}}
```

Use `?limit=25&cursor=123` to get the next page. `nextCursor: null` means the last page. Limits are 1–100 (default 25). Records are ordered by descending immutable ID, so concurrent inserts do not shift older pages. Invalid parameters return 422. Ownership and role checks still precede data access.

`q` performs server-side search (up to 100 characters, SQL parameters with escaped wildcard characters). Delivery lists also accept `view=active|history|all`; admin delivery `status` and user `role` filters continue to work. The web views expose previous/next navigation. API consumers that previously assumed a full history must follow `pagination.nextCursor`.

`/api/deliveries/summary` returns aggregate counts scoped to the authenticated customer or driver. Dashboard totals and the driver navigation badge use this endpoint instead of counting a partial page or downloading the full history.
