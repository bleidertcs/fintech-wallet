package transaction_service.transaction_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import transaction_service.transaction_service.entity.OutboxEvent;

import java.util.List;

@Repository
public interface OutboxRepository extends JpaRepository<OutboxEvent, String> {
    List<OutboxEvent> findByProcessedFalseOrderByCreatedAtAsc();
}
