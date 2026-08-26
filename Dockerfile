# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
# Pin to linux/amd64 so Next.js uses native SWC binaries (not WASM).
# This is needed when building on Apple Silicon (arm64) hosts.
FROM --platform=linux/amd64 node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* vars are inlined at build time by Next.js, so they must be
# available here — not just at runtime. Pass them in via --build-arg.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Better Auth is initialized while Next.js collects page data and requires a
# non-default secret. This placeholder exists only in the discarded builder
# stage; the runner receives the real secret from the Compose env_file.
RUN BETTER_AUTH_SECRET="docker-build-only-secret-not-used-at-runtime" npm run build

# ─── Stage 3: Runner (Production) ────────────────────────────────────────────
FROM --platform=linux/amd64 node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
