package worker_service.worker_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import worker_service.worker_service.entity.AuditLog;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByFromUserIdOrToUserIdOrderByTimestampDesc(Long fromUserId, Long toUserId);
}
