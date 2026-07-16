FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy prisma schema first (needed for generate)
COPY prisma ./prisma

# Install ALL dependencies (including dev tools needed during build)
RUN pnpm install --frozen-lockfile
# Prisma may skip node_modules/.prisma for client-engine builds, but Docker COPY
# requires the path to exist when we copy generated artifacts into runner.
RUN pnpm db:generate && mkdir -p node_modules/.prisma

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public directory exists
RUN mkdir -p ./public

# Build Next.js
RUN pnpm build

# Dedicated migration image; not used by the production app runner.
FROM deps AS migration
WORKDIR /app
COPY . .
CMD ["pnpm", "prisma", "migrate", "deploy"]

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy generated Prisma Client artifacts produced during the build stages.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
