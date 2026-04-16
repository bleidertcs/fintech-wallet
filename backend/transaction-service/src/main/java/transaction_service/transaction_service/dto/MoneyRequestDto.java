package transaction_service.transaction_service.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoneyRequestDto {
    private Long id;
    private Long requesterId;
    private Long targetId;
    private BigDecimal amount;
    private String message;
    private String status;
    private LocalDateTime createdAt;
}
