# Guía de Inicio Rápido y Requisitos (Getting Started)

Esta guía describe los prerrequisitos, la preparación del entorno y los pasos exactos para clonar, configurar, desplegar y verificar el ecosistema completo de **FinTech Wallet** tanto en un clúster local de Kubernetes como en un entorno de desarrollo individual.

---

## 📑 Contenido

1. [Prerrequisitos de Software](#1-prerrequisitos-de-software)
2. [Estrategia de Ejecución: Local vs Kubernetes](#2-estrategia-de-ejecución-local-vs-kubernetes)
3. [Clonación del Repositorio](#3-clonación-del-repositorio)
4. [Configuración de Variables de Entorno](#4-configuración-de-variables-de-entorno)
5. [Despliegue Completo en Kubernetes](#5-despliegue-completo-en-kubernetes)
6. [Verificación del Despliegue y Salud del Clúster](#6-verificación-del-despliegue-y-salud-del-clúster)
7. [Acceso a las Aplicaciones y Paneles de Control](#7-acceso-a-las-aplicaciones-y-paneles-de-control)
8. [Ejecución de Pruebas de Humo](#8-ejecución-de-pruebas-de-humo)

---

## 1. Prerrequisitos de Software

Antes de iniciar, asegúrate de contar con las siguientes herramientas instaladas y configuradas en tu estación de trabajo:

| Herramienta | Versión Mínima / Recomendada | Propósito | Comprobación |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.18.0` / `v22.x` | Runtime de JavaScript/TypeScript | `node --version` |
| **pnpm** | `v10.4.1` (o `v9.x+`) | Gestor de paquetes de alto rendimiento | `pnpm --version` |
| **Rancher Desktop** | `v1.14+` / `v1.16+` | Entorno de Kubernetes K3s y motor containerd | Interfaz de Rancher Desktop |
| **kubectl** | `v1.28.0+` | CLI de administración de Kubernetes | `kubectl version --client` |
| **nerdctl** | `v1.7.0+` | CLI para interactuar con containerd | `nerdctl version` |
| **Helm** | `v3.14.0+` | Gestor de paquetes para Kubernetes | `helm version` |
| **Git** | `v2.40.0+` | Control de versiones | `git --version` |
| **PowerShell / Bash** | PowerShell 7+ / Bash 5+ | Ejecución de scripts automatizados | `$PSVersionTable.PSVersion` o `bash --version` |

> [!IMPORTANT]
> En **Rancher Desktop**, asegúrate de que:
> 1. En **Preferences > Container Engine**, esté seleccionado **containerd**.
> 2. En **Preferences > Kubernetes**, la casilla **Enable Kubernetes** esté activada (usando K3s).
> 3. El contexto de `kubectl` esté apuntando a `rancher-desktop` (`kubectl config use-context rancher-desktop`).

---

## 2. Estrategia de Ejecución: Local vs Kubernetes

El proyecto soporta dos modos de trabajo según la necesidad del desarrollador:

```text
                               ┌────────────────────────────────────────────────┐
                               │             MODO DE EJECUCIÓN                  │
                               └──────────────────────┬─────────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │     DESARROLLO LOCAL      │                                 │   KUBERNETES COMPLETO     │
         ├───────────────────────────┤                                 ├───────────────────────────┤
         │ • Modificación activa     │                                 │ • Sistema 100% integrado  │
         │ • Hot reload (NestJS/Vite)│                                 │ • Ruteo Traefik Ingress   │
         │ • Dependencias vía Docker │                                 │ • PgBouncer + StatefulSets│
         │ • Depuración en IDE       │                                 │ • Observabilidad SigNoz   │
         └───────────────────────────┘                                 └───────────────────────────┘
```

* **Modo Kubernetes Completo (Recomendado para Onboarding y QA)**: Despliega los 5 microservicios, frontend, Traefik, PostgreSQL Core & Support, PgBouncer, Redis, Kafka KRaft, Maildev, ClickHouse, SigNoz y OTel Collector en el clúster.
* **Modo Desarrollo Local (Para programar un servicio)**: Ejecuta las dependencias de base (Postgres, Redis, Kafka) y corre el servicio deseado localmente con `pnpm start:dev` (consulta la [Guía de Desarrollo Local](development.md)).

---

## 3. Clonación del Repositorio

Clona el repositorio oficial y sitúate en la rama activa `k8s-nestjs`:

```bash
git clone https://github.com/bleidertcs/fintech-wallet.git
cd fintech-wallet
git checkout k8s-nestjs
```

---

## 4. Configuración de Variables de Entorno

El repositorio incluye un archivo de plantilla `.env.example` con configuraciones por defecto preestablecidas para el funcionamiento local y en clúster.

Copia la plantilla a `.env`:

```powershell
# En Windows (PowerShell)
Copy-Item .env.example .env

# En Linux / macOS (Bash)
cp .env.example .env
```

### Tabla de Variables de Entorno Globales

| Variable | Obligatoria | Descripción | Valor por Defecto |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Sí | Entorno de ejecución (`development` / `production`) | `production` |
| `DB_USERNAME` | Sí | Usuario administrador de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Sí | Contraseña de acceso a PostgreSQL | `<secure-password>` |
| `JWT_SECRET` | Sí | Clave criptográfica para firma de tokens JWT | `<base64-random-secret>` |
| `REDIS_HOST` | Sí | Host de conexión al servidor Redis | `redis` |
| `REDIS_PORT` | Sí | Puerto de conexión al servidor Redis | `6379` |
| `KAFKA_BROKERS`| Sí | Lista de brokers Kafka para productores/consumidores | `kafka:29092` |
| `MAIL_HOST` | Sí | Host del servidor SMTP para notificaciones | `maildev` |
| `MAIL_PORT` | Sí | Puerto del servidor SMTP | `1025` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Sí | Endpoint OTLP HTTP para telemetría | `http://otel-collector.fintech.svc.cluster.local:4318` |

---

## 5. Despliegue Completo en Kubernetes

El despliegue está 100% automatizado mediante scripts que interactúan con `nerdctl` y `kubectl`.

### Ejecutar Despliegue Automatizado

```powershell
# En Windows (PowerShell)
.\deploy-rancher.ps1

# En Linux / macOS (Bash)
chmod +x ./deploy-rancher.sh
./deploy-rancher.sh
```

### ¿Qué hace el script de despliegue?

1. **Verifica la conectividad** con containerd (`nerdctl`) y con el clúster de Kubernetes (`kubectl config current-context`).
2. **Compila las 6 imágenes Docker** (`frontend`, `auth-service`, `user-service`, `transaction-service`, `notification-service`, `worker-service`) directamente en el namespace `k8s.io` de containerd, evitando la necesidad de un registry externo.
3. **Verifica el Ingress Controller Traefik** nativo en el namespace `kube-system`.
4. **Aplica secuencialmente los manifiestos** ubicados en `k8s/`:
   - `00-namespace-config.yaml`: Namespace `fintech`, scripts SQL de inicialización y Secretos.
   - `01-infrastructure.yaml`: StatefulSets de Postgres Core, Postgres Support, PgBouncer, Redis, Kafka KRaft y Maildev.
   - `02-microservices.yaml`: Deployments y Servicios de los 5 microservicios NestJS.
   - `03-frontend.yaml`: Deployment y Servicio NodePort para el frontend React.
   - `04-observability.yaml`: StatefulSet de ClickHouse, Job de migración SigNoz, SigNoz UI y OTel Collector.
   - `05-ingress.yaml`: Middlewares de Traefik y reglas Ingress HTTP.
   - `06-networkpolicy.yaml`: Políticas de aislamiento de red entre Pods.
   - `07-backup-cronjob.yaml`: CronJob de respaldos automáticos de bases de datos.

---

## 6. Verificación del Despliegue y Salud del Clúster

Una vez finalizado el script, verifica que todos los recursos se encuentren en estado `Running` o `Completed`:

```bash
# 1. Listar todos los Pods en el namespace fintech
kubectl get pods -n fintech

# 2. Listar todos los servicios activos
kubectl get svc -n fintech

# 3. Listar todas las rutas Ingress
kubectl get ingress -n fintech

# 4. Inspeccionar los StatefulSets
kubectl get statefulset -n fintech
```

### Salida esperada de Pods:

```text
NAME                                   READY   STATUS      RESTARTS   AGE
auth-service-xxxxxxxxxx-xxxxx          1/1     Running     0          2m
user-service-xxxxxxxxxx-xxxxx          1/1     Running     0          2m
transaction-service-xxxxxxxxxx-xxxxx   1/1     Running     0          2m
notification-service-xxxxxxxxxx-xxxxx  1/1     Running     0          2m
worker-service-xxxxxxxxxx-xxxxx        1/1     Running     0          2m
frontend-xxxxxxxxxx-xxxxx              1/1     Running     0          2m
maildev-xxxxxxxxxx-xxxxx               1/1     Running     0          2m
pgbouncer-core-xxxxxxxxxx-xxxxx        1/1     Running     0          2m
postgres-core-0                        1/1     Running     0          3m
postgres-support-0                     1/1     Running     0          3m
redis-0                                1/1     Running     0          3m
kafka-0                                1/1     Running     0          3m
clickhouse-0                           1/1     Running     0          3m
signoz-xxxxxxxxxx-xxxxx                1/1     Running     0          2m
otel-collector-xxxxxxxxxx-xxxxx        1/1     Running     0          2m
signoz-migrator-xxxxx                  0/1     Completed   0          2m
```

---

## 7. Acceso a las Aplicaciones y Paneles de Control

Una vez levantado el sistema, todos los componentes quedan accesibles en tu máquina local:

| Aplicación / Servicio | URL Local | Descripción |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost/](http://localhost/) | Billetera digital SPA (React) |
| **Auth Service Swagger** | [http://localhost/auth/docs/](http://localhost/auth/docs/) | Documentación interactiva de autenticación |
| **User Service Swagger** | [http://localhost/users/docs/](http://localhost/users/docs/) | Documentación interactiva de usuarios y saldos |
| **Transaction Service Swagger**| [http://localhost/transactions/docs/](http://localhost/transactions/docs/) | Documentación interactiva de transferencias |
| **Notification Service Swagger**| [http://localhost/notifications/docs/](http://localhost/notifications/docs/) | Documentación interactiva de notificaciones |
| **Worker Service Swagger** | [http://localhost/worker/docs/](http://localhost/worker/docs/) | Documentación interactiva de extractos PDF |
| **Maildev Web UI** | [http://localhost/maildev/](http://localhost/maildev/) | Bandeja de entrada de correos simulados |
| **SigNoz APM Dashboard** | [http://localhost:30301/](http://localhost:30301/) | Panel de observabilidad, trazas y métricas |
| **Traefik Dashboard** | [http://traefik.localhost/dashboard/](http://traefik.localhost/dashboard/) | Consola de administración del Ingress Controller |

---

## 8. Ejecución de Pruebas de Humo

Para certificar que la red, las bases de datos, los pools de conexión y las rutas HTTP están respondiendo adecuadamente, ejecuta el script de prueba de humo:

```powershell
.\scripts\smoke-test.ps1
```

Este script valida:
1. Estado saludable de todos los pods en Kubernetes.
2. Respuestas HTTP 200 en los endpoints `/health` de cada microservicio a través de Traefik.
3. Disponibilidad de las interfaces Swagger UI.
4. Conectividad directa con PostgreSQL, Redis y Kafka.

Para continuar explorando la plataforma, consulta la [Ficha Técnica de Microservicios](services.md) o la [Guía de Transacciones](transactions.md).
