package auth_service.auth_service.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TotpSetupResponse {
    private String secret;
    private String otpAuthUri;
}
