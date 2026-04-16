package auth_service.auth_service.security;

import org.apache.commons.codec.binary.Base32;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;

public class TotpUtil {

    private static final int CODE_DIGITS = 6;
    private static final int TIME_STEP = 30;

    public static String generateSecret() {
        byte[] bytes = new byte[20];
        new SecureRandom().nextBytes(bytes);
        return new Base32().encodeToString(bytes).replace("=", "");
    }

    public static String generateCode(String secret) {
        long timeIndex = System.currentTimeMillis() / 1000 / TIME_STEP;
        return generateCode(secret, timeIndex);
    }

    public static boolean verifyCode(String secret, String code) {
        long timeIndex = System.currentTimeMillis() / 1000 / TIME_STEP;
        // Check current and adjacent time windows
        for (int i = -1; i <= 1; i++) {
            if (generateCode(secret, timeIndex + i).equals(code)) {
                return true;
            }
        }
        return false;
    }

    private static String generateCode(String secret, long timeIndex) {
        try {
            byte[] key = new Base32().decode(secret.toUpperCase());
            byte[] data = new byte[8];
            for (int i = 7; i >= 0; i--) {
                data[i] = (byte) (timeIndex & 0xff);
                timeIndex >>= 8;
            }

            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7f) << 24)
                    | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8)
                    | (hash[offset + 3] & 0xff);

            int otp = binary % (int) Math.pow(10, CODE_DIGITS);
            return String.format("%0" + CODE_DIGITS + "d", otp);
        } catch (Exception e) {
            throw new RuntimeException("Error generating TOTP", e);
        }
    }

    public static String buildOtpAuthUri(String secret, String email) {
        return String.format("otpauth://totp/FinTechWallet:%s?secret=%s&issuer=FinTechWallet&digits=%d&period=%d",
                email, secret, CODE_DIGITS, TIME_STEP);
    }
}
