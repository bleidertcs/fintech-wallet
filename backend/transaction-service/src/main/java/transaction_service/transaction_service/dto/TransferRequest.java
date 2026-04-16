package transaction_service.transaction_service.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransferRequest {
    private Long fromUserId;
    private Long toUserId;
    private BigDecimal amount;
}
