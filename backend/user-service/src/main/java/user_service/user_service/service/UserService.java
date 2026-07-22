package user_service.user_service.service;

import user_service.user_service.dto.UserProfileDto;
import user_service.user_service.entity.UserProfile;
import user_service.user_service.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import io.opentelemetry.instrumentation.annotations.WithSpan;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserProfileRepository repository;

    @WithSpan("user.createUser")
    public UserProfileDto createUser(UserProfileDto dto) {
        BigDecimal initialBalance = (dto.getBalance() != null && dto.getBalance().compareTo(BigDecimal.ZERO) > 0)
                ? dto.getBalance()
                : new BigDecimal("10000.00");

        UserProfile user = UserProfile.builder()
                .name(dto.getName())
                .email(dto.getEmail())
                .balance(initialBalance)
                .dailyLimit(dto.getDailyLimit() != null ? dto.getDailyLimit() : new BigDecimal("50000"))
                .currency(dto.getCurrency() != null ? dto.getCurrency() : "ARS")
                .build();
        user = repository.save(user);
        return toDto(user);
    }

    @Cacheable(value = "userProfiles", key = "#id")
    @WithSpan("user.getUserById")
    public UserProfileDto getUserById(Long id) {
        UserProfile user = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        return toDto(user);
    }

    public List<UserProfileDto> getAllUsers() {
        return repository.findAll().stream().map(this::toDto).toList();
    }

    @CacheEvict(value = "userProfiles", key = "#id")
    @Transactional
    @WithSpan("user.updateBalance")
    public UserProfileDto updateBalance(Long id, BigDecimal amount) {
        UserProfile user = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        user.setBalance(user.getBalance().add(amount));
        user = repository.save(user);
        return toDto(user);
    }


    @CacheEvict(value = "userProfiles", key = "#id")
    @Transactional
    @WithSpan("user.updateSettings")
    public UserProfileDto updateSettings(Long id, BigDecimal dailyLimit, String currency) {

        UserProfile user = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        if (dailyLimit != null) user.setDailyLimit(dailyLimit);
        if (currency != null) user.setCurrency(currency);
        repository.save(user);
        return toDto(user);
    }

    private UserProfileDto toDto(UserProfile user) {
        BigDecimal limit = user.getDailyLimit();
        if (limit == null || limit.compareTo(BigDecimal.ZERO) == 0) {
            limit = new BigDecimal("50000");
        }
        String curr = user.getCurrency();
        if (curr == null || curr.isEmpty()) {
            curr = "ARS";
        }
        return UserProfileDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .balance(user.getBalance())
                .dailyLimit(limit)
                .currency(curr)
                .build();
    }
}
