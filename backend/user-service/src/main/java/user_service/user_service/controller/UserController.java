package user_service.user_service.controller;

import user_service.user_service.dto.UserProfileDto;
import user_service.user_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserProfileDto> createUser(@RequestBody UserProfileDto dto) {
        return ResponseEntity.ok(userService.createUser(dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserProfileDto> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping
    public ResponseEntity<List<UserProfileDto>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PutMapping("/{id}/balance")
    public ResponseEntity<UserProfileDto> updateBalance(@PathVariable Long id, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(userService.updateBalance(id, amount));
    }


    @PutMapping("/{id}/settings")
    public ResponseEntity<UserProfileDto> updateSettings(
            @PathVariable Long id,
            @RequestParam(required = false) BigDecimal dailyLimit,
            @RequestParam(required = false) String currency) {
        return ResponseEntity.ok(userService.updateSettings(id, dailyLimit, currency));
    }
}
