import { NotificationEntity } from '../../entities/notification.entity';
import { TransferCompletedEvent } from '../../events/transfer-completed.event';

export const NOTIFICATION_SERVICE_PORT = Symbol('NOTIFICATION_SERVICE_PORT');

export interface NotificationServicePort {
  processTransferNotification(event: TransferCompletedEvent): Promise<void>;
  getUserNotifications(userId: number): Promise<NotificationEntity[]>;
  markAsRead(id: number): Promise<NotificationEntity>;
  getUnreadCount(userId: number): Promise<{ unreadCount: number }>;
}
