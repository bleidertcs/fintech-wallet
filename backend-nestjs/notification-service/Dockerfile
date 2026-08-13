# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY prisma ./prisma/

RUN pnpm install --ignore-scripts --no-frozen-lockfile || pnpm install --ignore-scripts
COPY . .

RUN pnpm exec prisma generate
RUN pnpm run build
RUN mkdir -p dist/adapters/outbound/grpc/proto && cp src/adapters/outbound/grpc/proto/*.proto dist/adapters/outbound/grpc/proto/

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3004

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY prisma ./prisma/

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3004

CMD ["node", "dist/main"]
