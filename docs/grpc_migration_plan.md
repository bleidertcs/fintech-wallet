# Plan de Implementación: Comunicación Inter-Servicios vía gRPC

Este plan detalla los cambios para migrar la comunicación HTTP/REST interna entre los microservicios (`transaction-service` -> `user-service` y `notification-service` -> `user-service`) al protocolo gRPC utilizando el puerto `9090` y la librería `grpc-spring-boot-starter`.

---

## Proposed Changes

### 1. Definición del Contrato Protobuf (Común)

#### [NEW] [user.proto](file:///c:/dev/DevOps/fintech-wallet/backend/user-service/src/main/proto/user.proto)
Crearemos el mismo archivo de definición de protobuf en los tres microservicios en `src/main/proto/user.proto`:
```protobuf
syntax = "proto3";

package user;

option java_multiple_files = true;
option java_package = "user_service.grpc";

service UserServiceGrpc {
  rpc GetUser (UserRequest) returns (UserResponse);
  rpc UpdateBalance (UpdateBalanceRequest) returns (UpdateBalanceResponse);
}

message UserRequest {
  int64 id = 1;
}

message UserResponse {
  int64 id = 1;
  string name = 2;
  string email = 3;
  double balance = 4;
}

message UpdateBalanceRequest {
  int64 id = 1;
  double amount = 2;
}

message UpdateBalanceResponse {
  bool success = 1;
  string message = 2;
}
```

---

### 2. Configuración de dependencias Maven (pom.xml)

Modificaremos los `pom.xml` de `user-service`, `transaction-service` y `notification-service` para incluir las dependencias de gRPC y el plugin compilador de protobuf:

#### [MODIFY] [pom.xml (user-service)](file:///c:/dev/DevOps/fintech-wallet/backend/user-service/pom.xml)
#### [MODIFY] [pom.xml (transaction-service)](file:///c:/dev/DevOps/fintech-wallet/backend/transaction-service/pom.xml)
#### [MODIFY] [pom.xml (notification-service)](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/pom.xml)

Añadir dependencias:
```xml
<!-- gRPC Starter -->
<dependency>
    <groupId>net.devh</groupId>
    <artifactId>grpc-server-spring-boot-starter</artifactId>
    <version>3.1.0.RELEASE</version>
</dependency>
<!-- En los clientes se añade grpc-client-spring-boot-starter en lugar del server -->
```

Y el plugin de compilación de Protobuf:
```xml
<build>
    <extensions>
        <extension>
            <groupId>kr.motd.maven</groupId>
            <artifactId>os-maven-plugin</artifactId>
            <version>1.7.1</version>
        </extension>
    </extensions>
    <plugins>
        <plugin>
            <groupId>org.xolstice.maven.plugins</groupId>
            <artifactId>protobuf-maven-plugin</artifactId>
            <version>0.6.1</version>
            <configuration>
                <protocArtifact>com.google.protobuf:protoc:3.25.1:exe:${os.detected.classifier}</protocArtifact>
                <pluginId>grpc-java</pluginId>
                <pluginArtifact>io.grpc:protoc-gen-grpc-java:1.62.2:exe:${os.detected.classifier}</pluginArtifact>
            </configuration>
            <executions>
                <execution>
                    <goals>
                        <goal>compile</goal>
                        <goal>compile-custom</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

---

### 3. Servidor gRPC (user-service)

#### [NEW] [UserServiceGrpcImpl.java](file:///c:/dev/DevOps/fintech-wallet/backend/user-service/src/main/java/user_service/user_service/grpc/UserServiceGrpcImpl.java)
Implementar la interfaz generada por Protobuf anotándola con `@GrpcService` para exponer el servidor gRPC sobre el puerto `9090`:
- `getUser`: Busca el usuario en la base de datos y mapea los campos a `UserResponse`.
- `updateBalance`: Modifica el balance del usuario y devuelve `UpdateBalanceResponse`.

#### [MODIFY] [application.properties (user-service)](file:///c:/dev/DevOps/fintech-wallet/backend/user-service/src/main/resources/application.properties)
Configurar puerto gRPC:
```properties
grpc.server.port=9090
```

#### [MODIFY] [docker-compose.yml](file:///c:/dev/DevOps/fintech-wallet/docker-compose.yml)
Exponer el puerto `9090` del contenedor `user-service`.

---

### 4. Clientes gRPC

#### [MODIFY] [application.properties (transaction-service)](file:///c:/dev/DevOps/fintech-wallet/backend/transaction-service/src/main/resources/application.properties)
Configurar el canal cliente para conectar con el servidor gRPC:
```properties
grpc.client.user-service.address=static://user-service:9090
grpc.client.user-service.negotiation-type=plaintext
```

#### [MODIFY] [application.properties (notification-service)](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/src/main/resources/application.properties)
Configurar el canal cliente para conectar con el servidor gRPC:
```properties
grpc.client.user-service.address=static://user-service:9090
grpc.client.user-service.negotiation-type=plaintext
```

#### [MODIFY] [TransactionService.java](file:///c:/dev/DevOps/fintech-wallet/backend/transaction-service/src/main/java/transaction_service/transaction_service/service/TransactionService.java)
Reemplazar la inyección de `UserServiceClient` por un stub gRPC (`UserServiceGrpc.UserServiceBlockingStub`) inyectado con `@GrpcClient("user-service")`, y modificar las llamadas REST por llamadas gRPC.

#### [MODIFY] [NotificationService.java](file:///c:/dev/DevOps/fintech-wallet/backend/notification-service/src/main/java/notification_service/notification_service/service/NotificationService.java)
Reemplazar el uso de `RestTemplate` en `getUserProfile` por un stub gRPC (`UserServiceGrpc.UserServiceBlockingStub`) inyectado con `@GrpcClient("user-service")`.

---

### 5. Seguridad y Redacción de Cabeceras Sensibles en SigNoz

Para cumplir con las mejores prácticas de seguridad y evitar almacenar información sensible (como tokens Bearer y cookies de sesión) en SigNoz, configuraremos el procesador `attributes` en el OpenTelemetry Collector para eliminar estas cabeceras tanto de las trazas como de los logs.

#### [MODIFY] [otel-collector-config.yaml](file:///c:/dev/DevOps/fintech-wallet/otel-collector-config.yaml)

Añadir el procesador `attributes/redact`:
```yaml
processors:
  attributes/redact:
    actions:
      # HTTP Request Headers
      - key: http.request.header.authorization
        action: delete
      - key: http.request.header.cookie
        action: delete
      # HTTP Response Headers
      - key: http.response.header.authorization
        action: delete
      - key: http.response.header.set-cookie
        action: delete
      # gRPC Request Metadata
      - key: grpc.request.metadata.authorization
        action: delete
      - key: grpc.request.metadata.cookie
        action: delete
      # gRPC Response Metadata
      - key: grpc.response.metadata.authorization
        action: delete
      - key: grpc.response.metadata.set-cookie
        action: delete
```

Y registrarlo en los pipelines correspondientes en `service.pipelines`:
```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, attributes/redact, signozspanmetrics, batch]
      exporters: [clickhousetraces]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, attributes/redact, batch]
      exporters: [clickhouselogsexporter]
```

---

## Plan de Verificación

### Pruebas Automatizadas
1. Compilar y generar las clases gRPC/Protobuf:
   ```bash
   mvn clean compile
   ```
2. Reconstruir los servicios en Docker:
   ```bash
   docker compose up -d --build user-service transaction-service notification-service
   ```

### Pruebas Manuales
1. Registrar un nuevo usuario en la UI y realizar transferencias.
2. Comprobar en los logs de `transaction-service` y `notification-service` que la información del perfil del usuario se obtiene correctamente y que los balances se descuentan y abonan de forma exitosa usando gRPC.
3. Verificar en SigNoz que las trazas de comunicación de servicios ahora muestran llamadas bajo el protocolo `grpc` en lugar de HTTP.
