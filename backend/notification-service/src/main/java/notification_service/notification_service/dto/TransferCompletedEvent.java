package notification_service.notification_service.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransferCompletedEvent {
    private Long fromUser;
    private Long toUser;
    private BigDecimal amount;
}
