package user_service.user_service.dto;

import lombok.*;
import java.io.Serializable;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private String email;
    private BigDecimal balance;
    private BigDecimal dailyLimit;
    private String currency;
}

