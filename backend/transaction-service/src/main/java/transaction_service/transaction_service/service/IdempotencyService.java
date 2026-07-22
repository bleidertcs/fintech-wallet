package transaction_service.transaction_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final StringRedisTemplate redisTemplate;
    private static final String IDEMPOTENCY_PREFIX = "transaction:idempotency:";

    public boolean isDuplicateKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return false;
        }
        return Boolean.TRUE.equals(redisTemplate.hasKey(IDEMPOTENCY_PREFIX + idempotencyKey));
    }

    public void registerKey(String idempotencyKey, long ttlHours) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            redisTemplate.opsForValue().set(IDEMPOTENCY_PREFIX + idempotencyKey, "PROCESSED", ttlHours, TimeUnit.HOURS);
        }
    }

    public void removeKey(String idempotencyKey) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            redisTemplate.delete(IDEMPOTENCY_PREFIX + idempotencyKey);
        }
    }
}
