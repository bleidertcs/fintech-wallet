# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app
ENV PNPM_CONFIG_IGNORE_SCRIPTS=true

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar archivos de dependencias y workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma/

# Instalar dependencias
RUN pnpm install

# Generar Prisma Client
RUN npx prisma generate

# Copiar el código fuente y compilar
COPY . .
RUN pnpm run build

# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV GRPC_PORT=50051
ENV PNPM_CONFIG_IGNORE_SCRIPTS=true

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar package, lockfile y workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma/

# Instalar solo dependencias de producción
RUN pnpm install --prod
RUN pnpm dlx prisma generate

# Copiar el build compilado
COPY --from=builder /app/dist ./dist

# Usuario sin privilegios
USER node

EXPOSE 3002 50051

CMD ["node", "dist/main"]
