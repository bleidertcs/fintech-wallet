package worker_service.worker_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import worker_service.worker_service.entity.AuditLog;
import worker_service.worker_service.repository.AuditLogRepository;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditLog recordTransactionAudit(Long fromUserId, Long toUserId, BigDecimal amount, String eventType, String details) {
        AuditLog auditLog = AuditLog.builder()
                .fromUserId(fromUserId)
                .toUserId(toUserId)
                .amount(amount)
                .eventType(eventType)
                .details(details)
                .build();
        auditLog = auditLogRepository.save(auditLog);
        log.info("Recorded transaction audit log ID: {}", auditLog.getId());
        return auditLog;
    }

    public List<AuditLog> getAuditLogsForUser(Long userId) {
        return auditLogRepository.findByFromUserIdOrToUserIdOrderByTimestampDesc(userId, userId);
    }
}
