package auth_service.auth_service.controller;

import auth_service.auth_service.dto.*;
import auth_service.auth_service.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/verify-totp")
    public ResponseEntity<AuthResponse> verifyTotp(@RequestBody TotpVerifyRequest request) {
        return ResponseEntity.ok(authService.verifyTotp(request));
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
    }

    @PostMapping("/setup-totp")
    public ResponseEntity<TotpSetupResponse> setupTotp(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.setupTotp(body.get("email")));
    }

    @PostMapping("/enable-totp")
    public ResponseEntity<?> enableTotp(@RequestBody TotpVerifyRequest request) {
        authService.enableTotp(request.getEmail(), request.getCode());
        return ResponseEntity.ok(Map.of("message", "2FA enabled"));
    }

    @PostMapping("/disable-totp")
    public ResponseEntity<?> disableTotp(@RequestBody Map<String, String> body) {
        authService.disableTotp(body.get("email"));
        return ResponseEntity.ok(Map.of("message", "2FA disabled"));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getMe(@RequestParam String email) {
        return ResponseEntity.ok(authService.getUserStatus(email));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> body) {
        authService.resendVerification(body.get("email"));
        return ResponseEntity.ok(Map.of("message", "Verification email sent"));
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    @PutMapping("/promote-admin")
    public ResponseEntity<?> promoteAdmin(@RequestBody Map<String, String> body) {
        authService.promoteToAdmin(body.get("email"));
        return ResponseEntity.ok(Map.of("message", "User promoted to admin"));
    }
}
