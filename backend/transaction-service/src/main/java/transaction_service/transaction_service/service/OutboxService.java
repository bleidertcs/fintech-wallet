package transaction_service.transaction_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import transaction_service.transaction_service.entity.OutboxEvent;
import transaction_service.transaction_service.repository.OutboxRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxService {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public OutboxEvent publishEvent(String aggregateType, String aggregateId, String eventType, Object payloadObject) {
        try {
            String payloadJson = objectMapper.writeValueAsString(payloadObject);
            OutboxEvent event = OutboxEvent.builder()
                    .id(UUID.randomUUID().toString())
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .payload(payloadJson)
                    .createdAt(LocalDateTime.now())
                    .processed(false)
                    .build();

            event = outboxRepository.save(event);
            log.info("Outbox event saved successfully: ID={}, Type={}", event.getId(), eventType);
            return event;
        } catch (Exception e) {
            log.error("Failed to serialize outbox event payload: {}", e.getMessage(), e);
            throw new RuntimeException("Error saving outbox event", e);
        }
    }
}
