# Guía Paso a Paso: Creación e Integración de un Nuevo Microservicio 🚀🏗️

Este documento describe el **flujo de trabajo integral y estandarizado** para crear, implementar, containerizar, desplegar y monitorear un nuevo microservicio desde cero en el ecosistema **FinTech Wallet**, siguiendo los estándares de **Arquitectura Hexagonal**, **NestJS 11**, **tRPC**, **Prisma ORM**, **Apache Kafka KRaft**, **OpenTelemetry / SigNoz**, **Traefik Ingress** y **Kubernetes (k3s / Rancher Desktop)**.

---

## 📋 Índice del Flujo de Trabajo

1. [Fase 1: Definición del Dominio y Asignación de Recursos](#fase-1-definición-del-dominio-y-asignación-de-recursos)
2. [Fase 2: Estructura de Carpetas y Scaffolding Hexagonal](#fase-2-estructura-de-carpetas-y-scaffolding-hexagonal)
3. [Fase 3: Persistencia y Esquema Prisma (Database-per-Service)](#fase-3-persistencia-y-esquema-prisma-database-per-service)
4. [Fase 4: Comunicación Inter-Servicio (tRPC y Apache Kafka)](#fase-4-comunicación-inter-servicio-trpc-y-apache-kafka)
5. [Fase 5: Observabilidad OTLP y Endpoints de Salud K8s](#fase-5-observabilidad-otlp-y-endpoints-de-salud-k8s)
6. [Fase 6: Containerización Multi-Stage con Dockerfile](#fase-6-containerización-multi-stage-con-dockerfile)
7. [Fase 7: Manifiestos de Kubernetes, Traefik Ingress y NetworkPolicies](#fase-7-manifiestos-de-kubernetes-traefik-ingress-y-networkpolicies)
8. [Fase 8: Automatización de Despliegue y Pruebas Automatizadas](#fase-8-automatización-de-despliegue-y-pruebas-automatizadas)
9. [Checklist de Verificación Final](#checklist-de-verificación-final-)

---

## Fase 1: Definición del Dominio y Asignación de Recursos

Antes de escribir código, define las especificaciones base del nuevo servicio (usaremos como ejemplo un hipotético **`card-service`** para tarjetas virtuales y físicas):

| Parámetro | Valor de Ejemplo (`card-service`) | Regla del Proyecto |
| :--- | :--- | :--- |
| **Nombre del Servicio** | `card-service` | Kebab-case con sufijo `-service` |
| **Directorio Backend** | `backend-nestjs/card-service` | Ubicado en `backend-nestjs/` |
| **Esquema MySQL** | `carddb` | Base de datos aislada (Database-per-Service) |
| **Puerto Interno Pod** | `3006` | Siguiente puerto disponible en la serie 300x |
| **Puerto K8s Service** | `8086` | Siguiente puerto en la serie 808x |
| **Ruta Pública API** | `/cards` | Enrutado mediante Traefik Ingress |
| **Ruta Swagger Docs** | `/cards/docs` | OpenAPI UI estandarizado |
| **Tópicos Kafka** | `fintech.card.issued.v1`, `fintech.card.blocked.v1` | Nomenclatura: `fintech.<dominio>.<evento>.<version>` |

---

## Fase 2: Estructura de Carpetas y Scaffolding Hexagonal

Crea el nuevo proyecto NestJS dentro de la carpeta `backend-nestjs/`:

```bash
cd backend-nestjs
nest new card-service --package-manager pnpm --skip-git
cd card-service
```

### Estructura de Directorios Hexagonal (Ports & Adapters)

Organiza el código fuente siguiendo la estructura modular del proyecto:

```text
backend-nestjs/card-service/
├── prisma/
│   └── schema.prisma                  # Esquema Prisma y modelos de base de datos
├── src/
│   ├── adapters/
│   │   ├── inbound/                   # Puertos de Entrada
│   │   │   ├── rest/                  # Controladores REST HTTP
│   │   │   │   ├── card.controller.ts
│   │   │   │   └── health.controller.ts  # Startup, Liveness y Readiness Probes
│   │   │   ├── trpc/                  # Router tRPC para llamadas síncronas
│   │   │   │   ├── card.router.ts
│   │   │   │   └── trpc.module.ts
│   │   │   └── kafka/                 # Consumidores de eventos Kafka
│   │   │       └── kafka-consumer.service.ts
│   │   └── outbound/                  # Puertos de Salida
│   │       ├── prisma/                # Adaptador de persistencia MySQL
│   │       │   ├── prisma.service.ts
│   │       │   └── prisma.module.ts
│   │       ├── kafka/                 # Productor de eventos Kafka (con ensureConnected)
│   │       │   ├── kafka-producer.service.ts
│   │       │   └── kafka.module.ts
│   │       ├── redis/                 # Idempotencia y caché L2
│   │       │   ├── redis.service.ts
│   │       │   └── redis.module.ts
│   │       └── trpc-clients/          # Clientes tRPC hacia otros microservicios
│   │           └── user-trpc-client.service.ts
│   ├── application/                   # Casos de Uso / Capa de Aplicación (CQRS)
│   │   ├── commands/                  # Manejadores de Comandos (Escritura)
│   │   │   ├── issue-card.command.ts
│   │   │   └── issue-card.handler.ts
│   │   ├── queries/                   # Manejadores de Consultas (Lectura)
│   │   │   ├── get-user-cards.query.ts
│   │   │   └── get-user-cards.handler.ts
│   │   └── dtos/                      # Data Transfer Objects y validaciones Zod / class-validator
│   │       └── issue-card.dto.ts
│   ├── domain/                        # Núcleo de Negocio Puro
│   │   ├── models/                    # Entidades y Agregados del Dominio
│   │   │   └── card.model.ts
│   │   └── events/                    # Eventos del Dominio
│   │       └── card-issued.event.ts
│   ├── infrastructure/                # Configuración, Outbox y Middlewares
│   │   ├── config/
│   │   └── outbox/                    # Transactional Outbox Pattern
│   │       ├── outbox.service.ts
│   │       └── outbox-publisher.service.ts
│   ├── app.module.ts                  # Módulo raíz de NestJS
│   ├── main.ts                        # Bootstrap de la aplicación y Swagger
│   └── tracing.ts                     # Inicialización de OpenTelemetry SDK
├── Dockerfile                         # Construcción multi-stage de producción
├── package.json
└── tsconfig.json
```

---

## Fase 3: Persistencia y Esquema Prisma (Database-per-Service)

### 1. Registrar la Base de Datos en MySQL
Edita el ConfigMap en [`k8s/00-namespace-config.yaml`](file:///c:/dev/DevOps/fintech-wallet/k8s/00-namespace-config.yaml) para asegurar que MySQL cree la base de datos `carddb` en el arranque:

```sql
CREATE DATABASE IF NOT EXISTS carddb;
GRANT ALL PRIVILEGES ON carddb.* TO 'fintech_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Definir el Esquema Prisma (`prisma/schema.prisma`)
Crea el archivo `prisma/schema.prisma` con la conexión a MySQL y el modelo de dominio:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Card {
  id           String   @id @default(uuid())
  userId       Int      @map("user_id")
  cardNumber   String   @unique @map("card_number")
  cardType     String   @default("VIRTUAL") @map("card_type") // VIRTUAL | PHYSICAL
  status       String   @default("ACTIVE") // ACTIVE | BLOCKED | EXPIRED
  spendingLimit Decimal  @default(10000.00) @map("spending_limit") @db.Decimal(19, 2)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("cards")
}

model OutboxEvent {
  id            String    @id @default(uuid())
  aggregateType String    @map("aggregate_type")
  aggregateId   String    @map("aggregate_id")
  eventType     String    @map("event_type")
  payload       String    @db.Text
  status        String    @default("PENDING") // PENDING | PUBLISHED | FAILED
  createdAt     DateTime  @default(now()) @map("created_at")
  processedAt   DateTime? @map("processed_at")

  @@index([status])
  @@map("outbox_events")
}
```

Genera el cliente Prisma localmente:
```bash
pnpm add @prisma/client
pnpm add -D prisma
pnpm exec prisma generate
```

---

## Fase 4: Comunicación Inter-Servicio (tRPC y Apache Kafka)

### 1. Comunicación Síncrona mediante tRPC
Si el microservicio expone funciones para otros servicios, define un **Router tRPC** en `src/adapters/inbound/trpc/card.router.ts`:

```typescript
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const cardRouter = t.router({
  getCardsByUserId: t.procedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Retorna las tarjetas del usuario
      return ctx.cardService.findByUserId(input.userId);
    }),
});

export type CardRouter = typeof cardRouter;
```

### 2. Productor de Kafka con Reconexión Resiliente (`ensureConnected`)
Implementa el servicio de publicación en `src/adapters/outbound/kafka/kafka-producer.service.ts`:

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: Producer;
  private isConnected = false;

  constructor() {
    const kafka = new Kafka({
      clientId: 'card-service',
      brokers: (process.env.KAFKA_BROKERS || 'kafka:29092').split(','),
      retry: { initialRetryTime: 300, retries: 10 },
    });
    this.producer = kafka.producer();
  }

  async onModuleInit() {
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Conectado exitosamente a Kafka Broker');
    } catch (error) {
      this.isConnected = false;
      this.logger.error(`Error conectando a Kafka: ${error.message}`);
    }
  }

  async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async publish(topic: string, event: any): Promise<void> {
    await this.ensureConnected();
    await this.producer.send({
      topic,
      messages: [{ value: JSON.stringify(event) }],
    });
  }
}
```

---

## Fase 5: Observabilidad OTLP y Endpoints de Salud K8s

### 1. Inicialización de OpenTelemetry (`src/tracing.ts`)
Crea el archivo `src/tracing.ts` que se ejecutará **antes** del bootstrap de NestJS:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'card-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'production',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

En `package.json`, asegúrate de cargar `tracing.ts` al arrancar:
```json
"scripts": {
  "start:prod": "node -r ./dist/tracing.js dist/main.js"
}
```

### 2. Probes de Kubernetes (`src/adapters/inbound/rest/health.controller.ts`)
Implementa los endpoints de diagnóstico requeridos por el orquestador:

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check general' })
  check() {
    return { status: 'UP', service: 'card-service', timestamp: new Date().toISOString() };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness Probe para K8s' })
  liveness() {
    return { status: 'UP' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness Probe para K8s' })
  readiness() {
    return { status: 'READY' };
  }

  @Get('startup')
  @ApiOperation({ summary: 'Startup Probe para K8s' })
  startup() {
    return { status: 'STARTED' };
  }
}
```

---

## Fase 6: Containerización Multi-Stage con Dockerfile

Crea el archivo `Dockerfile` en la raíz de `backend-nestjs/card-service/`:

```dockerfile
# Stage 1: Build & Compilación
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml* pnpm-lock.yaml* ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile --ignore-scripts || pnpm install --ignore-scripts

COPY . .

RUN pnpm exec prisma generate
RUN pnpm run build
RUN pnpm prune --prod --ignore-scripts

# Stage 2: Runtime Minimalista de Producción
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3006

# Copiar dependencias de producción y binarios compilados
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Usuario no root para seguridad de contenedor
USER node

EXPOSE 3006

CMD ["node", "-r", "./dist/tracing.js", "dist/main.js"]
```

---

## Fase 7: Manifiestos de Kubernetes, Traefik Ingress y NetworkPolicies

### 1. Agregar Deployment y Service en [`k8s/02-microservices.yaml`](file:///c:/dev/DevOps/fintech-wallet/k8s/02-microservices.yaml)

```yaml
---
# ==============================================================================
# CARD SERVICE - MICROSERVICIO DE GESTIÓN DE TARJETAS
# ==============================================================================
apiVersion: apps/v1
kind: Deployment
metadata:
  name: card-service
  namespace: fintech
  labels:
    app: card-service
    tier: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: card-service
  template:
    metadata:
      labels:
        app: card-service
        tier: backend
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: card-service
          image: fintech/card-service:nestjs
          imagePullPolicy: IfNotPresent
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
          env:
            - name: PORT
              value: "3006"
            - name: DATABASE_URL
              value: "mysql://root:12345@mysql:3306/carddb"
            - name: REDIS_HOST
              value: "redis"
            - name: REDIS_PORT
              value: "6379"
            - name: KAFKA_BROKERS
              value: "kafka:29092"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector:4317"
            - name: USER_SERVICE_URL
              value: "http://user-service:8082"
          ports:
            - containerPort: 3006
              name: http
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
          startupProbe:
            httpGet:
              path: /health/startup
              port: 3006
            initialDelaySeconds: 5
            periodSeconds: 3
            failureThreshold: 30
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3006
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3006
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: card-service
  namespace: fintech
  labels:
    app: card-service
spec:
  type: ClusterIP
  selector:
    app: card-service
  ports:
    - name: http
      port: 8086
      targetPort: 3006
```

### 2. Configurar Ruteo en [`k8s/05-ingress.yaml`](file:///c:/dev/DevOps/fintech-wallet/k8s/05-ingress.yaml)

Agrega la regla de ruta en el Ingress de Traefik:

```yaml
      # Card Service
      - path: /cards
        pathType: Prefix
        backend:
          service:
            name: card-service
            port:
              number: 8086
```

---

## Fase 8: Automatización de Despliegue y Pruebas Automatizadas

### 1. Registrar en los Scripts de Despliegue
Agrega la compilación de la imagen en [`deploy-rancher.ps1`](file:///c:/dev/DevOps/fintech-wallet/deploy-rancher.ps1) y [`deploy-rancher.sh`](file:///c:/dev/DevOps/fintech-wallet/deploy-rancher.sh):

```powershell
Write-Host "Compilando fintech/card-service:nestjs..." -ForegroundColor Yellow
nerdctl --namespace k8s.io build -t fintech/card-service:nestjs ./backend-nestjs/card-service
```

### 2. Agregar Verificación en [`scripts/smoke-test.ps1`](file:///c:/dev/DevOps/fintech-wallet/scripts/smoke-test.ps1)

```powershell
Test-HttpEndpoint -Name "Card Service Health" -Url "http://localhost/cards/health" -ExpectedStatus 200
Test-HttpEndpoint -Name "Swagger Card Service" -Url "http://localhost/cards/docs/" -ExpectedStatus 200
```

### 3. Ejecutar y Validar el Despliegue
```powershell
# Compilar y desplegar
nerdctl --namespace k8s.io build -t fintech/card-service:nestjs ./backend-nestjs/card-service
kubectl apply -f k8s/00-namespace-config.yaml
kubectl apply -f k8s/02-microservices.yaml
kubectl apply -f k8s/05-ingress.yaml

# Ejecutar la prueba de humo
.\scripts\smoke-test.ps1
```

---

## Checklist de Verificación Final ✅

- [ ] **Aislamiento de Persistencia**: La base de datos `carddb` fue creada en MySQL y Prisma schema configurado.
- [ ] **Swagger OpenAPI**: Documentación disponible y navegable en `http://localhost/cards/docs/`.
- [ ] **Probes de K8s**: `/health/live`, `/health/ready` y `/health/startup` responden `HTTP 200`.
- [ ] **SecurityContext**: `runAsNonRoot: true`, `allowPrivilegeEscalation: false` y capabilities dropeadas.
- [ ] **Observabilidad**: OpenTelemetry SDK exportando trazas OTLP hacia `http://otel-collector:4317` visibles en SigNoz (`http://localhost:30301`).
- [ ] **Traefik Ingress**: El prefijo `/cards` rutea correctamente hacia el Pod del servicio.
- [ ] **Kafka Producer**: Implementa `ensureConnected()` para evitar desconexiones silenciosas.
