package auth_service.auth_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false)
    @Builder.Default
    private boolean verified = false;

    @Column
    private String verificationToken;

    @Column
    private String totpSecret;

    @Column(nullable = false)
    @Builder.Default
    private boolean totpEnabled = false;
}
