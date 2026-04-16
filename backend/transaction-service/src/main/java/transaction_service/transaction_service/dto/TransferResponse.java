package transaction_service.transaction_service.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferResponse {
    private Long transactionId;
    private Long fromUserId;
    private Long toUserId;
    private BigDecimal amount;
    private String status;
    private LocalDateTime createdAt;
}
