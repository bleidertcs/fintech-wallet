import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  Req,
  Res,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  AUTH_SERVICE_PORT,
  AuthServicePort,
} from '../../../domain/ports/inbound/auth.service.port';
import {
  RegisterRequestDto,
  LoginRequestDto,
  TotpVerifyRequestDto,
  ChangePasswordRequestDto,
  AuthResponseDto,
  TotpSetupResponseDto,
} from './dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE_PORT)
    private readonly authService: AuthServicePort,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Healthcheck para Ingress' })
  getHealth() {
    return { status: 'OK', service: 'auth-service', timestamp: new Date().toISOString() };
  }

  @Post('register')
  @ApiOperation({ summary: 'Registro de usuario' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async register(@Body() request: RegisterRequestDto): Promise<AuthResponseDto> {
    const user = await this.authService.register(request.email, request.password, request.name);
    return {
      token: null,
      email: user.email,
      role: user.role,
      verified: user.verified,
      totpEnabled: user.totpEnabled,
      totpRequired: false,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicio de sesión' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(@Body() request: LoginRequestDto): Promise<AuthResponseDto> {
    const result = await this.authService.login(request.email, request.password);
    return {
      token: result.token || null,
      email: result.user.email,
      role: result.user.role,
      verified: result.user.verified,
      totpEnabled: result.user.totpEnabled,
      totpRequired: !!result.requiresTotp,
    };
  }

  @Post('verify-totp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificación 2FA TOTP para login' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async verifyTotp(@Body() request: TotpVerifyRequestDto): Promise<AuthResponseDto> {
    const user = await this.authService.getUserByEmail(request.email);
    await this.authService.verifyTotp(user.id!, request.code);

    const token = (this.authService as any).tokenService
      ? (this.authService as any).tokenService.generateToken({
          userId: user.id!,
          email: user.email,
          role: user.role,
        })
      : null;

    return {
      token,
      email: user.email,
      role: user.role,
      verified: user.verified,
      totpEnabled: true,
      totpRequired: false,
    };
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verificación de cuenta por email con redirección' })
  async verifyEmail(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.APP_FRONTEND_URL || 'http://localhost';
    try {
      await this.authService.verifyEmail(token);
      const acceptsJson = req.headers['accept']?.includes('application/json');
      if (acceptsJson) {
        return res.status(HttpStatus.OK).json({ message: 'Email verified successfully', verified: true });
      }
      return res.redirect(`${frontendUrl}/verify?token=${token}&status=success`);
    } catch (error: any) {
      const acceptsJson = req.headers['accept']?.includes('application/json');
      if (acceptsJson) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: error?.message || 'Verification failed', verified: false });
      }
      return res.redirect(`${frontendUrl}/verify?token=${token}&status=error`);
    }
  }

  @Post('setup-totp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicialización de 2FA TOTP' })
  @ApiResponse({ status: 200, type: TotpSetupResponseDto })
  async setupTotp(@Body() body: { email: string }): Promise<TotpSetupResponseDto> {
    const user = await this.authService.getUserByEmail(body.email);
    const result = await this.authService.setupTotp(user.id!);
    return {
      secret: result.secret,
      otpAuthUri: `otpauth://totp/FinTechWallet:${user.email}?secret=${result.secret}&issuer=FinTechWallet&digits=6&period=30`,
      qrCodeUrl: result.qrCodeUrl,
    };
  }

  @Post('enable-totp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Habilitar 2FA TOTP' })
  async enableTotp(@Body() request: TotpVerifyRequestDto) {
    const user = await this.authService.getUserByEmail(request.email);
    await this.authService.enableTotp(user.id!, request.code);
    return { message: '2FA enabled' };
  }

  @Post('disable-totp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deshabilitar 2FA TOTP' })
  async disableTotp(@Body() body: { email: string }) {
    const user = await this.authService.getUserByEmail(body.email);
    await this.authService.disableTotp(user.id!);
    return { message: '2FA disabled' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtener información del usuario autenticado' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async getMe(@Query('email') email: string): Promise<AuthResponseDto> {
    const user = await this.authService.getUserByEmail(email);
    return {
      token: null,
      email: user.email,
      role: user.role,
      verified: user.verified,
      totpEnabled: user.totpEnabled,
      totpRequired: false,
    };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar email de verificación' })
  async resendVerification(@Body() body: { email: string }) {
    await this.authService.resendVerification(body.email);
    return { message: 'Verification email sent' };
  }

  @Put('change-password')
  @ApiOperation({ summary: 'Cambiar contraseña' })
  async changePassword(@Body() request: ChangePasswordRequestDto) {
    await this.authService.changePassword(request.email, request.oldPassword, request.newPassword);
    return { message: 'Password changed successfully' };
  }

  @Put('promote-admin')
  @ApiOperation({ summary: 'Promover usuario a Administrador' })
  async promoteAdmin(@Body() body: { email: string }) {
    await this.authService.promoteToAdmin(body.email);
    return { message: 'User promoted to admin' };
  }
}
