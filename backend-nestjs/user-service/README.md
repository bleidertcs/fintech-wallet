# User Service (NestJS) 👤

Microservicio de Gestion de Perfiles de Usuario, Saldos y Verificacion KYC del sistema **FinTech Wallet**, desarrollado sobre **NestJS 11 + Hexagonal Architecture + tRPC + REST + Prisma ORM + OpenTelemetry**.

---

## 🚀 Arquitectura y Caracteristicas

- **Arquitectura Hexagonal (Ports & Adapters)**: Separacion clara entre Dominio, Casos de Uso y Adaptadores de Entrada (REST y tRPC) / Salida (Prisma PostgreSQL).
- **Doble Interfaz de Comunicacion**:
  - **REST API** (Puerto `3002`): Endpoints HTTP para consultar perfiles, crear usuarios, actualizar saldos y estado KYC.
  - **tRPC Router** (Endpoint `/trpc`): Router tRPC de alto rendimiento type-safe (`getUserById`, `getUserByEmail`, `updateBalance`) para comunicacion inter-servicio sincrona entre microservicios (`auth-service`, `transaction-service`, `notification-service`).
- **Base de Datos Dedicada**: Persistencia en PostgreSQL (`userdb.user_profiles`) gestionada con Prisma ORM 7 (`@prisma/adapter-pg`).
- **Documentacion OpenAPI / Swagger UI**: Disponible en vivo en `/users/docs`.
- **Observabilidad SigNoz & OpenTelemetry**:
  - **Trazas OTLP**: Rastreabilidad distribuida de endpoints HTTP REST y llamadas tRPC.
  - **Logs Winston OTLP**: Envio estructurado de logs en JSON con correlacion `trace_id` y metadatos nativos de Kubernetes (`k8s.pod.name`, `k8s.namespace.name`).
  - **Metricas OTLP**: Monitoreo de latencia, tasa de peticiones y recursos consumidos.

---

## 📁 Arquitectura de Carpetas (Hexagonal / Ports & Adapters)

```text
backend-nestjs/user-service/
├── prisma/
│   └── schema.prisma             # Esquema Prisma ORM (Base de datos PostgreSQL userdb)
├── src/
│   ├── adapters/                 # Adaptadores Hexagonales (Interface Adapters)
│   │   ├── inbound/              # Adaptadores de Entrada (Driving / Primary)
│   │   │   ├── trpc/             # Router tRPC inter-servicio (user-trpc.router.ts)
│   │   │   └── rest/             # Controladores REST HTTP (UserController, HealthController)
│   │   └── outbound/             # Adaptadores de Salida (Driven / Secondary)
│   │       └── persistence/      # Repositorio de persistencia Prisma ORM (prisma-user.repository.ts)
│   ├── application/              # Casos de Uso de Aplicacion
│   │   └── use-cases/            # UserUseCases (CreateUser, GetProfile, UpdateBalance, UpdateKYC)
│   ├── domain/                   # Dominio Principal (Core de Negocio)
│   │   ├── entities/             # Entidad UserProfile
│   │   └── ports/                # Interfaces de Puertos Inbound & Outbound
│   │       ├── inbound/          # UserServicePort
│   │       └── outbound/         # UserRepositoryPort
│   ├── infrastructure/           # Componentes de Infraestructura
│   │   ├── config/               # Configuracion global y validaciones (.env)
│   │   ├── logger/               # Winston Logger contextual
│   │   └── telemetry/            # OpenTelemetry (Trazas OTLP, Metricas y Winston OTLP Logs)
│   ├── app.module.ts             # Modulo Raiz de NestJS
│   └── main.ts                   # Bootstrap (Inicia servidor REST/tRPC puerto :3002 y Swagger UI /users/docs)
├── test/                         # Pruebas Unitarias y E2E (Jest)
├── .dockerignore                 # Exclusiones de construccion Docker
├── .gitignore                    # Control de versiones Git
├── Dockerfile                    # Multi-stage Dockerfile para produccion (Node 22 Alpine)
├── package.json                  # Dependencias y scripts pnpm
└── README.md                     # Documentacion oficial del microservicio
```

---

## 🛠️ Requisitos Previos

- **Node.js**: `>= 20.x`
- **pnpm**: `>= 9.x`
- **PostgreSQL**: `>= 15.x` (Base de datos `userdb`)

---

## ⚙️ Variables de Entorno (`.env`)

Crea un archivo `.env` en la raiz de `backend-nestjs/user-service`:

```env
PORT=3002
NODE_ENV=development

# Base de Datos PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/userdb"

# Telemetria SigNoz / OpenTelemetry Collector
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
OTEL_SERVICE_NAME="user-service"
```

---

## 🗄️ Base de Datos y Prisma ORM

```bash
# 1. Instalar dependencias
pnpm install

# 2. Generar el cliente de Prisma
pnpm dlx prisma generate

# 3. Aplicar esquema y tablas a la base de datos PostgreSQL (userdb)
pnpm dlx prisma db push
```

---

## 🏃 Modos de Ejecucion

### 1. Desarrollo Local (Standalone)
```bash
pnpm run start:dev
```

---

## 🧪 Pruebas Unitarias y E2E

```bash
pnpm test
```

---

## 🦭 Despliegue en Kubernetes con Podman

```bash
podman build -f Containerfile -t fintech/user-service:1.0.0 .
kubectl rollout restart deployment/user-service -n fintech
```