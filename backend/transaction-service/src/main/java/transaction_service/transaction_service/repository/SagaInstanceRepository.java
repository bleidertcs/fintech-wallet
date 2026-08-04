package transaction_service.transaction_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import transaction_service.transaction_service.entity.SagaInstance;

import java.util.List;

@Repository
public interface SagaInstanceRepository extends JpaRepository<SagaInstance, String> {
    List<SagaInstance> findByStatus(String status);
}
