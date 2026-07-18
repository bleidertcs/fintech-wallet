package notification_service.notification_service.service;

import notification_service.notification_service.dto.NotificationDto;
import notification_service.notification_service.dto.TransferCompletedEvent;
import notification_service.notification_service.entity.Notification;
import notification_service.notification_service.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import net.devh.boot.grpc.client.inject.GrpcClient;
import user_service.grpc.*;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository repository;
    private final JavaMailSender mailSender;

    @GrpcClient("user-service")
    private UserServiceGrpc.UserServiceBlockingStub userServiceStub;

    @Value("${spring.mail.username:noreply@fintechwallet.com}")
    private String mailFrom;

    @Transactional
    @WithSpan("notification.processTransferNotification")
    public void processTransferNotification(TransferCompletedEvent event) {
        log.info("Processing transfer event: {}", event);

        // Fetch user profiles to get names and emails via gRPC
        UserResponse senderProfile = null;
        try {
            senderProfile = userServiceStub.getUser(UserRequest.newBuilder().setId(event.getFromUser()).build());
        } catch (Exception e) {
            log.error("Failed to fetch sender profile via gRPC: {}", e.getMessage());
        }

        UserResponse receiverProfile = null;
        try {
            receiverProfile = userServiceStub.getUser(UserRequest.newBuilder().setId(event.getToUser()).build());
        } catch (Exception e) {
            log.error("Failed to fetch receiver profile via gRPC: {}", e.getMessage());
        }

        String senderName = (senderProfile != null && !senderProfile.getName().isEmpty()) ? senderProfile.getName() : "Usuario #" + event.getFromUser();
        String receiverName = (receiverProfile != null && !receiverProfile.getName().isEmpty()) ? receiverProfile.getName() : "Usuario #" + event.getToUser();
        String receiverEmail = (receiverProfile != null && !receiverProfile.getEmail().isEmpty()) ? receiverProfile.getEmail() : null;
        String senderEmail = (senderProfile != null && !senderProfile.getEmail().isEmpty()) ? senderProfile.getEmail() : null;

        // 1. Persist notification for the sender
        String senderMsg = String.format("Transferencia enviada: Enviaste $%s a %s", 
                event.getAmount().toString(), receiverName);
        Notification senderNotif = Notification.builder()
                .userId(event.getFromUser())
                .type("TRANSFER_SENT")
                .message(senderMsg)
                .amount(event.getAmount())
                .fromUserId(event.getFromUser())
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();
        repository.save(senderNotif);

        // 2. Persist notification for the receiver
        String receiverMsg = String.format("Transferencia recibida: Recibiste $%s de %s", 
                event.getAmount().toString(), senderName);
        Notification receiverNotif = Notification.builder()
                .userId(event.getToUser())
                .type("TRANSFER_RECEIVED")
                .message(receiverMsg)
                .amount(event.getAmount())
                .fromUserId(event.getFromUser())
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();
        repository.save(receiverNotif);

        // 3. Send email to the receiver (best-effort)
        if (receiverEmail != null) {
            sendEmailNotification(receiverEmail, "Recibiste una transferencia", 
                    String.format("Hola %s,\n\nRecibiste una transferencia de $%s de parte de %s (%s).\n\n¡Gracias por usar FinTech Wallet!", 
                            receiverName, event.getAmount().toString(), senderName, senderEmail != null ? senderEmail : ""));
        }
    }

    @WithSpan("notification.getNotificationsByUser")
    public List<NotificationDto> getNotificationsByUser(Long userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public NotificationDto markAsRead(Long id) {
        Notification notification = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        repository.save(notification);
        return toDto(notification);
    }

    public long getUnreadCount(Long userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(n -> !n.isRead())
                .count();
    }

    private void sendEmailNotification(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setFrom(mailFrom);
            message.setText(body);
            mailSender.send(message);
            log.info("Email notification sent successfully to {}", to);
        } catch (Exception e) {
            log.warn("Failed to send email notification to {}: {}", to, e.getMessage());
        }
    }

    private NotificationDto toDto(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .userId(n.getUserId())
                .type(n.getType())
                .message(n.getMessage())
                .amount(n.getAmount())
                .fromUserId(n.getFromUserId())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
