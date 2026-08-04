package transaction_service.transaction_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "saga_instances")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SagaInstance {

    @Id
    private String id;

    @Column(nullable = false)
    private String sagaType;

    @Column(nullable = false)
    private String currentStep;

    @Column(nullable = false)
    private String status; // STARTED, DEBIT_COMPLETED, CREDIT_COMPLETED, COMPLETED, COMPENSATING, COMPENSATED, FAILED

    @Column(columnDefinition = "JSON", nullable = false)
    private String payload;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
