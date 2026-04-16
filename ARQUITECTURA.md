# FinTech Wallet - Arquitectura del Proyecto

## 1. Arquitectura General del Sistema

```
                                    SISTEMA FINTECH WALLET
 =============================================================================================

                              +-------------------+
                              |     FRONTEND      |
                              |   React + Vite    |
                              |    Port: 3000     |
                              +--------+----------+
                                       |
                                       | HTTP (Nginx Proxy /api/)
                                       v
                              +-------------------+
                              |    API GATEWAY    |
                              |  Spring Cloud     |
                              |   Port: 8080      |
                              |  (JWT Validator)  |
                              +--------+----------+
                                       |
                    +------------------+------------------+
                    |                  |                  |
                    v                  v                  v
          +---------+------+  +-------+--------+  +------+-----------+
          | AUTH SERVICE   |  | USER SERVICE   |  | TRANSACTION      |
          | Port: 8081     |  | Port: 8082     |  | SERVICE          |
          |                |  |                |  | Port: 8083       |
          | - Login/Reg    |  | - Perfiles     |  | - Transferencias |
          | - JWT          |  | - Balance      |  | - Solicitudes    |
          | - 2FA (TOTP)   |  | - Settings     |  | - Limites        |
          | - Email Verif  |  |                |  |                  |
          +-------+--------+  +-------+--------+  +-------+----+-----+
                  |                   |                    |        |
                  v                   v                    v        |
          +-------+-------------------+------------------------+    |
          |              MySQL 8.0 (Port: 3307)                |    |
          |   +----------+  +-----------+  +----------------+  |    |
          |   |  authdb  |  |  userdb   |  | transactiondb  |  |    |
          |   +----------+  +-----------+  +----------------+  |    |
          +----------------------------------------------------+    |
                                                                    |
                                                          Kafka     |
                                                          Event     |
                                                                    v
                                                         +----------+---------+
                                                         | NOTIFICATION       |
                                                         | SERVICE            |
                                                         | Port: 8084         |
                                                         | (Kafka Consumer)   |
                                                         +--------------------+

  INFRAESTRUCTURA:
  +-------------+     +-------------+     +-------------+     +-------------+
  |   MySQL     |     | Zookeeper   |     |   Kafka     |     |   Mailpit   |
  |  Port:3307  |     | Port:2181   |     |  Port:9092  |     | Port:8025   |
  +-------------+     +-------------+     +-------------+     +-------------+
```

---

## 2. Stack Tecnologico

```
 +==========================+==========================================+
 |       CAPA               |           TECNOLOGIA                     |
 +==========================+==========================================+
 |                          |  React 19                                |
 |       FRONTEND           |  Vite 8                                  |
 |                          |  Tailwind CSS v4                         |
 |                          |  React Router v6                         |
 |                          |  Axios (HTTP Client)                     |
 |                          |  Recharts (Graficos)                     |
 |                          |  jsPDF + xlsx (Exportaciones)            |
 |                          |  qrcode.react + html5-qrcode (QR)        |
 +--------------------------+------------------------------------------+
 |                          |  Spring Boot 3                           |
 |       BACKEND            |  Spring Data JPA                         |
 |                          |  Spring Cloud Gateway                    |
 |                          |  Spring Kafka                            |
 |                          |  Spring Mail                             |
 |                          |  JJWT (JSON Web Tokens)                  |
 |                          |  Lombok                                  |
 |                          |  Commons Codec (TOTP/2FA)                |
 +--------------------------+------------------------------------------+
 |       BASE DE DATOS      |  MySQL 8.0                               |
 +--------------------------+------------------------------------------+
 |       MENSAJERIA         |  Apache Kafka + Zookeeper                |
 +--------------------------+------------------------------------------+
 |       EMAIL              |  Gmail SMTP (prod) / Mailpit (dev)       |
 +--------------------------+------------------------------------------+
 |       CONTENEDORES       |  Docker + Docker Compose                 |
 +--------------------------+------------------------------------------+
 |       SERVIDOR WEB       |  Nginx (Frontend reverse proxy)          |
 +==========================+==========================================+
```

---

## 3. Microservicios - Detalle

### 3.1 Auth Service (Puerto 8081)

```
 AUTH SERVICE
 +================================================================+
 |                                                                 |
 |  Entidad: User                                                  |
 |  +-----------------------------------------------------------+  |
 |  | id          | Long    | PK, Auto-generated                |  |
 |  | email       | String  | Unique, Not Null                  |  |
 |  | password    | String  | BCrypt encoded                    |  |
 |  | role        | String  | "USER" o "ADMIN"                  |  |
 |  | verified    | boolean | Email verificado (default: false) |  |
 |  | verif.Token | String  | UUID para verificar email         |  |
 |  | totpSecret  | String  | Clave secreta para 2FA            |  |
 |  | totpEnabled | boolean | 2FA activo (default: false)       |  |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  Endpoints:                                                     |
 |  +-----------------------------------------------------------+  |
 |  | POST   /auth/register            | Registrar usuario      |  |
 |  | POST   /auth/login               | Iniciar sesion         |  |
 |  | POST   /auth/verify-totp         | Verificar codigo 2FA   |  |
 |  | GET    /auth/verify-email        | Verificar email (token)|  |
 |  | GET    /auth/me                  | Estado actual usuario  |  |
 |  | POST   /auth/resend-verification | Reenviar verif. email  |  |
 |  | POST   /auth/setup-totp          | Configurar 2FA         |  |
 |  | POST   /auth/enable-totp         | Activar 2FA            |  |
 |  | POST   /auth/disable-totp        | Desactivar 2FA         |  |
 |  | PUT    /auth/change-password     | Cambiar contrasena     |  |
 |  | PUT    /auth/promote-admin       | Promover a admin       |  |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  Base de datos: authdb                                          |
 +================================================================+
```

### 3.2 User Service (Puerto 8082)

```
 USER SERVICE
 +================================================================+
 |                                                                 |
 |  Entidad: UserProfile                                           |
 |  +-----------------------------------------------------------+  |
 |  | id          | Long       | PK, Auto-generated             |  |
 |  | name        | String     | Not Null                       |  |
 |  | email       | String     | Unique, Not Null               |  |
 |  | balance     | BigDecimal | Saldo actual                   |  |
 |  | dailyLimit  | BigDecimal | Limite diario (default: 50000) |  |
 |  | currency    | String     | Moneda (default: "ARS")        |  |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  Endpoints:                                                     |
 |  +-----------------------------------------------------------+  |
 |  | POST   /users              | Crear usuario                |  |
 |  | GET    /users              | Listar todos                 |  |
 |  | GET    /users/{id}         | Obtener por ID               |  |
 |  | PUT    /users/{id}/balance | Actualizar saldo             |  |
 |  | PUT    /users/{id}/settings| Cambiar moneda/limite        |  |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  Base de datos: userdb                                          |
 +================================================================+
```

### 3.3 Transaction Service (Puerto 8083)

```
 TRANSACTION SERVICE
 +================================================================+
 |                                                                 |
 |  Entidad: Transaction                                           |
 |  +-----------------------------------------------------------+  |
 |  | id          | Long       | PK, Auto-generated             |  |
 |  | fromUserId  | Long       | ID del emisor                  |  |
 |  | toUserId    | Long       | ID del receptor                |  |
 |  | amount      | BigDecimal | Monto transferido              |  |
 |  | status      | String     | "COMPLETED"                    |  |
 |  | createdAt   | DateTime   | Fecha/hora automatica          |  |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  Entidad: MoneyRequest                                          |
 |  +-----------------------------------------------------------+  |
 |  | id          | Long       | PK, Auto-generated             |  |
 |  | requesterId | Long       | Quien pide dinero              |  |
 |  | targetId    | Long       | A quien le pide                |  |
 |  | amount      | BigDecimal | Monto solicitado               |  |
 |  | message     | String     | Mensaje (max 255 chars)        |  |
 |  | status      | String     | PENDING / ACCEPTED / REJECTED  |  |
 |  | createdAt   | DateTime   | Fecha/hora automatica          |  |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  Endpoints:                                                     |
 |  +-----------------------------------------------------------+  |
 |  | POST /transactions/transfer           | Transferir         | |
 |  | GET  /transactions/user/{userId}      | Historial usuario  | |
 |  | GET  /transactions/all                | Todas (admin)      | |
 |  | POST /transactions/request            | Solicitar dinero   | |
 |  | GET  /transactions/requests/{userId}  | Mis solicitudes    | |
 |  | PUT  /transactions/requests/{id}/accept| Aceptar solicitud | |
 |  | PUT  /transactions/requests/{id}/reject| Rechazar solicitud| |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  Base de datos: transactiondb                                   |
 |  Kafka Producer: envia TransferCompletedEvent                   |
 +================================================================+
```

### 3.4 Notification Service (Puerto 8084)

```
 NOTIFICATION SERVICE
 +================================================================+
 |                                                                 |
 |  Kafka Consumer: escucha TransferCompletedEvent                 |
 |                                                                 |
 |  Evento: TransferCompletedEvent                                 |
 |  +-----------------------------------------------------------+  |
 |  | fromUser    | Long       | ID del emisor                  |  |
 |  | toUser      | Long       | ID del receptor                |  |
 |  | amount      | BigDecimal | Monto transferido              |  |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  Sin base de datos propia                                       |
 +================================================================+
```

### 3.5 API Gateway (Puerto 8080)

```
 API GATEWAY
 +================================================================+
 |                                                                 |
 |  Funcion: Punto de entrada unico para todos los servicios       |
 |                                                                 |
 |  JWT Filter:                                                    |
 |  +-----------------------------------------------------------+  |
 |  | Rutas publicas (sin token):                                | |
 |  |   - /auth/register                                         | |
 |  |   - /auth/login                                            | |
 |  |   - /auth/verify-email                                     | |
 |  |   - /auth/verify-totp                                      | |
 |  |                                                            | |
 |  | Rutas protegidas (requieren JWT):                          | |
 |  |   - Todas las demas                                        | |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  Ruteo:                                                         |
 |  +-----------------------------------------------------------+  |
 |  | /auth/**           -->  auth-service:8081                  | |
 |  | /users/**          -->  user-service:8082                  | |
 |  | /transactions/**   -->  transaction-service:8083           | |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 +================================================================+
```

---

## 4. Frontend - Estructura

```
 FRONTEND (React + Vite)
 +================================================================+
 |                                                                 |
 |  src/                                                           |
 |  +-----------------------------------------------------------+  |
 |  |                                                            | |
 |  |  context/                                                  | |
 |  |  +------------------------------------------------------+  | |
 |  |  | AuthContext.jsx  | Login, Registro, JWT, 2FA, Estado  | | |
 |  |  | ThemeContext.jsx | Modo oscuro/claro (localStorage)   | | |
 |  |  +------------------------------------------------------+  | |
 |  |                                                            | |
 |  |  services/                                                 | |
 |  |  +------------------------------------------------------+  | |
 |  |  | api.js | Axios + interceptors + todos los endpoints   | | |
 |  |  |        | authService, userService, transactionService | | |
 |  |  |        | CURRENCIES, EXCHANGE_RATES, convertCurrency  | | |
 |  |  +------------------------------------------------------+  | |
 |  |                                                            | |
 |  |  components/layout/                                        | |
 |  |  +------------------------------------------------------+  | |
 |  |  | AppLayout.jsx | Layout protegido con sidebar          | | |
 |  |  | Sidebar.jsx   | Navegacion, tema, logout              | | |
 |  |  +------------------------------------------------------+  | |
 |  |                                                            | |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 +================================================================+
```

```
 PAGINAS (13 paginas)
 +================================================================+
 |                                                                 |
 |  PUBLICAS (sin autenticacion):                                  |
 |  +-----------------------------------------------------------+  |
 |  | Login.jsx        | Inicio de sesion + flujo 2FA            | |
 |  | Register.jsx     | Registro de usuario nuevo               | |
 |  | VerifyEmail.jsx  | Verificacion de email por token         | |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  PROTEGIDAS (requieren JWT):                                    |
 |  +-----------------------------------------------------------+  |
 |  | Dashboard.jsx    | Balance, estadisticas, grafico, ultimas | |
 |  | Wallet.jsx       | Depositar / Retirar dinero              | |
 |  | Transfer.jsx     | Transferir a otro usuario               | |
 |  | History.jsx      | Historial + filtros + export PDF/Excel  | |
 |  | Profile.jsx      | Perfil, 2FA, verificacion, contrasena   | |
 |  | Notifications.jsx| Notificaciones en tiempo real (polling) | |
 |  | Favorites.jsx    | Contactos favoritos (localStorage)      | |
 |  | QRPage.jsx       | Generar y escanear QR de pago           | |
 |  | RequestMoney.jsx | Solicitar dinero (crear/aceptar/rechazar)||
 |  | Admin.jsx        | Panel admin (solo rol ADMIN)            | |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 +================================================================+
```

---

## 5. Flujos Principales

### 5.1 Flujo de Autenticacion

```
 +----------+     +----------+     +----------+     +----------+
 | Usuario  | --> | Frontend | --> | Gateway  | --> | Auth     |
 | (email + |     | Login.jsx|     | (valida  |     | Service  |
 |  pass)   |     |          |     |  ruta    |     |          |
 +----------+     +-----+----+     |  publica)|     +-----+----+
                        |          +----------+           |
                        |                                 v
                        |                        +--------+--------+
                        |                        | 2FA habilitado? |
                        |                        +--------+--------+
                        |                       NO |           | SI
                        |                          v           v
                        |                   +------+---+ +----+------+
                        |                   | Devuelve | | Devuelve  |
                        |                   | JWT      | | totpReq=  |
                        |                   | Token    | | true      |
                        |                   +------+---+ +----+------+
                        |                          |           |
                        v                          v           v
                  +-----------+            +-------+--+ +------+------+
                  | Guarda en |            | Acceso   | | Pide codigo |
                  | localStorage           | completo | | 6 digitos   |
                  | (token +  |            +----------+ +------+------+
                  |  user)    |                                |
                  +-----------+                                v
                                                      +-------+------+
                                                      | Verifica TOTP|
                                                      | Devuelve JWT |
                                                      +--------------+
```

### 5.2 Flujo de Transferencia

```
 +----------+     +-----------+     +-----------+     +------------+
 | Usuario  | --> | Transfer  | --> | Gateway   | --> | Transaction|
 | (destino,|     | .jsx      |     | (valida   |     | Service    |
 |  monto)  |     |           |     |  JWT)     |     |            |
 +----------+     +-----------+     +-----------+     +-----+------+
                                                            |
                                          +-----------------+------------------+
                                          |                                    |
                                          v                                    v
                                  +-------+--------+                 +---------+---------+
                                  | 1. Consulta    |                 | 4. Guarda         |
                                  |    UserService |                 |    Transaction    |
                                  |    (saldo +    |                 |    (COMPLETED)    |
                                  |     limite)    |                 +-------------------+
                                  +-------+--------+                           |
                                          |                                    v
                                          v                          +--------+---------+
                                  +-------+--------+                 | 5. Kafka Event   |
                                  | 2. Valida:     |                 |    (best-effort) |
                                  |  - Saldo >= $  |                 +--------+---------+
                                  | - Limite diario|                          |
                                  +-------+--------+                          v
                                          |                          +--------+---------+
                                          v                          | Notification     |
                                  +-------+--------+                 | Service          |
                                  | 3. Actualiza   |                 | (consume evento) |
                                  |    balances:   |                 +------------------+
                                  |  sender: -$    |
                                  |  receiver: +$  |
                                  +----------------+
```

### 5.3 Flujo de Solicitud de Dinero

```
 CREAR SOLICITUD:
 +----------+        +-------------+        +--------------+
 | Requester| -----> | POST        | -----> | MoneyRequest |
 | (pide $) |        | /request    |        | status:      |
 +----------+        +-------------+        | PENDING      |
                                            +--------------+

 ACEPTAR SOLICITUD:
 +----------+        +-------------+        +--------------+
 | Target   | -----> | PUT         | -----> | Ejecuta      |
 | (paga)   |        | /accept     |        | transfer()   |
 +----------+        +-------------+        | target -->   |
                                            | requester    |
                                            | status:      |
                                            | ACCEPTED     |
                                            +--------------+

 RECHAZAR SOLICITUD:
 +----------+        +-------------+        +--------------+
 | Target   | -----> | PUT         | -----> | MoneyRequest |
 | (rechaza)|        | /reject     |        | status:      |
 +----------+        +-------------+        | REJECTED     |
                                            +--------------+
```

### 5.4 Flujo de Verificacion de Email

```
 +----------+     +-----------+     +-----------+     +----------+
 | Perfil   | --> | POST      | --> | Auth      | --> | Gmail    |
 | (boton   |     | /resend-  |     | Service   |     | SMTP     |
 | Verificar|     | verification    | (genera   |     | (envia)  |
 +----------+     +-----------+     |  token)   |     +----+-----+
                                    +-----------+          |
                                                           v
                                                    +------+------+
                                                    | Email llega |
                                                    | al usuario  |
                                                    +------+------+
                                                           |
                                                           v
                                                    +------+------+
                                                    | Click link  |
                                                    | /verify?    |
                                                    | token=xxx   |
                                                    +------+------+
                                                           |
                                                           v
                                                    +------+------+
                                                    | Auth Service|
                                                    | verified =  |
                                                    | true        |
                                                    +------+------+
                                                           |
                                                           v
                                                    +------+------+
                                                    | Perfil      |
                                                    | actualiza a |
                                                    | VERDE       |
                                                    +-------------+
```

---

## 6. Docker Compose - Contenedores

```
 DOCKER COMPOSE - 10 CONTENEDORES
 +================================================================+
 |                                                                 |
 |  INFRAESTRUCTURA:                                               |
 |  +------------------+  +------------------+  +----------------+ |
 |  | fintech-mysql    |  | fintech-zookeeper|  | fintech-kafka  | |
 |  | mysql:8.0        |  | cp-zookeeper:7.6 |  | cp-kafka:7.6   | |
 |  | 3307:3306        |  | 2181:2181        |  | 9092:9092      | |
 |  | Vol: mysql-data  |  |                  |  | 29092 (intern) | |
 |  +------------------+  +------------------+  +----------------+ |
 |                                                                 |
 |  +---------------------------------------------------------+    |
 |  | fintech-mailpit  |  axllent/mailpit   | 8025 + 1025     |    |
 |  +---------------------------------------------------------+    |
 |                                                                 |
 |  MICROSERVICIOS:                                                |
 |  +------------------+  +------------------+  +----------------+ |
 |  | fintech-auth     |  | fintech-user     |  | fintech-       | |
 |  | :8081            |  | :8082            |  | transaction    | |
 |  | -> authdb        |  | -> userdb        |  | :8083          | |
 |  | -> Gmail SMTP    |  |                  |  | -> transacdb   | |
 |  +------------------+  +------------------+  | -> kafka       | |
 |                                               +----------------+ |
 |  +------------------+  +------------------+                     |
 |  | fintech-         |  | fintech-gateway  |                     |
 |  | notification     |  | :8080            |                     |
 |  | :8084            |  | -> auth,user,tx  |                     |
 |  | -> kafka         |  |                  |                     |
 |  +------------------+  +------------------+                     |
 |                                                                 |
 |  FRONTEND:                                                      |
 |  +---------------------------------------------------------+    |
 |  | fintech-frontend | React+Nginx | 3000:80 | -> gateway   |    |
 |  +---------------------------------------------------------+    |
 |                                                                 |
 +================================================================+
```

---

## 7. Bases de Datos

```
 MySQL 8.0 (Puerto 3307)
 +================================================================+
 |                                                                 |
 |  authdb                                                         |
 |  +-----------------------------------------------------------+  |
 |  | users                                                      | |
 |  | - id (BIGINT, PK, AUTO_INCREMENT)                          | |
 |  | - email (VARCHAR, UNIQUE)                                  | |
 |  | - password (VARCHAR, BCrypt)                               | |
 |  | - role (VARCHAR: "USER"/"ADMIN")                           | |
 |  | - verified (BOOLEAN)                                       | |
 |  | - verification_token (VARCHAR)                             | |
 |  | - totp_secret (VARCHAR)                                    | |
 |  | - totp_enabled (BOOLEAN)                                   | |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  userdb                                                         |
 |  +-----------------------------------------------------------+  |
 |  | user_profiles                                              | |
 |  | - id (BIGINT, PK, AUTO_INCREMENT)                          | |
 |  | - name (VARCHAR)                                           | |
 |  | - email (VARCHAR, UNIQUE)                                  | |
 |  | - balance (DECIMAL)                                        | |
 |  | - daily_limit (DECIMAL, default 50000)                     | |
 |  | - currency (VARCHAR(3), default "ARS")                     | |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  transactiondb                                                  |
 |  +-----------------------------------------------------------+  |
 |  | transactions                                               | |
 |  | - id (BIGINT, PK, AUTO_INCREMENT)                          | |
 |  | - from_user_id (BIGINT)                                    | |
 |  | - to_user_id (BIGINT)                                      | |
 |  | - amount (DECIMAL)                                         | |
 |  | - status (VARCHAR: "COMPLETED")                            | |
 |  | - created_at (DATETIME)                                    | |
 |  +-----------------------------------------------------------+  |
 |  | money_requests                                             | |
 |  | - id (BIGINT, PK, AUTO_INCREMENT)                          | |
 |  | - requester_id (BIGINT)                                    | |
 |  | - target_id (BIGINT)                                       | |
 |  | - amount (DECIMAL)                                         | |
 |  | - message (VARCHAR(255))                                   | |
 |  | - status (VARCHAR: "PENDING"/"ACCEPTED"/"REJECTED")        | |
 |  | - created_at (DATETIME)                                    | |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 +================================================================+
```

---

## 8. Funcionalidades Implementadas

```
 +================================================================+
 |  #  | FUNCIONALIDAD                    | ESTADO    | NIVEL      |
 +================================================================+
 |  1  | Depositar / Retirar dinero       | COMPLETO  | Facil      |
 |  2  | Buscar usuarios por nombre/email | COMPLETO  | Facil      |
 |  3  | Modo Oscuro / Claro              | COMPLETO  | Facil      |
 |  4  | Diseno responsive                | COMPLETO  | Facil      |
 +-----+----------------------------------+-----------+------------+
 |  5  | Filtros por fecha en historial   | COMPLETO  | Intermedio |
 |  6  | Exportar historial PDF y Excel   | COMPLETO  | Intermedio |
 |  7  | Graficos en Dashboard            | COMPLETO  | Intermedio |
 |  8  | Notificaciones en tiempo real    | COMPLETO  | Intermedio |
 |  9  | Cambio de contrasena             | COMPLETO  | Intermedio |
 | 10  | Contactos favoritos              | COMPLETO  | Intermedio |
 +-----+----------------------------------+-----------+------------+
 | 11  | Transferencias por QR            | COMPLETO  | Avanzado   |
 | 12  | Solicitar dinero                 | COMPLETO  | Avanzado   |
 | 13  | Limite diario de transferencias  | COMPLETO  | Avanzado   |
 | 14  | Panel de administracion          | COMPLETO  | Avanzado   |
 | 15  | Verificacion de email            | COMPLETO  | Avanzado   |
 | 16  | Autenticacion 2FA (TOTP)         | COMPLETO  | Avanzado   |
 | 17  | Multiples monedas (ARS/USD/EUR)  | COMPLETO  | Avanzado   |
 +================================================================+
                                           17/17 funcionalidades
```

---

## 9. Puertos del Sistema

```
 +==================+====================+=========================+
 |     PUERTO       |     SERVICIO       |     DESCRIPCION         |
 +==================+====================+=========================+
 |     3000         |  Frontend          |  Aplicacion web React   |
 |     8080         |  API Gateway       |  Punto de entrada API   |
 |     8081         |  Auth Service      |  Autenticacion          |
 |     8082         |  User Service      |  Perfiles de usuario    |
 |     8083         |  Transaction Svc   |  Transferencias         |
 |     8084         |  Notification Svc  |  Notificaciones         |
 |     3307         |  MySQL             |  Base de datos          |
 |     9092         |  Kafka             |  Mensajeria             |
 |     2181         |  Zookeeper         |  Coordinacion Kafka     |
 |     8025         |  Mailpit (Web UI)  |  Testing de emails      |
 |     1025         |  Mailpit (SMTP)    |  SMTP de testing        |
 +==================+====================+=========================+
```

---

## 10. Comunicacion entre Servicios

```
 +================================================================+
 |                                                                 |
 |  SINCRONA (HTTP REST):                                          |
 |  +-----------------------------------------------------------+  |
 |  | Frontend ---[/api/]--> Gateway ----> Auth Service          | |
 |  | Frontend ---[/api/]--> Gateway ----> User Service          | |
 |  | Frontend ---[/api/]--> Gateway ----> Transaction Service   | |
 |  | Transaction Service --[HTTP]--> User Service (saldo/datos) | |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  ASINCRONA (Kafka):                                             |
 |  +-----------------------------------------------------------+  |
 |  | Transaction Service --[produce]--> Topic: transfer-events  | |
 |  | Notification Service <-[consume]-- Topic: transfer-events  | |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 |  EMAIL (SMTP):                                                  |
 |  +-----------------------------------------------------------+  |
 |  | Auth Service --[SMTP]--> Gmail (smtp.gmail.com:587)        | |
 |  |                          Remitente: fintech.noreply10@gmail| |
 |  +-----------------------------------------------------------+  |
 |                                                                 |
 +================================================================+
```
