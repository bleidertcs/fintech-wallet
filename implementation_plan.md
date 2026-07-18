# FinTech Wallet — Plan de Implementación Completa (Actualizado)

Plan para resolver los bugs funcionales de las transacciones, completar los servicios de notificaciones, y configurar la observabilidad completa en SigNoz.

## Estado Actual y Hallazgos

| Componente | Estado | Notas |
|---|---|---|
| auth-service | ✅ Completo | Gestiona login, registro, JWT y 2FA |
| user-service | ✅ Completo | CRUD + balance + settings |
| transaction-service | ✅ Completo | Transfer + Money Requests + Kafka producer |
| notification-service | ✅ Completo | Base de datos creada, envío de emails a Mailpit y endpoints REST activos |
| api-gateway | ✅ Completo | Ruta `/notifications/**` mapeada y funcionando |
| frontend | ✅ Completo | Race condition en registro solucionada. Notificaciones reales y timeouts globales agregados |
| OTel Collector | ✅ Completo | Scraper de métricas Kafka (`kafkametrics`) configurado |
| SigNoz | ✅ Completo | Dashboard de RED, Docker y Kafka cargados. Alertas configuradas y operativas |

---

## User Review Required

> [!IMPORTANT]
> **Fase 4 (SigNoz)** requiere interacción manual: crear el admin local via browser en `http://localhost:3301/signup` y luego crear un API Key con rol **Admin** en Settings → Service Accounts para actualizar el `.env`.
> 
> **Fase 1.5 (Bug Fixes)** soluciona el error donde las transacciones no hacen nada al registrar un usuario nuevo debido a que no se creaba su perfil.

---

## Proposed Changes

### Fase 1: Notification Service Completo

Convertir el `notification-service` en un servicio con persistencia, envío de emails y API REST.

---

#### [MODIFY] [pom.xml](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/pom.xml)
Agregar dependencias para JPA (MySQL) y Spring Mail (SMTP):
```diff
+    <dependency>
+        <groupId>org.springframework.boot</groupId>
+        <artifactId>spring-boot-starter-data-jpa</artifactId>
+    </dependency>
+    <dependency>
+        <groupId>org.springframework.boot</groupId>
+        <artifactId>spring-boot-starter-mail</artifactId>
+    </dependency>
+    <dependency>
+        <groupId>com.mysql</groupId>
+        <artifactId>mysql-connector-j</artifactId>
+        <scope>runtime</scope>
+    </dependency>
```

#### [NEW] [Notification.java](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/src/main/java/notification_service/notification_service/entity/Notification.java)
Entidad para guardar notificaciones en base de datos.
Campos: `id`, `userId` (destinatario), `type` (sent/received), `message`, `amount`, `fromUserId`, `read`, `createdAt`.

#### [NEW] [NotificationDto.java](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/src/main/java/notification_service/notification_service/dto/NotificationDto.java)
DTO de respuesta.

#### [NEW] [NotificationRepository.java](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/src/main/java/notification_service/notification_service/repository/NotificationRepository.java)
Repositorio JPA. Método: `findByUserIdOrderByCreatedAtDesc(Long userId)`.

#### [MODIFY] [NotificationService.java](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/src/main/java/notification_service/notification_service/service/NotificationService.java)
Modificar para persistir las notificaciones de transferencia (para emisor y receptor) y enviar un correo electrónico al receptor mediante `JavaMailSender` (hacia Mailpit).

#### [NEW] [NotificationController.java](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/src/main/java/notification_service/notification_service/controller/NotificationController.java)
Controller REST para exponer:
- `GET /notifications/{userId}`: Historial del usuario
- `PUT /notifications/{id}/read`: Marcar como leída
- `GET /notifications/{userId}/unread-count`: Cantidad de notificaciones pendientes

#### [MODIFY] [application.properties](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/src/main/resources/application.properties)
Configurar la fuente de datos MySQL a `notificationdb` y el soporte de correo en `localhost:1025` (Mailpit).

#### [MODIFY] [init-databases.sql](file:///c:/dev/DevOps/fintech-wallet/init-databases.sql)
```diff
 CREATE DATABASE IF NOT EXISTS authdb;
 CREATE DATABASE IF NOT EXISTS userdb;
 CREATE DATABASE IF NOT EXISTS transactiondb;
+CREATE DATABASE IF NOT EXISTS notificationdb;
```

#### [MODIFY] [docker-compose.yml](file:///c:/dev/DevOps/fintech-wallet/docker-compose.yml)
Actualizar `notification-service` para depender de `mysql` (healthy) y `mailpit` (started), y configurar sus variables de entorno de conexión.

---

### Fase 1.5: Bug Fixes de Transacciones y Ajustes UX

Evitar la race condition durante el registro de usuarios y prevenir que la interfaz se quede en "Procesando..." de forma indefinida.

---

#### [MODIFY] [AuthContext.jsx](file:///c:/dev/DevOps/fintech-wallet/frontend/src/context/AuthContext.jsx)
Modificar el método `register` para que acepte `name`, `email` y `password`. 
Realizar la llamada a `userService.create(...)` *dentro* del contexto antes de actualizar el estado `user` (lo cual previene que el cambio de estado desmonte el componente y cancele la llamada HTTP).

```javascript
  const register = async (name, email, password) => {
    const res = await authService.register(email, password);
    const data = res.data;
    // Guardamos el token en localStorage para que el interceptor de Axios lo envíe a user-service
    localStorage.setItem('token', data.token);
    
    // Creamos el perfil del usuario antes de marcar la sesión como activa
    await userService.create({ name, email, balance: 10000 });
    
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };
```

#### [MODIFY] [Register.jsx](file:///c:/dev/DevOps/fintech-wallet/frontend/src/pages/Register.jsx)
Actualizar el envío del formulario para invocar la nueva firma de `register(name, email, password)` y quitar la llamada duplicada a `userService.create()`.

#### [MODIFY] [api.js](file:///c:/dev/DevOps/fintech-wallet/frontend/src/services/api.js)
Configurar un `timeout` global de 15 segundos en Axios para evitar que la UI se congele indefinidamente si un contenedor tarda en responder o inicializar.
```javascript
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});
```

---

### Fase 2: API Gateway + Frontend Updates

---

#### [MODIFY] [GatewayConfig.java](file:///c:/dev/DevOps/fintech-wallet/backend/api-gateway/src/main/java/api_gateway/api_gateway/config/GatewayConfig.java)
Agregar el ruteo de notificaciones hacia el puerto `8084` con autenticación JWT:
```java
    @Value("${notification.service.url:http://localhost:8084}")
    private String notificationServiceUrl;

    @Bean
    public RouterFunction<ServerResponse> notificationRoute() {
        return GatewayRouterFunctions.route("notification-service")
                .route(RequestPredicates.path("/notifications/**"), HandlerFunctions.http())
                .before(BeforeFilterFunctions.uri(notificationServiceUrl))
                .build();
    }
```

#### [MODIFY] [application.properties (Gateway)](file:///c:/dev/DevOps/fintech-wallet/backend/api-gateway/src/main/resources/application.properties)
Configurar `notification.service.url=http://localhost:8084`.

#### [MODIFY] [docker-compose.yml](file:///c:/dev/DevOps/fintech-wallet/docker-compose.yml) (Gateway section)
Añadir dependencia del `notification-service` y configurar la URL en el JSON de Spring Application.

#### [MODIFY] [api.js](file:///c:/dev/DevOps/fintech-wallet/frontend/src/services/api.js)
Exportar el nuevo servicio `notificationService`:
```javascript
export const notificationService = {
  getByUser: (userId) => api.get(`/notifications/${userId}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  getUnreadCount: (userId) => api.get(`/notifications/${userId}/unread-count`),
};
```

#### [MODIFY] [Notifications.jsx](file:///c:/dev/DevOps/fintech-wallet/frontend/src/pages/Notifications.jsx)
Modificar para consumir notificaciones reales del `notificationService.getByUser(...)` en lugar de transacciones filtradas.

---

### Fase 3: Kafka Metrics en OTel Collector

Permite monitorear el rendimiento de la mensajería asíncrona y medir el lag del consumidor del `notification-service`.

---

#### [MODIFY] [otel-collector-config.yaml](file:///c:/dev/DevOps/fintech-wallet/otel-collector-config.yaml)
Añadir el receptor `kafkametrics`:
```yaml
receivers:
  kafkametrics:
    brokers:
      - kafka:29092
    protocol_version: "2.0.0"
    scrapers:
      - brokers
      - topics
      - consumers

service:
  pipelines:
    metrics:
      receivers: [otlp, docker_stats, kafkametrics]
      processors: [memory_limiter, batch]
      exporters: [signozclickhousemetrics]
```

---

### Fase 4: SigNoz UI & Dashboards & Alertas

Configurar e inyectar valor al monitoreo de SigNoz.

---

#### Paso 4.1: Crear la cuenta Administrador
Crear cuenta local mediante el navegador en `http://localhost:3301/signup`.
- Email recomendado: `admin@fintech-wallet.local`
- Contraseña recomendada: `Admin@123456`

#### Paso 4.2: Configurar API Key
1. Entrar a Settings → Service Accounts / API Keys en la UI de SigNoz.
2. Crear un API Key con rol **Admin**.
3. Reemplazar la variable `SIGNOZ_API_KEY` en el archivo `.env` del proyecto.
4. Reiniciar el contenedor del mcp-server: `docker compose restart signoz-mcp-server`.

#### Paso 4.3: Dashboards automáticos (MCP)
Usar la herramienta `signoz_create_dashboard` para crear:
- **RED Dashboard**: Monitoreo de tasa de peticiones, errores y latencia (p95/p99) para todos los microservicios.
- **Docker Stats**: Uso de CPU, memoria y tráfico de red por contenedor.
- **Kafka Metrics**: Consumer lag de `notification-group` y throughput por topic.

#### Paso 4.4: Alertas automáticas (MCP)
Usar `signoz_create_alert` para configurar:
- Error Rate > 5% en cualquier servicio.
- Latencia p99 > 2s en transacciones.
- Consumer lag de Kafka > 100 mensajes.
- Servicio caído (Absent Data) en gateway o auth.

---

## Plan de Verificación

### Pruebas Automatizadas
1. Reconstruir los servicios afectados:
   ```bash
   docker compose up -d --build notification-service api-gateway frontend otel-collector
   ```
2. Verificar conectividad interna y logs:
   ```bash
   docker compose logs -f notification-service
   ```

### Pruebas Manuales
1. **Registro**: Registrar un usuario nuevo y verificar en el Dashboard que se crea con el saldo inicial de $10.000 (sin quedarse en pantalla de carga).
2. **Operaciones**: Realizar depósitos/retiros en la Wallet y verificar que se actualizan los saldos de inmediato.
3. **Transferencias**: Transferir de `User A` a `User B` y validar que el balance de ambos se altera en menos de 1 segundo.
4. **Notificaciones**: Comprobar que en Mailpit (`http://localhost:8025`) se recibe el email de aviso y que el panel de Notificaciones del receptor muestra la alerta correcta.
5. **Métricas**: Validar en SigNoz que las métricas de Kafka (lag, brokers) se grafican y que las trazas de transacciones muestran el flujo de principio a fin (Frontend -> Gateway -> Transaction MS -> Kafka -> Notification MS -> SMTP).

---

## Tareas Pendientes / Verificación Final

- [x] Levantar y compilar todos los servicios actualizados (base de datos, gateways, otel-collector, etc.) -> **Completado y verificado.**
- [x] Registrar un usuario nuevo (`jane-wallet@yopmail.com`) y verificar creación de perfil -> **Completado.**
- [x] Realizar la verificación del token de registro (`195f49c6-db27-4fef-80b1-a2cfa06f42f8`) -> **Completado.**
- [x] Cargar el Dashboard del usuario verificado y validar balance -> **Completado ($10.000,00).**
- [x] Registrar un segundo usuario (`john-wallet@yopmail.com`) y verificar cuenta -> **Completado.**
- [x] Realizar transferencia de Jane a John y verificar balance y notificaciones en la UI -> **Completado.**
- [x] Validar en Mailpit (`http://localhost:8025`) la correcta entrega del correo de transferencia -> **Completado.**
- [x] Validar en SigNoz (`http://localhost:3301`) la graficación en los dashboards de RED, Docker y Kafka -> **Completado.**
