import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationServicePort } from '../../domain/ports/inbound/notification-service.port';
import {
  NOTIFICATION_REPOSITORY_PORT,
  NotificationRepositoryPort,
} from '../../domain/ports/outbound/notification-repository.port';
import {
  EMAIL_ADAPTER_PORT,
  EmailAdapterPort,
} from '../../domain/ports/outbound/email-adapter.port';
import {
  USER_SERVICE_CLIENT_PORT,
  UserServiceClientPort,
  UserProfileResponse,
} from '../../domain/ports/outbound/user-service-client.port';
import { NotificationEntity } from '../../domain/entities/notification.entity';
import { TransferCompletedEvent } from '../../domain/events/transfer-completed.event';

@Injectable()
export class NotificationUseCases implements NotificationServicePort {
  private readonly logger = new Logger(NotificationUseCases.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY_PORT)
    private readonly repository: NotificationRepositoryPort,
    @Inject(EMAIL_ADAPTER_PORT)
    private readonly emailAdapter: EmailAdapterPort,
    @Inject(USER_SERVICE_CLIENT_PORT)
    private readonly userServiceClient: UserServiceClientPort,
  ) {}

  async processTransferNotification(event: TransferCompletedEvent): Promise<void> {
    this.logger.log(`Procesando notificación para transferencia: ${JSON.stringify(event)}`);

    const fromUserId = Number(event.fromUser);
    const toUserId = Number(event.toUser);
    const amount = Number(event.amount);

    let senderProfile: UserProfileResponse | null = null;
    let receiverProfile: UserProfileResponse | null = null;

    try {
      senderProfile = await this.userServiceClient.getUserProfile(fromUserId);
    } catch (err) {
      this.logger.warn(`No se pudo obtener perfil del remitente ID ${fromUserId}: ${err.message}`);
    }

    try {
      receiverProfile = await this.userServiceClient.getUserProfile(toUserId);
    } catch (err) {
      this.logger.warn(`No se pudo obtener perfil del destinatario ID ${toUserId}: ${err.message}`);
    }

    const senderName = senderProfile?.name || `Usuario #${fromUserId}`;
    const receiverName = receiverProfile?.name || `Usuario #${toUserId}`;
    const receiverEmail = receiverProfile?.email || null;
    const senderEmail = senderProfile?.email || null;

    // 1. Notificación para el remitente
    const senderMsg = `Transferencia enviada: Enviaste $${amount.toFixed(2)} a ${receiverName}`;
    await this.repository.save({
      userId: fromUserId,
      type: 'TRANSFER_SENT',
      message: senderMsg,
      amount,
      fromUserId,
      read: false,
      createdAt: new Date(),
    });

    // 2. Notificación para el destinatario
    const receiverMsg = `Transferencia recibida: Recibiste $${amount.toFixed(2)} de ${senderName}`;
    await this.repository.save({
      userId: toUserId,
      type: 'TRANSFER_RECEIVED',
      message: receiverMsg,
      amount,
      fromUserId,
      read: false,
      createdAt: new Date(),
    });

    // 3. Enviar correo electrónico al destinatario (Best effort)
    if (receiverEmail) {
      const subject = 'Recibiste una transferencia';
      const body = `Hola ${receiverName},\n\nRecibiste una transferencia de $${amount.toFixed(2)} de parte de ${senderName} (${senderEmail || 'N/A'}).\n\n¡Gracias por usar FinTech Wallet!`;
      await this.emailAdapter.sendEmail(receiverEmail, subject, body);
    }
  }

  async getUserNotifications(userId: number): Promise<NotificationEntity[]> {
    return this.repository.findByUserId(userId);
  }

  async markAsRead(id: number): Promise<NotificationEntity> {
    return this.repository.markAsRead(id);
  }

  async getUnreadCount(userId: number): Promise<{ unreadCount: number }> {
    const unreadCount = await this.repository.getUnreadCount(userId);
    return { unreadCount };
  }
}
