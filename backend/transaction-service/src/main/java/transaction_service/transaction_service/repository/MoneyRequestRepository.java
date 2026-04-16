package transaction_service.transaction_service.repository;

import transaction_service.transaction_service.entity.MoneyRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MoneyRequestRepository extends JpaRepository<MoneyRequest, Long> {
    List<MoneyRequest> findByRequesterIdOrTargetId(Long requesterId, Long targetId);
    List<MoneyRequest> findByTargetIdAndStatus(Long targetId, String status);
}
