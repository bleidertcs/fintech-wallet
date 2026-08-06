import { Injectable, Inject, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from '../../domain/entities/user.entity';
import {
  AuthServicePort,
  AuthResult,
  TotpSetupResult,
} from '../../domain/ports/inbound/auth.service.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/outbound/user.repository.port';
import {
  TOKEN_SERVICE_PORT,
  TokenServicePort,
} from '../../domain/ports/outbound/token.service.port';
import {
  EMAIL_SERVICE_PORT,
  EmailServicePort,
} from '../../domain/ports/outbound/email.service.port';
import {
  USER_PROFILE_CLIENT_PORT,
  UserProfileClientPort,
} from '../../domain/ports/outbound/user-profile.client.port';
import { TotpUtil } from '../../infrastructure/security/totp.util';

@Injectable()
export class AuthUseCases implements AuthServicePort {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(TOKEN_SERVICE_PORT)
    public readonly tokenService: TokenServicePort,
    @Inject(EMAIL_SERVICE_PORT)
    private readonly emailService: EmailServicePort,
    @Inject(USER_PROFILE_CLIENT_PORT)
    private readonly userProfileClient: UserProfileClientPort,
  ) {}

  async register(email: string, password: string, name?: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = randomUUID();

    const user = new User({
      email: normalizedEmail,
      password: hashedPassword,
      role: 'USER',
      verified: false,
      verificationToken,
      totpEnabled: false,
    });

    const savedUser = await this.userRepository.save(user);

    // Enviar email de verificación (best-effort)
    await this.emailService.sendVerificationEmail(savedUser.email, verificationToken);

    // Crear perfil en user-service (best-effort)
    if (savedUser.id) {
      await this.userProfileClient.createUserProfile(savedUser.id, name || '', savedUser.email);
    }

    return savedUser;
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = email ? email.toLowerCase().trim() : '';
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new BadRequestException('Invalid credentials');
    }

    if (user.totpEnabled) {
      return {
        user,
        requiresTotp: true,
      };
    }

    const token = this.tokenService.generateToken({
      userId: user.id!,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user,
      requiresTotp: false,
    };
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.userRepository.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Token de verificacion invalido');
    }

    user.verifyEmail();
    await this.userRepository.update(user);
    return true;
  }

  async getMe(userId: bigint): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async setupTotp(userId: bigint): Promise<TotpSetupResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = TotpUtil.generateSecret();
    user.enableTotp(secret);
    await this.userRepository.update(user);

    const otpAuthUri = TotpUtil.buildOtpAuthUri(secret, user.email);
    const qrCodeUrl = await TotpUtil.generateQrCodeUrl(otpAuthUri);

    return {
      secret,
      qrCodeUrl,
    };
  }

  async verifyTotp(userId: bigint, code: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.totpSecret) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    const isValid = TotpUtil.verifyCode(user.totpSecret, code);
    if (!isValid) {
      throw new BadRequestException('Codigo 2FA invalido');
    }

    return true;
  }

  async enableTotp(userId: bigint, code: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.totpSecret) {
      throw new BadRequestException('Setup 2FA first');
    }

    const isValid = TotpUtil.verifyCode(user.totpSecret, code);
    if (!isValid) {
      throw new BadRequestException('Codigo invalido. Intenta de nuevo.');
    }

    user.enableTotp(user.totpSecret);
    await this.userRepository.update(user);
    return true;
  }

  async disableTotp(userId: bigint): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.disableTotp();
    await this.userRepository.update(user);
    return true;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email.toLowerCase().trim());
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (user.verified) {
      throw new BadRequestException('El email ya esta verificado');
    }
    const token = randomUUID();
    user.updateVerificationToken(token);
    await this.userRepository.update(user);
    await this.emailService.sendVerificationEmail(user.email, token);
  }

  async changePassword(email: string, oldPass: string, newPass: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    const match = await bcrypt.compare(oldPass, user.password);
    if (!match) {
      throw new BadRequestException('Contrasena actual incorrecta');
    }
    const newHash = await bcrypt.hash(newPass, 10);
    const updatedUser = new User({
      id: user.id,
      email: user.email,
      password: newHash,
      role: user.role,
      verified: user.verified,
      verificationToken: user.verificationToken,
      totpSecret: user.totpSecret,
      totpEnabled: user.totpEnabled,
    });
    await this.userRepository.update(updatedUser);
  }

  async promoteToAdmin(email: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    const updatedUser = new User({
      id: user.id,
      email: user.email,
      password: user.password,
      role: 'ADMIN',
      verified: user.verified,
      verificationToken: user.verificationToken,
      totpSecret: user.totpSecret,
      totpEnabled: user.totpEnabled,
    });
    await this.userRepository.update(updatedUser);
  }
}
