package user_service.user_service.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileDto {
    private Long id;
    private String name;
    private String email;
    private BigDecimal balance;
    private BigDecimal dailyLimit;
    private String currency;
}
