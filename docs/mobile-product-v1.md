# EzyGo mobile product — release 1

Phase 1 product definition, 16 September 2026. This is a build specification, not a statement that the native features are implemented.

## Decision record

| Decision | Release 1 position | Status |
| --- | --- | --- |
| Audience | Customers booking Cape Town deliveries and approved drivers executing assigned trips | Selected baseline from the brief |
| App structure | One iOS/Android app with navigation determined by the authenticated account role; administration stays on the web | Proposed baseline |
| Customer tracking | Live driver map **and** delivery status timeline at launch | Explicitly required by product owner |
| Older devices | iOS 16.4+ and Android 7+ (API 24), the published minimums of the current Expo stack | Selected using product owner's instruction to support as old as possible; device validation remains required |
| Operational rules | Policies below drafted for review | Draft, not existing business policy |

## Audience and boundaries

Customers can register, book, pay, track, cancel eligible bookings and view history. Drivers use accounts provisioned through existing administration; public signup never grants driver privileges. Recipients receive handover information and a PIN by email when requested and do not need an account. Dispatchers manage drivers, assignments and exceptions through the existing web administration and support processes.

Start with the existing Cape Town service-area checks and Paystack payment integration. English is the initial interface language. Native customer and driver journeys are both required for release 1. Tablets, multi-stop routes, cash collection, driver self-onboarding, native Google login, automatic refunds, in-app chat, photo/signature proof and guaranteed arrival times are outside this release.

## Release journeys and acceptance criteria

| Journey | Customer or driver experience | Done when |
| --- | --- | --- |
| Register and sign in | Customer registers, verifies email, signs in and resumes a session. Provisioned driver signs in to driver screens. Both can sign out. | Existing mobile Bearer endpoints are used; tokens live in OS secure storage; expired/revoked sessions return to login; role access is enforced server-side. |
| Book | Customer selects pickup/drop-off addresses, contacts, parcel size/details, instructions and optional PIN handover. Recipient email is required for PIN delivery. | Out-of-area addresses are rejected; review shows entered details and payment expectations; server returns a tracking number and authoritative quote; ambiguous submission reloads bookings before retry. |
| Pay | Customer reviews the server quote and opens Paystack hosted checkout in a secure browser. Returning to the app refreshes payment/delivery state. | Only backend verification establishes payment success; closing checkout, pending verification and declined payment have distinct recovery paths; no duplicate automatic charge attempt. |
| Track | Customer opens their delivery, sees status history, assigned driver details and the driver's map position during an active trip. | Map authorization, sharing and freshness rules below pass; status tracking remains usable when GPS or map loading fails; no unverified ETA is shown. |
| Assignment | Paid booking is automatically assigned when a driver is available; dispatcher can use existing assignment controls. Driver receives a native notification and opens trip details. | Only the assigned driver can act; no-driver state stays visibly awaiting assignment; native push has its own token registration and delivery path; refresh also finds assignments if push fails. |
| Pickup | Driver reviews pickup instructions, starts trip sharing and confirms physical parcel collection. | `assigned → picked_up` succeeds on the server; duplicate taps and concurrent cancellation cannot create conflicting outcomes. |
| In transit | Driver opens external navigation, confirms departure and continues sharing while travelling, including when the screen locks. | `picked_up → in_transit` succeeds; background updates work on supported real devices under normal OS conditions; interruptions appear as stale/unavailable tracking. |
| Complete | Driver hands over parcel, enters the recipient PIN when required, or records a handover note for a non-PIN booking. | `in_transit → delivered` is server-confirmed; invalid/missing required PIN blocks completion; customer sees completion time; customer location access ends immediately. |
| Exceptions | Customer requests eligible cancellation; driver records unsuccessful delivery or contacts dispatch for pickup problems. | Rules below are enforced; no failed/cancelled trip is presented as delivered; refunds and parcel return handling remain distinct from trip status. |

The normal persisted lifecycle is `pending → quoted → confirmed → paid → assigned → picked_up → in_transit → delivered`. The current create-booking operation advances through quote confirmation and creates checkout in one request, so customers need not see each early state as a separate screen.

Minimum screens: registration/verification/login; customer bookings, booking form/review, payment return, tracking map/timeline and history; driver assignments, trip details/actions, handover/exception form and history; shared account, permissions and support access. A password-recovery/support route and account-deletion route must be defined before public store release.

## Live map and driver location policy — draft

Live means recent device observations, not guaranteed uninterrupted GPS. Customer tracking must remain honest about unavailable data.

- **When:** Driver explicitly starts sharing for an assigned trip. Foreground and background permissions are explained separately. Background collection continues only for that active trip. Stop collection on completion, failure, cancellation, reassignment away from the driver, logout or explicit Stop sharing. A newly assigned trip requires a new start action.
- **Who can see it:** The signed-in customer owning that delivery, its assigned driver and authorized dispatch staff. Customers can see location only while the trip is `assigned`, `picked_up` or `in_transit` and sharing is enabled. No public tracking link, off-duty map or cross-customer access.
- **Permission denied or stopped:** Status updates and support remain available. Show “Driver location unavailable” to the customer and a clear sharing warning to the driver. Dispatch resolves whether a trip should proceed; do not silently claim tracking is active or block safe completion of a parcel already collected.
- **Cadence:** Initial implementation target: capture/upload about every 15 seconds while moving and every 60 seconds while stationary, subject to OS limits. Customer map refreshes about every 15 seconds while visible and immediately when reopened. Tune after battery/data tests on the oldest supported driver device.
- **Freshness:** Store device capture time, server receipt time and accuracy. Up to 60 seconds old may be shown as recent with its timestamp; older observations are explicitly stale. After 5 minutes, remove the driver marker and show location unavailable. Stop/revocation/terminal state removes access immediately, even if the last point is recent. Do not animate invented motion.
- **Offline:** Keep at most the latest unsent point temporarily; discard points older than 60 seconds and all queued points when sharing stops. Reject out-of-order or implausibly future-dated observations on the server. Capture time, not upload time, determines freshness. Do not queue booking, payment or status mutations for silent replay.
- **Data minimization:** Retain only the latest live point for the trip; no route history in release 1. Delete the point at trip end or sharing stop, and purge abandoned points after at most 24 hours. Keep business status history separately; its retention period remains an operations decision. Exclude coordinates, tokens and PINs from logs/analytics. These are proposed product rules requiring implementation, not claims about current storage.
- **Dispatch location:** Existing location updates influence assignment. Optional pre-trip dispatch location must use a separate, clearly described consent/availability mode if retained. It must never become customer-visible. Stopping sharing is not currently the same as going off duty; add an explicit availability control and server enforcement for drivers to stop receiving work.

Map integration must support restricted mobile map credentials, attribution, pickup/drop-off markers and a last-update label. Select the map provider and cost budget during technical design. No routing-based ETA is required for this release.

## Platforms and older-device support

Target both iOS and Android phones. The product owner delegated the exact minimums with the direction to support devices as old as possible. Select **iOS 16.4+ and Android 7+ (API 24)** to cover the full supported range of the existing stack. Do not raise these minimums for convenience when selecting map, authentication or location libraries. Device validation is still required before publishing compatibility claims.

The declared stack is Expo SDK 57 with React Native 0.86. Expo's published SDK 57 baseline is **iOS 16.4+ and Android 7+ (API 24)**. These are framework floors, not a tested EzyGo compatibility promise. Source: [Expo SDK support table](https://docs.expo.dev/versions/latest/#support-for-android-and-ios-versions), checked 16 September 2026.

Older OS versions are outside this native release baseline. If a specific older device becomes a business requirement, reassess the stack before committing support. Test map rendering, secure storage, checkout return, native push and background GPS at the selected minimums before confirming compatibility. Android API 24 compatibility alone does not establish acceptable performance or background reliability on every vendor's phone.

Device release matrix: oldest agreed iPhone and Android device, a current iPhone, and a current mainstream Android phone. Include screen lock, backgrounding, force termination, battery saver, permission revocation, approximate location, weak network, offline recovery, large text and screen readers. Use native development/release builds for background-location validation. Store submission/build SDK requirements are separate from supported user OS versions.

## Delivery operations — draft for review

### Failed deliveries

At drop-off, attempt to contact the recipient and customer; allow a proposed 10-minute wait when safe. Record a reason (recipient unavailable, incorrect address, refused parcel, access issue or other), contact attempts and a short note. Only `in_transit → failed` is currently supported. A pickup failure or vehicle issue before that state goes to dispatch; never mark false pickup/transit events just to reach `failed`.

Do not leave an undelivered parcel unattended. Dispatch gives return/rebooking instructions and records who has custody. A failed trip is terminal in the current API; redelivery requires a new booking, with its price agreed separately. Returns, links to replacement bookings and custody resolution need an operational record before launch. Current terminal-state handling immediately makes the driver eligible for another assignment: block that eligibility while unresolved parcel custody/return work remains.

### Cancellations and refunds

Customers may cancel before collection (`pending`, `quoted`, `confirmed`, `paid` or `assigned`), subject to authoritative server state. After `picked_up`, provide a support request for return/exception handling rather than a Cancel action. Drivers who cannot perform an assigned trip contact dispatch for reassignment; they should not routinely cancel the customer's paid booking.

Proposed commercial rule: no cancellation fee before pickup; captured payments become eligible for a support-processed full refund. Cancellation and refund are separate events. Do not promise refund completion or a settlement date until the provider confirms it. A cancelled pending checkout must also be reconciled if payment arrives later. Operations must choose a monitored support contact, refund processing owner and turnaround commitment before launch; the current API has no automated refund workflow.

### Proof of delivery

Offer PIN handover at booking, enabled by default in the proposed mobile flow but explicitly changeable by the customer. Require recipient email when enabled; never bypass a missing or wrong PIN. PIN handover cannot be combined with unattended leave-at-door instructions. A recipient without access to the PIN uses support; any resend/recovery flow must be implemented and verified before it is offered.

For non-PIN deliveries, require a handover note naming the receiver or describing the customer-authorized safe place. Show this as a driver-recorded handover, not recipient-verified proof. Record driver identity, completion time and PIN verification time where applicable. Current notes are optional, so required non-PIN notes need server enforcement. Photos, signatures and completion GPS evidence are deferred. Rate-limit PIN attempts and exclude PIN values and hashes from client responses.

## Backend readiness and required work

Existing APIs provide mobile email authentication, booking/checkout, customer status history, assignment, driver status updates and optional server-verified PIN completion. `apps/mobile` currently contains a welcome screen and API client wiring only. All native journeys above still need implementation.

| Area | Required work before release 1 |
| --- | --- |
| Live location | Add trip-scoped sharing state, driver availability, capture time/accuracy, customer-authorized read API, expiry/deletion and background-capable native collection. Existing `/api/driver/location` stores driver-level coordinates with server update time and is insufficient for this live-map policy. |
| Trip details | Provide explicit safe response fields, including coordinates needed for pickup/drop-off map markers. Existing driver detail queries do not select address coordinates. Replace broad delivery projections with allowlists that exclude PIN hashes and internal fields. |
| Native payment return | Existing Paystack callback redirects to the web dashboard. Implement a secure native return/reopen path and refresh server payment state; never pass session tokens through links. |
| Native notifications | Existing push endpoints support Web Push. Add separate native device-token registration, cleanup, permission handling and trip deep links. |
| Operational exceptions | Enforce failure reasons/non-PIN handover notes, PIN attempt limits, driver custody/availability holds and cancellation/refund reconciliation. Define pickup-issue and return/rebooking support procedures. |
| Native client | Implement secure session storage, role navigation, all release screens, permission controls, live-map freshness states and connectivity recovery using shared contracts. |

Reuse the existing backend and `@ezygo/contracts` / `@ezygo/api-client`; do not create a second booking/payment backend. Existing PWA functionality is a reference, not proof that native functionality is delivered.

## Phase 1 completion and implementation handoff

Phase 1 definition is complete: customer/driver baseline, required journeys, mandatory launch live map, selected OS minimums, draft operating policies and concrete backend gaps. Product-owner review of proposed operating rules remains open; these drafts are not published business terms. OS targets are selected, while native build and real-device compatibility remain implementation release checks.

Implementation order: (1) configure and validate native builds at the selected OS minimums, (2) secure auth and role navigation, (3) booking/payment return, (4) driver execution and proof, (5) trip location backend/background collection/customer map, (6) native notifications and exception handling, (7) device pilot and release checks. Live map remains a release gate even though it is implemented after the basic journey.

Release acceptance: complete a paid booking through verified handover on both platforms; confirm live tracking under ordinary foreground/background operation; demonstrate honest stale/unavailable states; deny another customer's/driver's access; end location access at stop/reassignment/completion; recover safely from network loss and payment-return interruptions; rehearse cancellation/refund and failed-delivery custody handling. Status-only tracking does not satisfy the agreed release.

Implementation references: [API contracts](api-contracts.md), [mobile authentication](mobile-authentication.md), [existing PWA rollout](mobile-experience-rollout.md), [shared lifecycle rules](../packages/contracts/src/constants.ts), [mobile starter](../apps/mobile/README.md).
