# FinTech Wallet

Sistema de billetera virtual desarrollado con arquitectura de microservicios. Permite realizar transferencias, solicitar dinero, gestionar contactos favoritos, pagos por QR y mas.

## Arquitectura

```
                         +-------------------+
                         |     FRONTEND      |
                         |  React + Vite     |
                         |    Port: 3000     |
                         +--------+----------+
                                  |
                                  v
                         +--------+----------+
                         |   API GATEWAY     |
                         |   Port: 8080      |
                         |  (JWT Validation) |
                         +--------+----------+
                                  |
               +------------------+------------------+
               |                  |                  |
               v                  v                  v
     +---------+-----+  +--------+-------+  +-------+-----------+
     | AUTH SERVICE   |  | USER SERVICE   |  | TRANSACTION       |
     | Port: 8081     |  | Port: 8082     |  | SERVICE           |
     |                |  |                |  | Port: 8083        |
     | - Login/Reg    |  | - Perfiles     |  | - Transferencias  |
     | - JWT          |  | - Balance      |  | - Solicitudes     |
     | - 2FA (TOTP)   |  | - Settings     |  | - Limites diarios |
     | - Email Verif  |  |                |  |                   |
     +-------+--------+  +-------+--------+  +-------+-----+-----+
             |                    |                   |     |
             v                    v                   v     |
     +-------+--------------------+-------------------+     |
     |              MySQL 8.0                          |     |
     |   +--------+ +---------+ +-----------------+   |     | Kafka
     |   | authdb | | userdb  | | transactiondb   |   |     |
     |   +--------+ +---------+ +-----------------+   |     |
     +-------------------------------------------------+     |
                                                             v
                                                  +----------+--------+
                                                  | NOTIFICATION      |
                                                  | SERVICE           |
                                                  | Port: 8084        |
                                                  +-------------------+
```

## Stack Tecnologico

| Capa | Tecnologias |
|------|-------------|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, React Router v6, Axios, Recharts, jsPDF, xlsx, qrcode.react, html5-qrcode |
| **Backend** | Spring Boot 3, Spring Data JPA, Spring Cloud Gateway, Spring Kafka, Spring Mail, JJWT, Lombok, Commons Codec |
| **Base de Datos** | MySQL 8.0 |
| **Mensajeria** | Apache Kafka + Zookeeper |
| **Email** | Gmail SMTP (produccion) / Mailpit (desarrollo) |
| **Contenedores** | Docker + Docker Compose |
| **Servidor Web** | Nginx (reverse proxy) |

## Funcionalidades

### Faciles
- Depositar y retirar dinero
- Buscar usuarios por nombre o email
- Modo oscuro / claro
- Diseno responsive (mobile + desktop)

### Intermedias
- Filtros por fecha en historial de transacciones
- Exportar historial a PDF y Excel
- Graficos de transacciones en el Dashboard (Recharts)
- Notificaciones en tiempo real (polling)
- Cambio de contrasena
- Contactos favoritos (localStorage)

### Avanzadas
- Transferencias por codigo QR (generar y escanear)
- Solicitar dinero a otros usuarios (crear/aceptar/rechazar)
- Limite diario de transferencias configurable
- Panel de administracion (rol ADMIN)
- Verificacion de email (Gmail SMTP real)
- Autenticacion de dos factores (2FA/TOTP con Google Authenticator)
- Multiples monedas (ARS, USD, EUR) con tasas de cambio

## Microservicios

### Auth Service (Puerto 8081)
Maneja autenticacion, registro, JWT, verificacion de email y 2FA.

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/auth/register` | Registrar usuario |
| POST | `/auth/login` | Iniciar sesion |
| POST | `/auth/verify-totp` | Verificar codigo 2FA |
| GET | `/auth/verify-email` | Verificar email por token |
| GET | `/auth/me` | Estado actual del usuario |
| POST | `/auth/resend-verification` | Reenviar email de verificacion |
| POST | `/auth/setup-totp` | Configurar 2FA |
| POST | `/auth/enable-totp` | Activar 2FA |
| POST | `/auth/disable-totp` | Desactivar 2FA |
| PUT | `/auth/change-password` | Cambiar contrasena |
| PUT | `/auth/promote-admin` | Promover a administrador |

### User Service (Puerto 8082)
Gestiona perfiles de usuario, balances y configuraciones.

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/users` | Crear usuario |
| GET | `/users` | Listar todos los usuarios |
| GET | `/users/{id}` | Obtener usuario por ID |
| PUT | `/users/{id}/balance` | Actualizar saldo |
| PUT | `/users/{id}/settings` | Cambiar moneda y limite diario |

### Transaction Service (Puerto 8083)
Procesa transferencias, solicitudes de dinero y valida limites diarios.

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/transactions/transfer` | Realizar transferencia |
| GET | `/transactions/user/{userId}` | Historial por usuario |
| GET | `/transactions/all` | Todas las transacciones (admin) |
| POST | `/transactions/request` | Crear solicitud de dinero |
| GET | `/transactions/requests/{userId}` | Solicitudes por usuario |
| PUT | `/transactions/requests/{id}/accept` | Aceptar solicitud |
| PUT | `/transactions/requests/{id}/reject` | Rechazar solicitud |

### Notification Service (Puerto 8084)
Consume eventos de Kafka cuando se completa una transferencia.

### API Gateway (Puerto 8080)
Punto de entrada unico. Valida JWT y rutea a los servicios correspondientes.

## Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Puertos disponibles: 3000, 3307, 8080-8084, 9092, 2181, 8025, 1025

## Instalacion y Ejecucion

### 1. Clonar el repositorio

```bash
git clone https://github.com/jara96/fintech-wallet.git
cd fintech-wallet
```

### 2. Configurar email (opcional)

Si queres que los emails de verificacion lleguen a casillas reales, crea un archivo `.env` en la raiz:

```env
GMAIL_USER=tu-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Para obtener la App Password de Gmail:
1. Activa la verificacion en 2 pasos en https://myaccount.google.com/signinoptions/two-step-verification
2. Genera una contrasena de aplicacion en https://myaccount.google.com/apppasswords

> Si no configuras el `.env`, los emails se envian a Mailpit (servidor de testing local) y podes verlos en http://localhost:8025

### 3. Levantar el proyecto

```bash
docker compose up -d
```

Espera unos minutos a que todos los servicios arranquen (la primera vez descarga las imagenes y compila los JARs).

### 4. Verificar que todo esta corriendo

```bash
docker compose ps
```

Deberias ver 10 contenedores corriendo.

### 5. Acceder a la aplicacion

| Servicio | URL |
|----------|-----|
| **Aplicacion Web** | http://localhost:3000 |
| **API Gateway** | http://localhost:8080 |
| **Mailpit (emails de testing)** | http://localhost:8025 |

### 6. Crear tu primer usuario

1. Anda a http://localhost:3000/register
2. Registrate con email y contrasena
3. Listo! Ya podes usar la app

## Base de Datos

El sistema usa 3 bases de datos MySQL independientes:

| Base | Servicio | Tablas |
|------|----------|--------|
| `authdb` | Auth Service | `users` (credenciales, 2FA, verificacion) |
| `userdb` | User Service | `user_profiles` (nombre, balance, moneda, limite) |
| `transactiondb` | Transaction Service | `transactions`, `money_requests` |

Conexion a MySQL:
```
Host: localhost
Puerto: 3307
Usuario: root
Contrasena: 12345
```

## Estructura del Proyecto

```
fintech-wallet/
├── backend/
│   ├── api-gateway/          # Gateway + JWT filter
│   ├── auth-service/         # Autenticacion, 2FA, email
│   ├── user-service/         # Perfiles y balances
│   ├── transaction-service/  # Transferencias y solicitudes
│   └── notification-service/ # Kafka consumer
├── frontend/
│   ├── src/
│   │   ├── components/       # Layout (Sidebar, AppLayout)
│   │   ├── context/          # AuthContext, ThemeContext
│   │   ├── pages/            # 13 paginas
│   │   └── services/         # API client (Axios)
│   ├── Dockerfile            # Multi-stage build
│   └── nginx.conf            # Reverse proxy config
├── docker-compose.yml        # 10 contenedores
├── init-databases.sql        # Creacion de bases de datos
├── ARQUITECTURA.md           # Diagramas detallados
└── README.md
```

## Puertos

| Puerto | Servicio |
|--------|----------|
| 3000 | Frontend (React) |
| 8080 | API Gateway |
| 8081 | Auth Service |
| 8082 | User Service |
| 8083 | Transaction Service |
| 8084 | Notification Service |
| 3307 | MySQL |
| 9092 | Kafka |
| 2181 | Zookeeper |
| 8025 | Mailpit (Web UI) |
| 1025 | Mailpit (SMTP) |

## Comandos Utiles

```bash
# Levantar todo
docker compose up -d

# Ver logs de un servicio
docker compose logs -f auth-service

# Detener todo
docker compose down

# Reconstruir un servicio especifico
docker compose up -d --build auth-service

# Ver estado de los contenedores
docker compose ps
```

## Tecnologias Detalladas

### Frontend
- **React 19** - UI library
- **Vite 8** - Build tool
- **Tailwind CSS v4** - Estilos con dark mode
- **React Router v6** - Navegacion SPA
- **Axios** - HTTP client con interceptors JWT
- **Recharts** - Graficos del dashboard
- **jsPDF + jspdf-autotable** - Exportar a PDF
- **xlsx + file-saver** - Exportar a Excel
- **qrcode.react** - Generar codigos QR
- **html5-qrcode** - Escanear QR con camara
- **react-hot-toast** - Notificaciones toast

### Backend
- **Spring Boot 3** - Framework principal
- **Spring Data JPA** - ORM con Hibernate
- **Spring Cloud Gateway** - API Gateway
- **Spring Kafka** - Mensajeria asincrona
- **Spring Mail** - Envio de emails
- **JJWT** - JSON Web Tokens
- **Lombok** - Reduccion de boilerplate
- **Commons Codec** - Base32 para TOTP/2FA
- **BCrypt** - Hash de contrasenas
- **MySQL Connector** - Driver de base de datos
