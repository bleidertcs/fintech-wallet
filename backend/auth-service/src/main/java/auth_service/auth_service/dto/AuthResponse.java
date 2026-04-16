package auth_service.auth_service.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String email;
    private String role;
    private boolean verified;
    private boolean totpEnabled;
    private boolean totpRequired;
}
