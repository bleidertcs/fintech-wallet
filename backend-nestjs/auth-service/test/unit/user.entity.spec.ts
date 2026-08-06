import { User } from '../../src/domain/entities/user.entity';
import { Email } from '../../src/domain/value-objects/email.vo';

describe('User Domain Entity & Email Value Object', () => {
  it('debe crear un Email válido y normalizar a minúsculas', () => {
    const email = new Email('  USER@EXAMPLE.COM  ');
    expect(email.getValue()).toBe('user@example.com');
  });

  it('debe lanzar error al crear un Email inválido', () => {
    expect(() => new Email('invalid-email')).toThrow('Email inválido');
  });

  it('debe crear una entidad User con valores por defecto', () => {
    const user = new User({
      email: 'test@example.com',
      password: 'hashedpassword',
    });

    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('USER');
    expect(user.verified).toBe(false);
    expect(user.totpEnabled).toBe(false);
  });

  it('debe verificar email correctamente', () => {
    const user = new User({
      email: 'test@example.com',
      password: 'hashedpassword',
      verificationToken: 'token123',
    });

    user.verifyEmail();
    expect(user.verified).toBe(true);
    expect(user.verificationToken).toBeNull();
  });

  it('debe habilitar y deshabilitar TOTP 2FA', () => {
    const user = new User({
      email: 'test@example.com',
      password: 'hashedpassword',
    });

    user.enableTotp('JBSWY3DPEHPK3PXP');
    expect(user.totpEnabled).toBe(true);
    expect(user.totpSecret).toBe('JBSWY3DPEHPK3PXP');

    user.disableTotp();
    expect(user.totpEnabled).toBe(false);
    expect(user.totpSecret).toBeNull();
  });
});
