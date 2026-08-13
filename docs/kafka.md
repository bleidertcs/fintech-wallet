# Arquitectura de Mensajería Apache Kafka 📩

Este documento describe la arquitectura de mensajería asíncrona basada en **Apache Kafka (modo KRaft)**, el patrón **Transactional Outbox**, la estructura de eventos (Event Envelope) y el manejo de reintentos y Dead Letter Queue (DLQ).

---

## 1. Arquitectura de Apache Kafka KRaft

En el proyecto **FinTech Wallet**, utilizamos **Apache Kafka 3.7.0** operando en modo **KRaft (Kafka Raft Metadata Mode)**. Esto elimina la dependencia histórica de Apache ZooKeeper, simplificando la topología de despliegue en Kubernetes y reduciendo el consumo de memoria.

### Tópicos Principales

| Tópico | Productor | Consumidores | Propósito |
| :--- | :--- | :--- | :--- |
| `transfer_completed` | `transaction-service` (Outbox) | `notification-service`, `worker-service` | Evento emitido al completar exitosamente una transferencia de fondos. |
| `transfer_failed` | `transaction-service` | `notification-service` | Notifica al usuario emisor sobre el fallo o reversión de una transferencia. |
| `transfer-events-dlq` | `worker-service`, `notification-service` | Proceso de Auditoría / Soporte | Dead Letter Queue para almacenar eventos corruptos o no procesables. |

---

## 2. El Patrón Transactional Outbox

### El Problema de la Inconsistencia en Mensajería
Si un microservicio guarda un registro en la base de datos MySQL e inmediatamente intenta enviar un mensaje a Kafka mediante red, existe el riesgo de que la BD guarde el cambio pero la llamada a Kafka falle por timeout, o viceversa.

### La Solución: Transactional Outbox
El microservicio guarda la entidad `Transaction` y el evento en la tabla `outbox_events` dentro de la **misma transacción local de MySQL**:

```sql
START TRANSACTION;

INSERT INTO transactions (id, from_user_id, to_user_id, amount, status) 
VALUES ('tx-101', 1, 2, 150.00, 'COMPLETED');

INSERT INTO outbox_events (id, event_type, payload, status) 
VALUES ('evt-501', 'TRANSFER_COMPLETED', '{"transactionId":"tx-101", ...}', 'PENDING');

COMMIT;
```

Posteriormente, un servicio asíncrono en segundo plano (`OutboxPublisherService`) lee periódicamente las filas en estado `PENDING`, las publica en Apache Kafka y las marca como `PROCESSED`. Esto garantiza la propiedad **At-Least-Once Delivery** (Entrega al menos una vez).

---

## 3. Estructura Estándar del Event Envelope

Todos los eventos publicados en el cluster Kafka siguen una estructura estandarizada y compatible hacia atrás:

```json
{
  "eventId": "evt_98a7b6c5-4321-4def-8901-23456789abcd",
  "eventType": "TRANSFER_COMPLETED",
  "version": 1,
  "occurredAt": "2026-08-13T14:30:00.000Z",
  "producer": "transaction-service",
  "correlationId": "trace_4f8b9e10a2c3d4e5",
  "causationId": "req_1122334455",
  "data": {
    "transactionId": "tx-882910-AAA",
    "sourceUserId": 1,
    "targetUserId": 2,
    "amount": 150.00,
    "currency": "ARS",
    "status": "COMPLETED"
  }
}
```

### Campos del Envelope:
- **`eventId`**: UUID único del evento.
- **`eventType`**: Nombre descriptivo del evento de dominio.
- **`version`**: Versión del esquema del evento para evolución retrocompatible.
- **`occurredAt`**: Marca temporal ISO-8601 del momento exacto de emisión.
- **`producer`**: Nombre del microservicio origen.
- **`correlationId`**: Identificador de traza (`trace_id`) de OpenTelemetry para observabilidad de extremo a extremo.
- **`data`**: Payload tipado con los detalles del negocio.

---

## 4. Estrategia de Reintentos y Dead Letter Queue (DLQ)

Cuando un consumidor (`notification-service` o `worker-service`) falla al procesar un mensaje debido a un problema temporal (ej. base de datos temporalmente inalcanzable), se aplica una estrategia de **Exponential Backoff con Jitter**:

```text
Intento 1 (Inmediato) -> Fallo
  │
  ├── Esperar 1 segundo -> Intento 2 -> Fallo
  ├── Esperar 5 segundos -> Intento 3 -> Fallo
  ├── Esperar 30 segundos -> Intento 4 -> Fallo
  │
  └── Excedido límite (Max 3 reintentos) -> Enviar mensaje a 'transfer-events-dlq'
```

### Idempotencia en el Consumidor
Para evitar procesar dos veces el mismo mensaje si ocurre un reintento, cada consumidor verifica el `eventId` en su base de datos local o en Redis antes de ejecutar la lógica de negocio.
