import { TotpUtil } from '../../src/infrastructure/security/totp.util';

describe('TotpUtil', () => {
  it('debe generar una clave secreta TOTP en formato Base32', () => {
    const secret = TotpUtil.generateSecret();
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it('debe generar y verificar un código TOTP válido para la ventana actual', () => {
    const secret = TotpUtil.generateSecret();
    const code = TotpUtil.generateCode(secret);
    const isValid = TotpUtil.verifyCode(secret, code);
    expect(isValid).toBe(true);
  });

  it('debe rechazar un código TOTP inválido', () => {
    const secret = TotpUtil.generateSecret();
    const isValid = TotpUtil.verifyCode(secret, '000000');
    expect(isValid).toBe(false);
  });
});
