# Multi-stage build. We intentionally ship full node_modules (not Next's
# "standalone" output) because tesseract.js spawns a worker_thread by
# resolving a script path inside its own node_modules folder at runtime —
# Next's file-tracing for standalone output can miss that dynamic path, and
# a broken OCR pipeline is worse than a larger image on a home NAS.

# Node 22 LTS. Node 20 went end-of-life in April 2026, so it no longer receives
# security patches; Next 16 requires >=20.9.0 either way.
FROM node:22-bookworm-slim AS base
WORKDIR /app
# Prisma's query/schema engines link against OpenSSL, which the -slim image
# omits. Without it `prisma migrate deploy` fails at startup with a
# "Schema engine error" and the container restart-loops.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
# Prisma 7 reads the migrate connection URL from prisma.config.ts, not the schema.
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
