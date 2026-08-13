# User Service (NestJS) 👤

Microservicio de Gestión de Perfiles de Usuario, Saldos y Verificación KYC del sistema **FinTech Wallet**, desarrollado sobre **NestJS 11 + Hexagonal Architecture + tRPC + REST + Prisma ORM + OpenTelemetry**.

---

## 🚀 Arquitectura y Características

- **Arquitectura Hexagonal (Ports & Adapters)**: Separación clara entre Dominio, Casos de Uso y Adaptadores de Entrada (REST y tRPC) / Salida (Prisma MySQL).
- **Doble Interfaz de Comunicación**:
  - **REST API** (Puerto `3002`): Endpoints HTTP para consultar perfiles, crear usuarios, actualizar saldos y estado KYC.
  - **tRPC Router** (Endpoint `/trpc`): Router tRPC de alto rendimiento type-safe (`getUserById`, `getUserByEmail`, `updateBalance`) para comunicación inter-servicio síncrona entre microservicios (`auth-service`, `transaction-service`, `notification-service`).
- **Base de Datos Dedicada**: Persistencia en MySQL (`userdb.user_profiles`) gestionada con Prisma ORM 7 (`@prisma/adapter-mariadb`).
- **Documentación OpenAPI / Swagger UI**: Disponible en vivo en `/users/docs`.
- **Observabilidad SigNoz & OpenTelemetry**:
  - **Trazas OTLP**: Rastreabilidad distribuida de endpoints HTTP REST y llamadas tRPC.
  - **Logs Winston OTLP**: Envío estructurado de logs en JSON con correlación `trace_id` y metadatos nativos de Kubernetes (`k8s.pod.name`, `k8s.namespace.name`).
  - **Métricas OTLP**: Monitoreo de latencia, tasa de peticiones y recursos consumidos.

---

## 📁 Arquitectura de Carpetas (Hexagonal / Ports & Adapters)

```text
backend-nestjs/user-service/
├── prisma/
│   └── schema.prisma             # Esquema Prisma ORM (Base de datos MySQL userdb)
├── src/
│   ├── adapters/                 # Adaptadores Hexagonales (Interface Adapters)
│   │   ├── inbound/              # Adaptadores de Entrada (Driving / Primary)
│   │   │   ├── trpc/             # Router tRPC inter-servicio (user-trpc.router.ts)
│   │   │   └── rest/             # Controladores REST HTTP (UserController, HealthController)
│   │   └── outbound/             # Adaptadores de Salida (Driven / Secondary)
│   │       └── persistence/      # Repositorio de persistencia Prisma ORM (prisma-user.repository.ts)
│   ├── application/              # Casos de Uso de Aplicación
│   │   └── use-cases/            # UserUseCases (CreateUser, GetProfile, UpdateBalance, UpdateKYC)
│   ├── domain/                   # Dominio Principal (Core de Negocio)
│   │   ├── entities/             # Entidad UserProfile
      └── ports/                # Interfaces de Puertos Inbound & Outbound
│           ├── inbound/          # UserServicePort
│           └── outbound/         # UserRepositoryPort
│   ├── infrastructure/           # Componentes de Infraestructura
│   │   ├── config/               # Configuración global y validaciones (.env)
│   │   ├── logger/               # Winston Logger contextual
│   │   └── telemetry/            # OpenTelemetry (Trazas OTLP, Métricas y Winston OTLP Logs)
│   ├── app.module.ts             # Módulo Raíz de NestJS
│   └── main.ts                   # Bootstrap (Inicia servidor REST/tRPC puerto :3002 y Swagger UI /users/docs)
├── test/                         # Pruebas Unitarias y E2E (Jest)
├── .dockerignore                 # Exclusiones de construcción Docker
├── .gitignore                    # Control de versiones Git
├── Dockerfile                    # Multi-stage Dockerfile para producción (Node 22 Alpine)
├── package.json                  # Dependencias y scripts pnpm
└── README.md                     # Documentación oficial del microservicio
```

---

## 🛠️ Requisitos Previos

- **Node.js**: `>= 20.x`
- **pnpm**: `>= 9.x`
- **MySQL**: `8.x` (Base de datos `userdb`)

---

## ⚙️ Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz de `backend-nestjs/user-service`:

```env
PORT=3002
NODE_ENV=development

# Base de Datos MySQL
DATABASE_URL="mysql://root:12345@localhost:3306/userdb"

# Telemetría SigNoz / OpenTelemetry Collector
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

# 3. Aplicar esquema y tablas a la base de datos MySQL (userdb)
pnpm dlx prisma db push
```

---

## 🏃 Modos de Ejecución

### 1. Desarrollo Local (Standalone)
```bash
# Ejecutar con recarga en vivo (Watch Mode)
pnpm start:dev
```
- Inicia el servidor REST/tRPC en `http://localhost:3002`.
- Swagger UI disponible en: **`http://localhost:3002/users/docs`** o `http://localhost:3002/api-docs`.

### 2. Producción Local
```bash
# Compilar el código TypeScript
pnpm run build

# Ejecutar compilación de producción
pnpm start:prod
```

### 3. En Kubernetes / Rancher Desktop (k3s)
```bash
# Construir imagen en containerd
nerdctl --namespace k8s.io build -t fintech/user-service:nestjs ./backend-nestjs/user-service

# Reiniciar deployment en Kubernetes
kubectl rollout restart deployment/user-service -n fintech
```
- Swagger UI accesible mediante Ingress en: **`http://localhost/users/docs/`**

---

## 🧪 Guía de Pruebas e Interacción (REST & tRPC)

### 1. Consultar Perfil de Usuario por ID (`GET /users/profile/:id`)
```bash
curl -X GET http://localhost:3002/users/profile/1
```

### 2. Crear Nuevo Perfil (`POST /users`)
```bash
curl -X POST http://localhost:3002/users \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "email": "test.user@fintech.com",
    "name": "Usuario de Prueba",
    "balance": 10000
  }'
```

### 3. Actualizar Saldo de Usuario (`PUT /users/profile/:id/balance`)
```bash
curl -X PUT http://localhost:3002/users/profile/1/balance \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000
  }'
```

### 4. Probar Router tRPC (`POST /trpc`)
```bash
curl -X POST http://localhost:3002/trpc/getUserById \
  -H "Content-Type: application/json" \
  -d '{"id": 1}'
```

### 5. Health Check (`GET /users/health`)
```bash
curl -X GET http://localhost:3002/users/health
```

---

## 📊 Integración con SigNoz & Observabilidad

- **Trazabilidad Distribuida**: Las peticiones entrantes REST y tRPC generan tramos con atributos de contexto.
- **Correlación de Logs**: Winston captura los logs y los adjunta con la traza correspondiente para facilitar el depurado directo en SigNoz APM.
