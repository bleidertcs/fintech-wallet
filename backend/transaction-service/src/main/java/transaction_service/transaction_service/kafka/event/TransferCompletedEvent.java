package transaction_service.transaction_service.kafka.event;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferCompletedEvent {
    private Long fromUser;
    private Long toUser;
    private BigDecimal amount;
}
