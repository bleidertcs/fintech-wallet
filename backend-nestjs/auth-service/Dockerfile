# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar archivos de dependencias y workspace
COPY package.json pnpm-workspace.yaml .npmrc ./
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
ENV PORT=3001

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar package, lockfile y workspace
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma/

# Instalar solo dependencias de producción
RUN pnpm install --prod
RUN pnpm dlx prisma generate

# Copiar el build compilado
COPY --from=builder /app/dist ./dist

# Usuario sin privilegios
USER node

EXPOSE 3001

CMD ["node", "dist/main"]
