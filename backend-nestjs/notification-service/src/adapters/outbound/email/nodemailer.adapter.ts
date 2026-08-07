import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailAdapterPort } from '../../../domain/ports/outbound/email-adapter.port';

@Injectable()
export class NodemailerAdapter implements EmailAdapterPort {
  private readonly logger = new Logger(NodemailerAdapter.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.MAIL_HOST || 'mailpit';
    const port = Number(process.env.MAIL_PORT) || 1025;
    const user = process.env.GMAIL_USER || undefined;
    const pass = process.env.GMAIL_APP_PASSWORD || undefined;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // Mailpit uses plain SMTP
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    const from = process.env.MAIL_FROM || 'noreply@fintechwallet.com';
    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text: body,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">FinTech Wallet</h2>
          <p style="font-size: 16px;">${body.replace(/\n/g, '<br/>')}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
          <p style="font-size: 12px; color: #666;">Este es un correo automático enviado por FinTech Wallet System.</p>
        </div>`,
      });
      this.logger.log(`Correo enviado exitosamente a ${to} (MessageId: ${info.messageId})`);
      return true;
    } catch (error) {
      this.logger.warn(`Fallo al enviar correo a ${to}: ${error.message}`);
      return false;
    }
  }
}
