# API Gateway e Ingress Traefik

Este documento describe la capa de enrutamiento y entrada al clúster de Kubernetes mediante **Traefik Ingress Controller**, los Middlewares aplicados (StripPrefix, RateLimiting), la matriz de rutas de servicios y el acceso al dashboard administrativo.

---

## 📑 Contenido

1. [Arquitectura del API Gateway](#1-arquitectura-del-api-gateway)
2. [Middlewares de Traefik (CRDs)](#2-middlewares-de-traefik-crds)
3. [Matriz de Enrutamiento Ingress](#3-matriz-de-enrutamiento-ingress)
4. [Ingress de Observabilidad OTLP y Maildev](#4-ingress-de-observabilidad-otlp-y-maildev)
5. [Acceso al Dashboard de Traefik](#5-acceso-al-dashboard-de-traefik)
6. [Diagnóstico y Troubleshooting de Ingress](#6-diagnóstico-y-troubleshooting-de-ingress)

---

## 1. Arquitectura del API Gateway

Traefik opera como el Ingress Controller nativo dentro del namespace `kube-system` de K3s / Rancher Desktop. Expone los puertos estándar HTTP (`80`) y HTTPS (`443`) y enruta el tráfico hacia los microservicios desplegados en el namespace `fintech`.

```mermaid
graph TD
    Client["Petición Cliente / Frontend"] --> Traefik["Traefik Ingress Controller (Puerto: 80)"]
    
    subgraph MiddlewaresApplied ["Middlewares Traefik"]
        StripApi["strip-api-prefix (^/api)"]
        RateLimit["auth-ratelimit (100 req/s, burst 50)"]
        StripOtlp["strip-otlp-prefix (^/otlp)"]
        StripMail["strip-maildev-prefix (^/maildev)"]
    end

    Traefik -->|Aplica Middlewares| MiddlewaresApplied

    MiddlewaresApplied -->|/api/auth/* o /auth/*| AuthSvc["auth-service:3001"]
    MiddlewaresApplied -->|/api/users/* o /users/*| UserSvc["user-service:8082"]
    MiddlewaresApplied -->|/api/transactions/* o /transactions/*| TxSvc["transaction-service:8083"]
    MiddlewaresApplied -->|/api/notifications/* o /notifications/*| NotifSvc["notification-service:8084"]
    MiddlewaresApplied -->|/api/worker/* o /worker/*| WorkerSvc["worker-service:8085"]
    MiddlewaresApplied -->|/otlp/*| OTelCol["otel-collector:4318"]
    MiddlewaresApplied -->|/maildev/* o maildev.localhost| Maildev["maildev:1080"]
    Traefik -->|/ (Frontend SPA)| Frontend["frontend:80"]
```

---

## 2. Middlewares de Traefik (CRDs)

Definidos en `k8s/05-ingress.yaml` mediante la Custom Resource Definition `traefik.io/v1alpha1`:

### 1. `strip-api-prefix`
Remueve el prefijo `/api` al inicio de la URL antes de reenviar la solicitud al microservicio destino:
* **Entrada**: `GET http://localhost/api/users/profile/1`
* **Destino**: `GET http://user-service:8082/users/profile/1`

### 2. `auth-ratelimit`
Protege los endpoints de autenticación contra ataques de fuerza bruta y saturación:
* **Tasa promedio (`average`)**: 100 peticiones/segundo.
* **Ráfaga permitida (`burst`)**: hasta 50 solicitudes concurrentes.

### 3. `strip-otlp-prefix`
Remueve el prefijo `/otlp` para permitir que la telemetría web del frontend React alcance el puerto HTTP `4318` del OpenTelemetry Collector.

### 4. `strip-maildev-prefix`
Remueve `/maildev` para acceder a la consola gráfica de Maildev sin alterar las rutas internas de assets.

---

## 3. Matriz de Enrutamiento Ingress

| Path Ingress | Servicio Destino | Puerto K8s | Métodos HTTP | Middlewares Aplicados | Propósito |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `/` | `frontend` | `80` | `GET` | Ninguno | Servir la aplicación React SPA |
| `/api/auth/*` | `auth-service` | `3001` | `GET, POST, PUT` | `strip-api-prefix` | Endpoints de registro, login y 2FA |
| `/auth/*` | `auth-service` | `3001` | `GET, POST, PUT` | `auth-ratelimit` | Acceso directo y Swagger UI (`/auth/docs/`) |
| `/api/users/*` | `user-service` | `8082` | `GET, POST, PUT` | `strip-api-prefix` | Gestión de perfiles y saldos |
| `/users/*` | `user-service` | `8082` | `GET, POST, PUT` | Ninguno | Acceso directo y Swagger UI (`/users/docs/`) |
| `/api/transactions/*`| `transaction-service` | `8083` | `GET, POST, PUT` | `strip-api-prefix` | Transferencias CQRS e historial |
| `/transactions/*`| `transaction-service` | `8083` | `GET, POST, PUT` | Ninguno | Acceso directo y Swagger UI (`/transactions/docs/`) |
| `/api/notifications/*`| `notification-service`| `8084` | `GET, PATCH` | `strip-api-prefix` | Consulta y lectura de notificaciones |
| `/notifications/*`| `notification-service`| `8084` | `GET, PATCH` | Ninguno | Acceso directo y Swagger UI (`/notifications/docs/`) |
| `/api/worker/*` | `worker-service` | `8085` | `GET, POST` | `strip-api-prefix` | Solicitud y descarga de extractos PDF |
| `/worker/*` | `worker-service` | `8085` | `GET, POST` | Ninguno | Acceso directo y Swagger UI (`/worker/docs/`) |

---

## 4. Ingress de Observabilidad OTLP y Maildev

* **Ingress OTLP (`otlp-ingress`)**:
  - Path: `/otlp`
  - Backend: `otel-collector:4318`
  - Permite al navegador enviar métricas de rendimiento web y trazas distribuidas al Collector mediante CORS abierto.
* **Ingress Maildev (`maildev-ingress`)**:
  - Paths: `/maildev` y hosts virtuales `maildev.localhost`, `mail.localhost`.
  - Backend: `maildev:1080`.

---

## 5. Acceso al Dashboard de Traefik

Traefik expone su consola gráfica de métricas y enrutadores mediante un recurso `IngressRoute` en el namespace `kube-system`:

* **Host**: `traefik.localhost`
* **URL**: [http://traefik.localhost/dashboard/](http://traefik.localhost/dashboard/)

Desde este panel es posible supervisar:
1. El estado de todos los Routers HTTP.
2. Los Middlewares activos y contadores de solicitudes procesadas.
3. El estado de salud de los servicios backend asociados.

---

## 6. Diagnóstico y Troubleshooting de Ingress

### Comandos de Diagnóstico:

```bash
# 1. Listar todos los recursos Ingress en el namespace fintech
kubectl get ingress -n fintech

# 2. Describir la configuración y endpoints asignados a un Ingress
kubectl describe ingress fintech-ingress -n fintech

# 3. Listar los Middlewares registrados en Traefik
kubectl get middlewares.traefik.io -n fintech

# 4. Inspeccionar los logs de Traefik ante errores 404 o 502
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik --tail=100
```

Para comprender los recursos globales del clúster donde opera Traefik, consulta el documento de [Kubernetes](kubernetes.md).
