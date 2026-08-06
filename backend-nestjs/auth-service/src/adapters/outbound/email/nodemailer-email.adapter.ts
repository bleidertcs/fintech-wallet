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
      const frontendUrl = process.env.APP_FRONTEND_URL || 'http://localhost:3000';
      const mailOptions = {
        from: 'noreply@fintechwallet.com',
        to,
        subject: 'FinTech Wallet - Verifica tu email',
        text: `Hola!\n\nTu codigo de verificacion es: ${token}\n\nO usa este link: ${frontendUrl}/verify?token=${token}\n\nFinTech Wallet`,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de verificación enviado exitosamente a ${to}`);
    } catch (error: any) {
      this.logger.warn(`No se pudo enviar el email de verificación a ${to}: ${error.message}`);
    }
  }
}
