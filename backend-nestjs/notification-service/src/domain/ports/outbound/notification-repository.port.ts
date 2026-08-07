import { NotificationEntity } from '../../entities/notification.entity';

export const NOTIFICATION_REPOSITORY_PORT = Symbol('NOTIFICATION_REPOSITORY_PORT');

export interface NotificationRepositoryPort {
  save(notification: Partial<NotificationEntity>): Promise<NotificationEntity>;
  findByUserId(userId: number): Promise<NotificationEntity[]>;
  findById(id: number): Promise<NotificationEntity | null>;
  markAsRead(id: number): Promise<NotificationEntity>;
  getUnreadCount(userId: number): Promise<number>;
}
