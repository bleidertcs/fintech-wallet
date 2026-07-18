# Walkthrough — Migración exitosa de comunicación inter-servicios a gRPC e Inyección de Seguridad

Este documento resume los cambios realizados para migrar la comunicación REST interna entre microservicios a llamadas gRPC de alto rendimiento, y presenta las pruebas y validación del flujo completo junto con las políticas de seguridad implementadas.

---

## Cambios Realizados

1. **Definición de Contratos**:
   - Creado [user.proto](file:///c:/dev/DevOps/fintech-wallet/backend/user-service/src/main/proto/user.proto) en `user-service`, `transaction-service` y `notification-service` que declara el servicio gRPC `UserService` con los métodos `GetUser` y `UpdateBalance`.

2. **Dependencias Maven**:
   - Configurado `grpc-server-spring-boot-starter` (versión `3.1.0.RELEASE`), `javax.annotation-api` y el plugin compilador de protobuf (`protobuf-maven-plugin`) en [pom.xml (user-service)](file:///c:/dev/DevOps/fintech-wallet/backend/user-service/pom.xml).
   - Configurado `grpc-client-spring-boot-starter` (versión `3.1.0.RELEASE`), `javax.annotation-api` y el plugin compilador de protobuf en [pom.xml (transaction-service)](file:///c:/dev/DevOps/fintech-wallet/backend/transaction-service/pom.xml) y [pom.xml (notification-service)](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/pom.xml).
   - Añadido `build-helper-maven-plugin` para asegurar que las carpetas de código generado de Protobuf (`target/generated-sources`) sean correctamente indexadas e incluidas por el compilador de Java.

3. **Servidor gRPC**:
   - Implementado [UserServiceGrpcImpl.java](file:///c:/dev/DevOps/fintech-wallet/backend/user-service/src/main/java/user_service/user_service/grpc/UserServiceGrpcImpl.java) para responder las peticiones gRPC en el puerto `9090` en `user-service`.

4. **Clientes gRPC**:
   - Sustituido el cliente Feign REST en `transaction-service` ([TransactionService.java](file:///c:/dev/DevOps/fintech-wallet/backend/transaction-service/src/main/java/transaction_service/transaction_service/service/TransactionService.java)) por llamadas gRPC blocking stub mediante inyección `@GrpcClient("user-service")`.
   - Sustituido `RestTemplate` en `notification-service` ([NotificationService.java](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/src/main/java/notification_service/notification_service/service/NotificationService.java)) por llamadas gRPC blocking stub para recuperar perfiles de emisor y receptor.

5. **Infraestructura Docker y Seguridad de Redacción**:
   - Expuesto el puerto `9090` de `user-service` en el archivo [docker-compose.yml](file:///c:/dev/DevOps/fintech-wallet/docker-compose.yml).
   - Configurado la variable de entorno `GRPC_USER_SERVICE_ADDRESS=static://user-service:9090` en los clientes.
   - Corregida la variable `SPRING_MAIL_USERNAME` en el entorno de `notification-service` para evitar errores de parseo SMTP (`Could not parse mail`) al despachar notificaciones.
   - **Enmascaramiento de Datos en SigNoz**: Configurado el procesador `attributes/redact` en [otel-collector-config.yaml](file:///c:/dev/DevOps/fintech-wallet/otel-collector-config.yaml) para descartar/eliminar automáticamente cabeceras HTTP y metadatos de gRPC sensibles (tales como `Authorization`, `Cookie` y `Set-Cookie`) antes de ser almacenados en la base de datos de SigNoz (ClickHouse), tanto para trazas como para logs.

---

## Validación y Resultados

### 1. Compilación y Reconstrucción
Todos los servicios se compilaron y empaquetaron exitosamente dentro de los contenedores Docker (`eclipse-temurin:25-jdk`):
- `fintech-user` compiles and starts on HTTP port `8082` and gRPC port `9090`.
- `fintech-transaction` compiles and starts on HTTP port `8083`.
- `fintech-notification` compiles and starts on HTTP port `8084`.

### 2. Pruebas de Transacciones (Jane a John)
Realizamos la verificación del usuario `john-wallet@yopmail.com` y ejecutamos transferencias exitosas a través del API Gateway (`localhost:8080`) utilizando la sesión autenticada de Jane:

- **Transferencia 1 ($2500.00)**:
  - Estado: **COMPLETADA**
  - balances actualizados en BD:
    - Jane Doe: `$7510.00`
    - John Smith: `$12510.00`

- **Transferencia 2 ($100.00)**:
  - Estado: **COMPLETADA**
  - balances actualizados en BD:
    - Jane Doe: `$7410.00`
    - John Smith: `$12610.00`

### 3. Notificación de Correo (Mailpit)
El servicio `notification-service` consumió el evento de transferencia desde Kafka, resolvió las identidades de Jane y John mediante llamadas **gRPC** a `user-service`, y envió exitosamente el correo de aviso.

Verificación del buzón en Mailpit (`http://localhost:8025/api/v1/messages`):
- **De**: `noreply@fintechwallet.com`
- **Para**: `john-wallet@yopmail.com`
- **Asunto**: `"Recibiste una transferencia"`
- **Cuerpo**: `"Hola John Smith, Recibiste una transferencia de $100 de parte de Jane Doe (jane-wallet@yopmail.com). ¡Gracias por usar FinTech Wallet!"`

### 4. Monitoreo y Trazabilidad (SigNoz)
SigNoz recolecta las métricas y trazas completas de la transacción de forma distribuida:
- Visualización de llamadas internas bajo el protocolo `gRPC` (`user.UserService`).
- Monitoreo del consumo Kafka en `notification-service`.
- Visualización unificada del trace-id (`e564110d11b853879e3099596ee5f0d4`) que conecta el API Gateway -> Transaction Service -> Kafka -> Notification Service -> SMTP.
- **Validación del Filtro de Seguridad**: Con el procesador de atributos activo en el OTel Collector, se comprobó que los metadatos gRPC y headers de autorización no son almacenados en ClickHouse, garantizando la privacidad de las credenciales de los usuarios en la consola de SigNoz.
