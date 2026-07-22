package worker_service.worker_service.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.DltHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.DltStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;


import worker_service.worker_service.service.AuditService;

import java.math.BigDecimal;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class WorkerKafkaConsumer {

    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @RetryableTopic(
            attempts = "3",
            dltStrategy = DltStrategy.FAIL_ON_ERROR
    )
    @KafkaListener(topics = "transfer-events", groupId = "worker-group")

    public void consumeTransferEvent(String message) {
        log.info("[Worker Consumer] Received transfer event: {}", message);
        try {
            Map<?, ?> event = objectMapper.readValue(message, Map.class);
            Long fromUser = event.get("fromUser") != null ? Long.valueOf(event.get("fromUser").toString()) : null;
            Long toUser = event.get("toUser") != null ? Long.valueOf(event.get("toUser").toString()) : null;
            BigDecimal amount = event.get("amount") != null ? new BigDecimal(event.get("amount").toString()) : BigDecimal.ZERO;

            auditService.recordTransactionAudit(fromUser, toUser, amount, "TRANSFER_COMPLETED", "Procesado asíncronamente por Worker Service");
        } catch (Exception e) {
            log.error("[Worker Consumer Error] Error processing event: {}", e.getMessage());
            throw new RuntimeException("Forzando reintento de Kafka", e);
        }
    }

    @DltHandler
    public void handleDeadLetterQueue(String message) {
        log.error("[DLQ WORKER] Mensaje fallido enviado a Dead Letter Queue: {}", message);
        auditService.recordTransactionAudit(null, null, BigDecimal.ZERO, "DLQ_TRANSFER_FAILED", "Mensaje no procesable enviado a DLQ: " + message);
    }
}
