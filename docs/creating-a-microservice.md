# Guía: Cómo Crear un Nuevo Microservicio

Este documento es una guía práctica paso a paso para diseñar, implementar, contenerizar, instrumentar y desplegar un nuevo microservicio en el ecosistema **FinTech Wallet**, siguiendo los estándares de **Arquitectura Hexagonal**, **OpenTelemetry**, **Prisma ORM** y **Kubernetes**.

---

## 📑 Pasos del Flujo de Creación

1. [Estructura de Directorios Hexagonal](#paso-1-estructura-de-directorios-hexagonal)
2. [Configuración Inicial y Dependencias (`package.json`)](#paso-2-configuración-inicial-y-dependencias)
3. [Modelo de Base de Datos con Prisma](#paso-3-modelo-de-base-de-datos-con-prisma)
4. [Instrumentación de OpenTelemetry y Logger Winston](#paso-4-instrumentación-de-opentelemetry-y-logger-winston)
5. [Implementación de Dominio, Aplicación y Adaptadores](#paso-5-implementación-de-dominio-aplicación-y-adaptadores)
6. [Arranque con NestJS y Documentación Swagger](#paso-6-arranque-con-nestjs-y-documentación-swagger)
7. [Creación del Dockerfile Optimizado](#paso-7-creación-del-dockerfile-optimizado)
8. [Manifiestos de Kubernetes (Deployment y Service)](#paso-8-manifiestos-de-kubernetes-deployment-y-service)
9. [Enrutamiento en Traefik Ingress](#paso-9-enrutamiento-en-traefik-ingress)
10. [Integración en Scripts de Despliegue](#paso-10-integración-en-scripts-de-despliegue)
11. [Pruebas y Verificación](#paso-11-pruebas-y-verificación)

---

### Paso 1: Estructura de Directorios Hexagonal

Crea la carpeta de tu nuevo microservicio en `backend-nestjs/<service-name>` con la siguiente topología de capas:

```text
backend-nestjs/<service-name>/
├── prisma/
│   └── schema.prisma            # Esquema de base de datos
├── src/
│   ├── domain/                  # Lógica pura e interfaces
│   │   ├── entities/            # Entidades de dominio
│   │   ├── value-objects/       # Objetos de valor inmutables
│   │   └── ports/               # Puertos Inbound y Outbound (Interfaces)
│   ├── application/             # Casos de uso (Services, Handlers)
│   ├── adapters/                # Adaptadores de infraestructura
│   │   ├── inbound/             # Controladores REST, Routers tRPC, Consumidores Kafka
│   │   │   └── rest/
│   │   │       ├── dto/
│   │   │       ├── health.controller.ts
│   │   │       └── <service>.controller.ts
│   │   └── outbound/            # Repositorios Prisma, Clientes Redis/Kafka/HTTP
│   ├── infrastructure/          # Telemetría, Logging y Configuración
│   │   ├── telemetry/
│   │   │   └── tracing.ts
│   │   └── logging/
│   │       └── otel-winston.logger.ts
│   ├── app.module.ts
│   └── main.ts
├── .dockerignore
├── .env.example
├── Dockerfile
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

### Paso 2: Configuración Inicial y Dependencias

En `backend-nestjs/<service-name>/package.json`:

```json
{
  "name": "<service-name>",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "test": "jest"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.11",
    "@nestjs/core": "^11.0.11",
    "@nestjs/platform-express": "^11.0.11",
    "@nestjs/swagger": "^11.0.6",
    "@opentelemetry/api": "^1.9.1",
    "@opentelemetry/auto-instrumentations-node": "^0.56.1",
    "@opentelemetry/exporter-trace-otlp-http": "^0.57.2",
    "@opentelemetry/sdk-node": "^0.57.2",
    "@prisma/client": "^6.4.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "dotenv": "^16.4.7",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2",
    "winston": "^3.17.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.5",
    "@types/node": "^22.13.9",
    "prisma": "^6.4.1",
    "typescript": "~5.7.3"
  }
}
```

---

### Paso 3: Modelo de Base de Datos con Prisma

Crea `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model SampleEntity {
  id        BigInt   @id @default(autoincrement())
  name      String   @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("samples")
}
```

Ejecuta la generación:
```bash
pnpm install && pnpm prisma generate
```

---

### Paso 4: Instrumentación de OpenTelemetry y Logger Winston

Crea `src/infrastructure/telemetry/tracing.ts` para inicializar el SDK de OTel antes del arranque de NestJS:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import * as resources from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export function startTelemetry() {
  const serviceName = process.env.OTEL_SERVICE_NAME || '<service-name>';
  const exporterEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';

  const traceExporter = new OTLPTraceExporter({
    url: `${exporterEndpoint}/v1/traces`,
  });

  const sdk = new NodeSDK({
    resource: new resources.Resource({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
}
```

---

### Paso 5: Implementación de Dominio, Aplicación y Adaptadores

1. **Definir Puertos en `domain/ports/`**:
   - `inbound/<service>.port.ts` (Casos de uso ofrecidos).
   - `outbound/<service>-repository.port.ts` (Persistencia o llamadas externas).
2. **Implementar Caso de Uso en `application/`**.
3. **Implementar Adaptador REST en `adapters/inbound/rest/`** con Swagger `@ApiTags()` y controladores.
4. **Implementar Adaptador de Salud (`health.controller.ts`)** con endpoints `/health/startup`, `/health/live` y `/health/ready`.

---

### Paso 6: Arranque con NestJS y Documentación Swagger

En `src/main.ts`:

```typescript
import { startTelemetry } from './infrastructure/telemetry/tracing';
startTelemetry(); // Debe ejecutarse ANTES de importar módulos

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('<Service Name> API')
    .setVersion('1.0')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('<service-name>/docs', app, doc);

  const port = process.env.PORT || 3006;
  await app.listen(port);
}
bootstrap();
```

---

### Paso 7: Creación del Containerfile Optimizado

Crea `Containerfile` con compilación multi-etapa:

```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
RUN apk update && apk upgrade --no-cache
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.shrc" SHELL="$(which sh)" sh -
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY prisma ./prisma/
RUN pnpm install --no-frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build
RUN pnpm prune --prod --ignore-scripts

FROM node:24-alpine AS runner
WORKDIR /app
RUN apk update && apk upgrade --no-cache
ENV NODE_ENV=production
ENV PORT=3006
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3006
CMD ["node", "dist/main"]
```

---

### Paso 8: Manifiestos de Kubernetes (Deployment y Service)

Agrega la definición en `k8s/02-microservices.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <service-name>
  namespace: fintech
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <service-name>
  template:
    metadata:
      labels:
        app: <service-name>
    spec:
      containers:
        - name: <service-name>
          image: fintech/<service-name>:1.0.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3006
              name: http
          env:
            - name: PORT
              value: "3006"
            - name: OTEL_SERVICE_NAME
              value: "<service-name>"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector.fintech.svc.cluster.local:4318"
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
          startupProbe:
            httpGet:
              path: /health/startup
              port: 3006
            initialDelaySeconds: 5
            periodSeconds: 3
            failureThreshold: 20
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3006
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3006
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: <service-name>
  namespace: fintech
spec:
  type: ClusterIP
  ports:
    - port: 8086
      targetPort: 3006
      name: http
  selector:
    app: <service-name>
```

---

### Paso 9: Enrutamiento en Traefik Ingress

En `k8s/05-ingress.yaml`, agrega la regla en `fintech-ingress` y el Ingress individual:

```yaml
- path: /api/<service-name>
  pathType: Prefix
  backend:
    service:
      name: <service-name>
      port:
        number: 8086
```

---

### Paso 10: Integración en Scripts de Despliegue

Agrega el nuevo servicio al array `$services` de `deploy-k8s.ps1` y `deploy-k8s.sh`:

```powershell
@{ Name = "<service-name>"; Path = "./backend-nestjs/<service-name>"; Image = "fintech/<service-name>:1.0.0"; File = "./backend-nestjs/<service-name>/Containerfile" }
```

---

### Paso 11: Pruebas y Verificación

1. Despliega con `.\deploy-k8s.ps1` (o `./deploy-k8s.sh`).
2. Verifica que el pod esté en `Running`: `kubectl get pods -n fintech -l app=<service-name>`.
3. Accede a Swagger UI en `http://localhost/<service-name>/docs/`.
4. Comprueba que las trazas aparezcan en SigNoz APM (`http://localhost:30301`).

Para revisar la auditoría de gaps arquitectónicos y recomendaciones futuras, consulta el documento [Auditoría de Gaps](documentation-gaps.md).
