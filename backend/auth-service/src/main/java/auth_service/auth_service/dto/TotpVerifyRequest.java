package auth_service.auth_service.dto;

import lombok.Data;

@Data
public class TotpVerifyRequest {
    private String email;
    private String code;
}
