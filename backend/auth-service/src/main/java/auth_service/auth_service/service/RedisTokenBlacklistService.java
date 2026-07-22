package auth_service.auth_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import io.opentelemetry.instrumentation.annotations.WithSpan;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RedisTokenBlacklistService {

    private final StringRedisTemplate redisTemplate;

    private static final String BLACKLIST_PREFIX = "token:blacklist:";
    private static final String TOTP_ATTEMPTS_PREFIX = "totp:attempts:";
    private static final int MAX_TOTP_ATTEMPTS = 5;
    private static final long LOCK_TIME_MINUTES = 15;

    @WithSpan("redis.blacklistToken")
    public void blacklistToken(String token, long ttlInSeconds) {
        if (ttlInSeconds > 0) {
            redisTemplate.opsForValue().set(BLACKLIST_PREFIX + token, "revoked", ttlInSeconds, TimeUnit.SECONDS);
        }
    }

    @WithSpan("redis.isTokenBlacklisted")
    public boolean isTokenBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
    }

    @WithSpan("redis.isTotpLocked")
    public boolean isTotpLocked(String email) {
        String attemptsStr = redisTemplate.opsForValue().get(TOTP_ATTEMPTS_PREFIX + email);
        if (attemptsStr != null) {
            try {
                return Integer.parseInt(attemptsStr) >= MAX_TOTP_ATTEMPTS;
            } catch (NumberFormatException ignored) {}
        }
        return false;
    }

    @WithSpan("redis.recordFailedTotpAttempt")
    public void recordFailedTotpAttempt(String email) {
        String key = TOTP_ATTEMPTS_PREFIX + email;
        Long attempts = redisTemplate.opsForValue().increment(key);
        if (attempts != null && attempts == 1) {
            redisTemplate.expire(key, LOCK_TIME_MINUTES, TimeUnit.MINUTES);
        }
    }

    @WithSpan("redis.resetTotpAttempts")
    public void resetTotpAttempts(String email) {
        redisTemplate.delete(TOTP_ATTEMPTS_PREFIX + email);
    }
}

