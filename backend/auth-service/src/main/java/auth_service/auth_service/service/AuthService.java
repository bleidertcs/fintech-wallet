package auth_service.auth_service.service;

import auth_service.auth_service.dto.*;
import auth_service.auth_service.entity.User;
import auth_service.auth_service.repository.UserRepository;
import auth_service.auth_service.security.JwtUtil;
import auth_service.auth_service.security.TotpUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import io.opentelemetry.instrumentation.annotations.SpanAttribute;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@fintechwallet.com}")
    private String mailFrom;

    @WithSpan("auth.register")
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        String verificationToken = UUID.randomUUID().toString();

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("USER")
                .verified(false)
                .verificationToken(verificationToken)
                .totpEnabled(false)
                .build();

        userRepository.save(user);

        // Send verification email (best-effort)
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("FinTech Wallet - Verifica tu email");
            message.setFrom(mailFrom);
            message.setText("Hola!\n\nTu codigo de verificacion es: " + verificationToken
                    + "\n\nO usa este link: http://localhost:3000/verify?token=" + verificationToken
                    + "\n\nFinTech Wallet");
            mailSender.send(message);
            log.info("Verification email sent to {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to send verification email: {}", e.getMessage());
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());

        return AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .role(user.getRole())
                .verified(user.isVerified())
                .totpEnabled(user.isTotpEnabled())
                .totpRequired(false)
                .build();
    }

    @WithSpan("auth.login")
    public AuthResponse login(LoginRequest request) {
        String inputEmail = request.getEmail() != null ? request.getEmail().trim() : "";
        User user = userRepository.findByEmail(inputEmail)
                .orElseGet(() -> userRepository.findByEmail(inputEmail.toLowerCase())
                .orElseThrow(() -> {
                    log.warn("Login failed: user not found for email '{}'", request.getEmail());
                    return new RuntimeException("Invalid credentials");
                }));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Login failed: password mismatch for user '{}'", user.getEmail());
            throw new RuntimeException("Invalid credentials");
        }


        // If 2FA is enabled, return totpRequired=true without a real token
        if (user.isTotpEnabled()) {
            return AuthResponse.builder()
                    .token(null)
                    .email(user.getEmail())
                    .role(user.getRole())
                    .verified(user.isVerified())
                    .totpEnabled(true)
                    .totpRequired(true)
                    .build();
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());

        return AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .role(user.getRole())
                .verified(user.isVerified())
                .totpEnabled(false)
                .totpRequired(false)
                .build();
    }

    @WithSpan("auth.verifyTotp")
    public AuthResponse verifyTotp(TotpVerifyRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.isTotpEnabled() || user.getTotpSecret() == null) {
            throw new RuntimeException("2FA is not enabled for this user");
        }

        if (!TotpUtil.verifyCode(user.getTotpSecret(), request.getCode())) {
            throw new RuntimeException("Codigo 2FA invalido");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());

        return AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .role(user.getRole())
                .verified(user.isVerified())
                .totpEnabled(true)
                .totpRequired(false)
                .build();
    }

    @WithSpan("auth.verifyEmail")
    public void verifyEmail(String verificationToken) {
        User user = userRepository.findAll().stream()
                .filter(u -> verificationToken.equals(u.getVerificationToken()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Token de verificacion invalido"));

        user.setVerified(true);
        user.setVerificationToken(null);
        userRepository.save(user);
    }

    @WithSpan("auth.setupTotp")
    public TotpSetupResponse setupTotp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String secret = TotpUtil.generateSecret();
        user.setTotpSecret(secret);
        userRepository.save(user);

        String otpAuthUri = TotpUtil.buildOtpAuthUri(secret, email);

        return TotpSetupResponse.builder()
                .secret(secret)
                .otpAuthUri(otpAuthUri)
                .build();
    }

    @WithSpan("auth.enableTotp")
    public void enableTotp(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getTotpSecret() == null) {
            throw new RuntimeException("Setup 2FA first");
        }

        if (!TotpUtil.verifyCode(user.getTotpSecret(), code)) {
            throw new RuntimeException("Codigo invalido. Intenta de nuevo.");
        }

        user.setTotpEnabled(true);
        userRepository.save(user);
    }

    @WithSpan("auth.disableTotp")
    public void disableTotp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setTotpEnabled(false);
        user.setTotpSecret(null);
        userRepository.save(user);
    }

    @WithSpan("auth.changePassword")
    public void changePassword(ChangePasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("Contrasena actual incorrecta");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public AuthResponse getUserStatus(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return AuthResponse.builder()
                .token(null)
                .email(user.getEmail())
                .role(user.getRole())
                .verified(user.isVerified())
                .totpEnabled(user.isTotpEnabled())
                .totpRequired(false)
                .build();
    }

    public void resendVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isVerified()) {
            throw new RuntimeException("El email ya esta verificado");
        }

        // Generate new token
        String verificationToken = UUID.randomUUID().toString();
        user.setVerificationToken(verificationToken);
        userRepository.save(user);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("FinTech Wallet - Verifica tu email");
            message.setFrom(mailFrom);
            message.setText("Hola!\n\nTu codigo de verificacion es: " + verificationToken
                    + "\n\nO usa este link: http://localhost:3000/verify?token=" + verificationToken
                    + "\n\nFinTech Wallet");
            mailSender.send(message);
            log.info("Verification email resent to {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to resend verification email: {}", e.getMessage());
            throw new RuntimeException("Error al enviar el email de verificacion");
        }
    }

    public void promoteToAdmin(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole("ADMIN");
        userRepository.save(user);
    }
}
