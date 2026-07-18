package notification_service.notification_service.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDto {
    private Long id;
    private Long userId;
    private String type;
    private String message;
    private BigDecimal amount;
    private Long fromUserId;
    private boolean read;
    private LocalDateTime createdAt;
}
