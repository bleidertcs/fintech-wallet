package notification_service.notification_service.kafka.consumer;

import notification_service.notification_service.dto.TransferCompletedEvent;
import notification_service.notification_service.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import io.opentelemetry.instrumentation.annotations.WithSpan;

@Component
@RequiredArgsConstructor
@Slf4j
public class TransferEventConsumer {

    private final NotificationService notificationService;

    @KafkaListener(topics = "transfer_completed", groupId = "notification-group")
    @WithSpan("kafka.consume.transfer_completed")
    public void onTransferCompleted(TransferCompletedEvent event) {
        log.info("Received transfer_completed event");
        notificationService.processTransferNotification(event);
    }
}
