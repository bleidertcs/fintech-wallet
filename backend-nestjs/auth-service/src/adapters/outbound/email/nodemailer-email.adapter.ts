import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { appConfig } from '../../../infrastructure/config/app.config';
import { EmailServicePort } from '../../../domain/ports/outbound/email.service.port';

@Injectable()
export class NodemailerEmailAdapter implements EmailServicePort {
  private readonly logger = new Logger(NodemailerEmailAdapter.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.mail.host,
      port: this.config.mail.port,
      secure: false,
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    try {
      const frontendUrl = process.env.APP_FRONTEND_URL || 'http://localhost';
      const mailOptions = {
        from: 'noreply@fintechwallet.com',
        to,
        subject: 'FinTech Wallet - Verifica tu email',
        text: `Hola!\n\nTu codigo de verificacion es: ${token}\n\nO usa este link: ${frontendUrl}/verify?token=${token}\n\nFinTech Wallet`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px; max-width: 550px; margin: 0 auto; border: 1px solid #e2e8f0;">
            <h2 style="color: #059669; margin-top: 0;">FinTech Wallet</h2>
            <p style="font-size: 16px;">¡Hola!</p>
            <p style="font-size: 15px;">Gracias por registrarte en FinTech Wallet. Para activar tu cuenta y verificar tu perfil, haz clic en el siguiente botón:</p>
            <div style="margin: 28px 0; text-align: center;">
              <a href="${frontendUrl}/verify?token=${token}" style="display: inline-block; padding: 12px 28px; color: #ffffff; background-color: #059669; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Verificar Mi Cuenta</a>
            </div>
            <p style="font-size: 13px; color: #64748b;">Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
            <p style="font-size: 13px; word-break: break-all; color: #2563eb;"><a href="${frontendUrl}/verify?token=${token}">${frontendUrl}/verify?token=${token}</a></p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Código de verificación manual: <code>${token}</code></p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de verificación enviado exitosamente a ${to}`);
    } catch (error: any) {
      this.logger.warn(`No se pudo enviar el email de verificación a ${to}: ${error.message}`);
    }
  }
}
