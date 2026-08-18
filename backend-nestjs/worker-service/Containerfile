FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile --ignore-scripts || pnpm install --ignore-scripts

COPY . .

RUN pnpm exec prisma generate
RUN pnpm build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3005

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /tmp/statements && chown -R node:node /tmp/statements

USER node

EXPOSE 3005

CMD ["node", "dist/main"]
