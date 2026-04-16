package user_service.user_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "user_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private BigDecimal balance;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal dailyLimit = new BigDecimal("50000");

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "ARS";
}
