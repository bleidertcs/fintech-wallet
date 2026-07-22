package worker_service.worker_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import worker_service.worker_service.entity.StatementJob;

import java.util.List;

public interface StatementJobRepository extends JpaRepository<StatementJob, Long> {
    List<StatementJob> findByUserIdOrderByCreatedAtDesc(Long userId);
}
