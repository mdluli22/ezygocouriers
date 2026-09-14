# @ezygo/contracts

Dependency-neutral TypeScript contracts shared by EzyGo web, API, PWA, and native mobile clients.

```ts
import {
  createDeliveryRequestSchema,
  type ApiResponse,
  type CreateDeliveryRequest,
} from "@ezygo/contracts";
```

The package exports domain constants, Zod request schemas, and transport models. It must not import Next.js, React, database clients, Node-only APIs, or application-local `@/` aliases.

Available entry points:

- `@ezygo/contracts` — complete public surface;
- `@ezygo/contracts/constants` — roles, statuses, transitions, labels, service-area values, and API version;
- `@ezygo/contracts/schemas` — authentication, delivery, driver, payment, and administration request schemas;
- `@ezygo/contracts/models` — API envelopes and shared response models.

Schema-inferred input types are exported next to their schemas so clients do not maintain a second handwritten request model. Changes to this package follow the compatibility policy in `docs/api-contracts.md`.

Run `npm run typecheck --workspace @ezygo/contracts` from the repository root to validate it independently.
