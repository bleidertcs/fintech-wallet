import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';

export class TotpUtil {
  private static readonly ISSUER = 'FinTechWallet';
  private static readonly DIGITS = 6;
  private static readonly PERIOD = 30;

  public static generateSecret(): string {
    const secret = new OTPAuth.Secret({ size: 20 });
    return secret.base32;
  }

  public static generateCode(secret: string): string {
    const totp = new OTPAuth.TOTP({
      issuer: this.ISSUER,
      label: 'user',
      algorithm: 'SHA1',
      digits: this.DIGITS,
      period: this.PERIOD,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    return totp.generate();
  }

  public static verifyCode(secret: string, code: string): boolean {
    try {
      const totp = new OTPAuth.TOTP({
        issuer: this.ISSUER,
        label: 'user',
        algorithm: 'SHA1',
        digits: this.DIGITS,
        period: this.PERIOD,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const delta = totp.validate({ token: code, window: 1 });
      return delta !== null;
    } catch {
      return false;
    }
  }

  public static buildOtpAuthUri(secret: string, email: string): string {
    const totp = new OTPAuth.TOTP({
      issuer: this.ISSUER,
      label: email,
      algorithm: 'SHA1',
      digits: this.DIGITS,
      period: this.PERIOD,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    return totp.toString();
  }

  public static async generateQrCodeUrl(otpAuthUri: string): Promise<string> {
    return QRCode.toDataURL(otpAuthUri);
  }
}
