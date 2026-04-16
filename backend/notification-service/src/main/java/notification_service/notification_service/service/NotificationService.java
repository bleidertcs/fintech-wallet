package notification_service.notification_service.service;

import notification_service.notification_service.dto.TransferCompletedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class NotificationService {

    public void processTransferNotification(TransferCompletedEvent event) {
        log.info("=== TRANSFER NOTIFICATION ===");
        log.info("From user: {} -> To user: {}", event.getFromUser(), event.getToUser());
        log.info("Amount: ${}", event.getAmount());
        log.info("=============================");
    }
}
