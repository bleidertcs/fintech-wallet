package transaction_service.transaction_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "money_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MoneyRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long requesterId;  // who asks for money

    @Column(nullable = false)
    private Long targetId;     // who should pay

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(length = 255)
    private String message;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, ACCEPTED, REJECTED

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
